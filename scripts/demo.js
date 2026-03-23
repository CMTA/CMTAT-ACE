/**
 * Demo deployment script
 *
 * Deploys:
 *   1. PolicyEngine (proxy)
 *   2. ComplianceTokenCMTATStandalone
 *   3. PausePolicy (proxy) – added to all external functions
 *   4. RoleBasedAccessControlPolicy (proxy) – added to all external functions
 *   5. MintBurnExtractor
 *   6. SecureMintPolicy (proxy) – added to mint function
 *   7. MockV3Aggregator (Hardhat-only reserve price feed for SecureMint)
 *
 * Script example - do not use it for production
 */
const { ethers, upgrades } = require("hardhat");
const { ZeroAddress, keccak256, toUtf8Bytes, AbiCoder } = require("ethers");

/* ============ Role Constants ============ */
const MINTER_ROLE = keccak256(toUtf8Bytes("MINTER_ROLE"));
const BURNER_ROLE = keccak256(toUtf8Bytes("BURNER_ROLE"));
const BURNER_FROM_ROLE = keccak256(toUtf8Bytes("BURNER_FROM_ROLE"));
const ENFORCER_ROLE = keccak256(toUtf8Bytes("ENFORCER_ROLE"));
const ERC20ENFORCER_ROLE = keccak256(toUtf8Bytes("ERC20ENFORCER_ROLE"));
const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

/* ============ Helpers ============ */

async function deployPolicyEngine(defaultAllow, initialOwner) {
  const Factory = await ethers.getContractFactory("PolicyEngine");
  const policyEngine = await upgrades.deployProxy(
    Factory,
    [defaultAllow, initialOwner],
    { initializer: "initialize", unsafeAllow: ["constructor"], silenceWarnings: true }
  );
  await policyEngine.waitForDeployment();
  return policyEngine;
}

async function deployRBACPolicy(policyEngineAddress, ownerAddress) {
  const Factory = await ethers.getContractFactory("RoleBasedAccessControlPolicy");
  const rbacPolicy = await upgrades.deployProxy(
    Factory,
    [policyEngineAddress, ownerAddress, "0x"],
    { initializer: "initialize", unsafeAllow: ["constructor", "missing-initializer", "missing-initializer-call"], silenceWarnings: true }
  );
  await rbacPolicy.waitForDeployment();
  return rbacPolicy;
}

async function deployPausePolicy(policyEngineAddress, ownerAddress, initiallyPaused = false) {
  const abiCoder = AbiCoder.defaultAbiCoder();
  const configParams = abiCoder.encode(["bool"], [initiallyPaused]);
  const Factory = await ethers.getContractFactory("PausePolicy");
  const pausePolicy = await upgrades.deployProxy(
    Factory,
    [policyEngineAddress, ownerAddress, configParams],
    { initializer: "initialize", unsafeAllow: ["constructor", "missing-initializer", "missing-initializer-call"], silenceWarnings: true }
  );
  await pausePolicy.waitForDeployment();
  return pausePolicy;
}

async function deploySecureMintPolicy(policyEngineAddress, ownerAddress, configParams) {
  const Factory = await ethers.getContractFactory("SecureMintPolicy");
  const secureMintPolicy = await upgrades.deployProxy(
    Factory,
    [policyEngineAddress, ownerAddress, configParams],
    { initializer: "initialize", unsafeAllow: ["constructor", "missing-initializer", "missing-initializer-call"], silenceWarnings: true }
  );
  await secureMintPolicy.waitForDeployment();
  return secureMintPolicy;
}

async function deployMockAggregator(decimals, initialAnswer) {
  const Factory = await ethers.getContractFactory("MockV3Aggregator");
  const mock = await Factory.deploy(decimals, initialAnswer);
  await mock.waitForDeployment();
  return mock;
}

async function main() {
  const network = await ethers.provider.getNetwork();
  const isHardhatNetwork = network.chainId === 31337n;

  const signers = await ethers.getSigners();
  const deployer = signers[0];

  if (isHardhatNetwork) {
    console.log("Hardhat network detected, using account:", deployer.address);
  } else {
    console.log("Deploying to network:", network.name, "with account:", deployer.address);
  }

  const admin = deployer.address;
  const tokenDecimals = 8;

  /* ============================================================
   * 1. Deploy PolicyEngine (defaultAllow = true)
   * ============================================================ */
  console.log("\n--- Step 1: Deploy PolicyEngine ---");
  const policyEngine = await deployPolicyEngine(true, admin);
  const policyEngineAddress = await policyEngine.getAddress();
  console.log("PolicyEngine deployed to:", policyEngineAddress);

  /* ============================================================
   * 2. Deploy ComplianceTokenCMTATStandalone
   * ============================================================ */
  console.log("\n--- Step 2: Deploy ComplianceTokenCMTATStandalone ---");
  const forwarderIrrevocable = ZeroAddress;
  const ERC20Attributes = {
    name: "Security Token",
    symbol: "ST",
    decimalsIrrevocable: tokenDecimals,
  };
  const terms = {
    name: "Token Terms v1",
    uri: "https://cmta.ch/standards/cmta-token-cmtat",
    documentHash: keccak256(toUtf8Bytes("terms-v1")),
  };
  const extraInformationAttributes = {
    tokenId: "1234567890",
    terms: terms,
    information: "CMTAT smart contract",
  };

  const CMTATFactory = await ethers.getContractFactory("ComplianceTokenCMTATStandalone", deployer);
  const cmtat = await CMTATFactory.deploy(
    forwarderIrrevocable,
    admin,
    ERC20Attributes,
    extraInformationAttributes,
    policyEngineAddress
  );
  await cmtat.waitForDeployment();
  const cmtatAddress = await cmtat.getAddress();
  console.log("ComplianceTokenCMTATStandalone deployed to:", cmtatAddress);

  /* ============================================================
   * 3. Deploy PausePolicy
   * ============================================================ */
  console.log("\n--- Step 3: Deploy PausePolicy ---");
  const pausePolicy = await deployPausePolicy(policyEngineAddress, admin, false);
  const pausePolicyAddress = await pausePolicy.getAddress();
  console.log("PausePolicy deployed to:", pausePolicyAddress, "(initially unpaused)");

  /* ============================================================
   * 4. Deploy RoleBasedAccessControlPolicy
   * ============================================================ */
  console.log("\n--- Step 4: Deploy RoleBasedAccessControlPolicy ---");
  const rbacPolicy = await deployRBACPolicy(policyEngineAddress, admin);
  const rbacPolicyAddress = await rbacPolicy.getAddress();
  console.log("RoleBasedAccessControlPolicy deployed to:", rbacPolicyAddress);

  /* ============================================================
   * 5. Deploy MockV3Aggregator + SecureMintPolicy
   * ============================================================ */
  console.log("\n--- Step 5: Deploy SecureMintPolicy ---");

  // Deploy a mock reserve price feed (Hardhat only)
  // Initial answer = 1,000,000 * 10^8 (reserves of 1M tokens with 8 decimals)
  const reserveAmount = 1_000_000n * 10n ** BigInt(tokenDecimals);
  const mockFeed = await deployMockAggregator(tokenDecimals, reserveAmount);
  const mockFeedAddress = await mockFeed.getAddress();
  console.log("MockV3Aggregator (reserve feed) deployed to:", mockFeedAddress);

  // Encode SecureMintPolicy configuration parameters:
  //   (address reservesFeed, ReserveMarginConfigs(mode, amount), uint256 maxStalenessSeconds, TokenMetadata(tokenAddress, tokenDecimals))
  const abiCoder = AbiCoder.defaultAbiCoder();
  const secureMintConfigParams = abiCoder.encode(
    ["address", "tuple(uint8,uint256)", "uint256", "tuple(address,uint8)"],
    [
      mockFeedAddress,
      [0, 0],              // ReserveMarginMode.None, amount=0
      0,                    // maxStalenessSeconds=0 (no staleness check for demo)
      [cmtatAddress, tokenDecimals],
    ]
  );

  const secureMintPolicy = await deploySecureMintPolicy(policyEngineAddress, admin, secureMintConfigParams);
  const secureMintPolicyAddress = await secureMintPolicy.getAddress();
  console.log("SecureMintPolicy deployed to:", secureMintPolicyAddress);

  /* ============================================================
   * 6. Deploy MintBurnExtractor
   * ============================================================ */
  console.log("\n--- Step 6: Deploy MintBurnExtractor ---");
  const ExtractorFactory = await ethers.getContractFactory("MintBurnExtractor");
  const mintBurnExtractor = await ExtractorFactory.deploy();
  await mintBurnExtractor.waitForDeployment();
  const extractorAddress = await mintBurnExtractor.getAddress();
  console.log("MintBurnExtractor deployed to:", extractorAddress);

  /* ============================================================
   * 7. Collect function selectors
   * ============================================================ */
  console.log("\n--- Step 7: Configure PolicyEngine ---");

  const selectors = {
    // Mint / Burn
    mint:              cmtat.interface.getFunction("mint(address,uint256)").selector,
    burn:              cmtat.interface.getFunction("burn(address,uint256)").selector,
    burnFrom:          cmtat.interface.getFunction("burnFrom(address,uint256)").selector,
    // Transfers
    transfer:          cmtat.interface.getFunction("transfer(address,uint256)").selector,
    transferFrom:      cmtat.interface.getFunction("transferFrom(address,address,uint256)").selector,
    // Enforcement
    forcedTransfer:    cmtat.interface.getFunction("forcedTransfer(address,address,uint256)").selector,
    freezePartial:     cmtat.interface.getFunction("freezePartialTokens(address,uint256)").selector,
    unfreezePartial:   cmtat.interface.getFunction("unfreezePartialTokens(address,uint256)").selector,
    // Admin
    setName:           cmtat.interface.getFunction("setName").selector,
    setSymbol:         cmtat.interface.getFunction("setSymbol").selector,
  };

  console.log("Function selectors:");
  for (const [name, sel] of Object.entries(selectors)) {
    console.log(`  ${name}: ${sel}`);
  }

  /* ============================================================
   * 8. Register extractor for mint selector
   * ============================================================ */
  console.log("\n--- Step 8: Set extractor for mint selector ---");
  await policyEngine.connect(deployer).setExtractor(selectors.mint, extractorAddress);
  console.log("Extractor set for mint selector");

  /* ============================================================
   * 9. Add PausePolicy to all external functions
   * ============================================================ */
  console.log("\n--- Step 9: Add PausePolicy to all functions ---");
  const allSelectors = Object.entries(selectors);
  for (const [name, sel] of allSelectors) {
    await policyEngine.connect(deployer).addPolicy(cmtatAddress, sel, pausePolicyAddress, []);
    console.log(`  PausePolicy added for: ${name} (${sel})`);
  }

  /* ============================================================
   * 10. Add RBAC policy to all external functions
   * ============================================================ */
  console.log("\n--- Step 10: Add RBAC policy to all functions ---");
  for (const [name, sel] of allSelectors) {
    await policyEngine.connect(deployer).addPolicy(cmtatAddress, sel, rbacPolicyAddress, []);
    console.log(`  RBAC policy added for: ${name} (${sel})`);
  }

  /* ============================================================
   * 11. Add SecureMint policy to mint function
   * ============================================================ */
  console.log("\n--- Step 11: Add SecureMint policy to mint ---");
  // SecureMintPolicy expects 1 parameter: "amount"
  // The extractor produces parameters named keccak256("amount") and keccak256("account")
  const PARAM_AMOUNT = keccak256(toUtf8Bytes("amount"));
  await policyEngine.connect(deployer).addPolicy(
    cmtatAddress,
    selectors.mint,
    secureMintPolicyAddress,
    [PARAM_AMOUNT]
  );
  console.log("SecureMint policy added for mint selector");

  /* ============================================================
   * 12. Grant operation allowances on RBAC policy
   * ============================================================ */
  console.log("\n--- Step 12: Grant RBAC operation allowances ---");

  // Map selectors to their logical roles
  const roleMapping = [
    { selector: selectors.mint,            role: MINTER_ROLE,       name: "mint → MINTER_ROLE" },
    { selector: selectors.burn,            role: BURNER_ROLE,       name: "burn → BURNER_ROLE" },
    { selector: selectors.burnFrom,        role: BURNER_FROM_ROLE,  name: "burnFrom → BURNER_FROM_ROLE" },
    { selector: selectors.transfer,        role: DEFAULT_ADMIN_ROLE, name: "transfer → DEFAULT_ADMIN_ROLE" },
    { selector: selectors.transferFrom,    role: DEFAULT_ADMIN_ROLE, name: "transferFrom → DEFAULT_ADMIN_ROLE" },
    { selector: selectors.forcedTransfer,  role: ENFORCER_ROLE,     name: "forcedTransfer → ENFORCER_ROLE" },
    { selector: selectors.freezePartial,   role: ERC20ENFORCER_ROLE, name: "freezePartialTokens → ERC20ENFORCER_ROLE" },
    { selector: selectors.unfreezePartial, role: ERC20ENFORCER_ROLE, name: "unfreezePartialTokens → ERC20ENFORCER_ROLE" },
    { selector: selectors.setName,         role: DEFAULT_ADMIN_ROLE, name: "setName → DEFAULT_ADMIN_ROLE" },
    { selector: selectors.setSymbol,       role: DEFAULT_ADMIN_ROLE, name: "setSymbol → DEFAULT_ADMIN_ROLE" },
  ];

  for (const { selector, role, name } of roleMapping) {
    await rbacPolicy.connect(deployer).grantOperationAllowanceToRole(selector, role);
    console.log(`  ${name}`);
  }

  /* ============================================================
   * 13. Grant roles to the admin account
   * ============================================================ */
  console.log("\n--- Step 13: Grant roles to admin ---");
  const rolesToGrant = [
    { role: MINTER_ROLE,       name: "MINTER_ROLE" },
    { role: BURNER_ROLE,       name: "BURNER_ROLE" },
    { role: BURNER_FROM_ROLE,  name: "BURNER_FROM_ROLE" },
    { role: ENFORCER_ROLE,     name: "ENFORCER_ROLE" },
    { role: ERC20ENFORCER_ROLE, name: "ERC20ENFORCER_ROLE" },
  ];

  for (const { role, name } of rolesToGrant) {
    await rbacPolicy.connect(deployer).grantRole(role, admin);
    console.log(`  Granted ${name} to admin`);
  }

  /* ============================================================
   * Summary
   * ============================================================ */

  // Resolve implementation addresses for all proxy-deployed contracts
  const policyEngineImpl = await upgrades.erc1967.getImplementationAddress(policyEngineAddress);
  const pausePolicyImpl = await upgrades.erc1967.getImplementationAddress(pausePolicyAddress);
  const rbacPolicyImpl = await upgrades.erc1967.getImplementationAddress(rbacPolicyAddress);
  const secureMintPolicyImpl = await upgrades.erc1967.getImplementationAddress(secureMintPolicyAddress);

  // PolicyEngine uses Transparent Proxy, so it also has a ProxyAdmin
  const policyEngineAdmin = await upgrades.erc1967.getAdminAddress(policyEngineAddress);

  console.log("\n========================================");
  console.log("Demo deployment complete!");
  console.log("========================================");

  console.log("\n--- Proxy Contracts (interact via these addresses) ---");
  console.log("PolicyEngine (proxy):       ", policyEngineAddress);
  console.log("PausePolicy (proxy):        ", pausePolicyAddress);
  console.log("RBAC Policy (proxy):        ", rbacPolicyAddress);
  console.log("SecureMint Policy (proxy):  ", secureMintPolicyAddress);

  console.log("\n--- Implementation Contracts ---");
  console.log("PolicyEngine (impl):        ", policyEngineImpl);
  console.log("PausePolicy (impl):         ", pausePolicyImpl);
  console.log("RBAC Policy (impl):         ", rbacPolicyImpl);
  console.log("SecureMint Policy (impl):   ", secureMintPolicyImpl);

  console.log("\n--- Proxy Admin ---");
  console.log("PolicyEngine ProxyAdmin:    ", policyEngineAdmin);

  console.log("\n--- Non-Proxy Contracts ---");
  console.log("Token (Standalone):         ", cmtatAddress);
  console.log("MintBurn Extractor:         ", extractorAddress);
  console.log("Mock Reserve Feed:          ", mockFeedAddress);

  console.log("\n--- Configuration ---");
  console.log(`Reserve amount:              1,000,000 tokens (${reserveAmount} raw with ${tokenDecimals} decimals)`);
  console.log("Admin account:              ", admin);

  console.log("\n--- Policy Configuration ---");
  console.log("  - PausePolicy protects ALL listed external functions (initially unpaused)");
  console.log("  - RBAC policy protects ALL listed external functions");
  console.log("  - SecureMint policy protects mint() (reserve-backed minting)");
  console.log("  - Policy execution order per function: PausePolicy → RBAC → (SecureMint on mint)");
  console.log("  - Admin has MINTER, BURNER, BURNER_FROM, ENFORCER, ERC20ENFORCER roles");
  console.log("========================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
