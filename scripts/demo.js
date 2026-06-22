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
 *   8. ERC20TransferExtractor – set for transfer()
 *   9. ERC20TransferFromExtractor – set for transferFrom()
 *  10. MaxAmountRule + RestrictedAddressRule (mock IRule contracts)
 *  11. TransferValidationPolicy (proxy) – added to transfer() and transferFrom()
 *
 * Documents are managed in-contract via DocumentERC1643Module (DOCUMENT_ROLE);
 * there is no external document or snapshot engine in this integration.
 *
 * Script example - do not use it for production
 */
const { ethers, upgrades } = require('hardhat');
const { keccak256, toUtf8Bytes, AbiCoder } = require('ethers');

/* ============ Role Constants ============ */
const MINTER_ROLE = keccak256(toUtf8Bytes('MINTER_ROLE'));
const BURNER_ROLE = keccak256(toUtf8Bytes('BURNER_ROLE'));
const BURNER_FROM_ROLE = keccak256(toUtf8Bytes('BURNER_FROM_ROLE'));
const ENFORCER_ROLE = keccak256(toUtf8Bytes('ENFORCER_ROLE'));
const ERC20ENFORCER_ROLE = keccak256(toUtf8Bytes('ERC20ENFORCER_ROLE'));
const DOCUMENT_ROLE = keccak256(toUtf8Bytes('DOCUMENT_ROLE'));
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';

/* ============ Helpers ============ */

async function deployPolicyEngine(defaultAllow, initialOwner) {
  const Factory = await ethers.getContractFactory('PolicyEngine');
  const policyEngine = await upgrades.deployProxy(Factory, [defaultAllow, initialOwner], {
    initializer: 'initialize',
    unsafeAllow: ['constructor'],
    silenceWarnings: true,
  });
  await policyEngine.waitForDeployment();
  return policyEngine;
}

async function deployRBACPolicy(policyEngineAddress, ownerAddress) {
  const Factory = await ethers.getContractFactory('RoleBasedAccessControlPolicy');
  const rbacPolicy = await upgrades.deployProxy(
    Factory,
    [policyEngineAddress, ownerAddress, '0x'],
    {
      initializer: 'initialize',
      unsafeAllow: ['constructor', 'missing-initializer', 'missing-initializer-call'],
      silenceWarnings: true,
    },
  );
  await rbacPolicy.waitForDeployment();
  return rbacPolicy;
}

async function deployPausePolicy(policyEngineAddress, ownerAddress, initiallyPaused = false) {
  const abiCoder = AbiCoder.defaultAbiCoder();
  const configParams = abiCoder.encode(['bool'], [initiallyPaused]);
  const Factory = await ethers.getContractFactory('PausePolicy');
  const pausePolicy = await upgrades.deployProxy(
    Factory,
    [policyEngineAddress, ownerAddress, configParams],
    {
      initializer: 'initialize',
      unsafeAllow: ['constructor', 'missing-initializer', 'missing-initializer-call'],
      silenceWarnings: true,
    },
  );
  await pausePolicy.waitForDeployment();
  return pausePolicy;
}

async function deploySecureMintPolicy(policyEngineAddress, ownerAddress, configParams) {
  const Factory = await ethers.getContractFactory('SecureMintPolicy');
  const secureMintPolicy = await upgrades.deployProxy(
    Factory,
    [policyEngineAddress, ownerAddress, configParams],
    {
      initializer: 'initialize',
      unsafeAllow: ['constructor', 'missing-initializer', 'missing-initializer-call'],
      silenceWarnings: true,
    },
  );
  await secureMintPolicy.waitForDeployment();
  return secureMintPolicy;
}

async function deployMockAggregator(decimals, initialAnswer) {
  const Factory = await ethers.getContractFactory('MockV3Aggregator');
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
    console.log('Hardhat network detected, using account:', deployer.address);
  } else {
    console.log('Deploying to network:', network.name, 'with account:', deployer.address);
  }

  const admin = deployer.address;
  const tokenDecimals = 8;

  /* ============================================================
   * 1. Deploy PolicyEngine (defaultAllow = true)
   * ============================================================ */
  console.log('\n--- Step 1: Deploy PolicyEngine ---');
  const policyEngine = await deployPolicyEngine(true, admin);
  const policyEngineAddress = await policyEngine.getAddress();
  console.log('PolicyEngine deployed to:', policyEngineAddress);

  /* ============================================================
   * 2. Deploy ComplianceTokenCMTATStandalone
   * ============================================================ */
  console.log('\n--- Step 2: Deploy ComplianceTokenCMTATStandalone ---');
  const ERC20Attributes = {
    name: 'Security Token',
    symbol: 'ST',
    decimalsIrrevocable: tokenDecimals,
  };
  const terms = {
    name: 'Token Terms v1',
    uri: 'https://cmta.ch/standards/cmta-token-cmtat',
    documentHash: keccak256(toUtf8Bytes('terms-v1')),
  };
  const extraInformationAttributes = {
    tokenId: '1234567890',
    terms: terms,
    information: 'CMTAT smart contract',
  };

  const CMTATFactory = await ethers.getContractFactory('ComplianceTokenCMTATStandalone', deployer);
  const cmtat = await CMTATFactory.deploy(
    admin,
    ERC20Attributes,
    extraInformationAttributes,
    policyEngineAddress,
  );
  await cmtat.waitForDeployment();
  const cmtatAddress = await cmtat.getAddress();
  console.log('ComplianceTokenCMTATStandalone deployed to:', cmtatAddress);

  /* ============================================================
   * 4. Deploy PausePolicy
   * ============================================================ */
  console.log('\n--- Step 4: Deploy PausePolicy ---');
  const pausePolicy = await deployPausePolicy(policyEngineAddress, admin, false);
  const pausePolicyAddress = await pausePolicy.getAddress();
  console.log('PausePolicy deployed to:', pausePolicyAddress, '(initially unpaused)');

  /* ============================================================
   * 5. Deploy RoleBasedAccessControlPolicy
   * ============================================================ */
  console.log('\n--- Step 5: Deploy RoleBasedAccessControlPolicy ---');
  const rbacPolicy = await deployRBACPolicy(policyEngineAddress, admin);
  const rbacPolicyAddress = await rbacPolicy.getAddress();
  console.log('RoleBasedAccessControlPolicy deployed to:', rbacPolicyAddress);

  /* ============================================================
   * 5. Deploy MockV3Aggregator + SecureMintPolicy
   * ============================================================ */
  console.log('\n--- Step 5: Deploy SecureMintPolicy ---');

  // Deploy a mock reserve price feed (Hardhat only)
  // Initial answer = 1,000,000 * 10^8 (reserves of 1M tokens with 8 decimals)
  const reserveAmount = 1_000_000n * 10n ** BigInt(tokenDecimals);
  const mockFeed = await deployMockAggregator(tokenDecimals, reserveAmount);
  const mockFeedAddress = await mockFeed.getAddress();
  console.log('MockV3Aggregator (reserve feed) deployed to:', mockFeedAddress);

  // Encode SecureMintPolicy configuration parameters:
  //   (address reservesFeed, ReserveMarginConfigs(mode, amount), uint256 maxStalenessSeconds, TokenMetadata(tokenAddress, tokenDecimals))
  const abiCoder = AbiCoder.defaultAbiCoder();
  const secureMintConfigParams = abiCoder.encode(
    ['address', 'tuple(uint8,uint256)', 'uint256', 'tuple(address,uint8)'],
    [
      mockFeedAddress,
      [0, 0], // ReserveMarginMode.None, amount=0
      0, // maxStalenessSeconds=0 (no staleness check for demo)
      [cmtatAddress, tokenDecimals],
    ],
  );

  const secureMintPolicy = await deploySecureMintPolicy(
    policyEngineAddress,
    admin,
    secureMintConfigParams,
  );
  const secureMintPolicyAddress = await secureMintPolicy.getAddress();
  console.log('SecureMintPolicy deployed to:', secureMintPolicyAddress);

  /* ============================================================
   * 7. Deploy MintBurnExtractor
   * ============================================================ */
  console.log('\n--- Step 7: Deploy MintBurnExtractor ---');
  const ExtractorFactory = await ethers.getContractFactory('MintBurnExtractor');
  const mintBurnExtractor = await ExtractorFactory.deploy();
  await mintBurnExtractor.waitForDeployment();
  const extractorAddress = await mintBurnExtractor.getAddress();
  console.log('MintBurnExtractor deployed to:', extractorAddress);

  /* ============================================================
   * 8. Collect function selectors
   * ============================================================ */
  console.log('\n--- Step 8: Configure PolicyEngine ---');

  const selectors = {
    // Mint / Burn
    mint: cmtat.interface.getFunction('mint(address,uint256)').selector,
    burn: cmtat.interface.getFunction('burn(address,uint256)').selector,
    burnFrom: cmtat.interface.getFunction('burnFrom(address,uint256)').selector,
    // Transfers
    transfer: cmtat.interface.getFunction('transfer(address,uint256)').selector,
    transferFrom: cmtat.interface.getFunction('transferFrom(address,address,uint256)').selector,
    // Enforcement
    forcedTransfer: cmtat.interface.getFunction('forcedTransfer(address,address,uint256)').selector,
    freezePartial: cmtat.interface.getFunction('freezePartialTokens(address,uint256)').selector,
    unfreezePartial: cmtat.interface.getFunction('unfreezePartialTokens(address,uint256)').selector,
    // Admin
    setName: cmtat.interface.getFunction('setName').selector,
    setSymbol: cmtat.interface.getFunction('setSymbol').selector,
    // Documents (in-contract ERC-1643)
    setDocument: cmtat.interface.getFunction('setDocument').selector,
  };

  console.log('Function selectors:');
  for (const [name, sel] of Object.entries(selectors)) {
    console.log(`  ${name}: ${sel}`);
  }

  /* ============================================================
   * 9. Register extractor for mint selector
   * ============================================================ */
  console.log('\n--- Step 9: Set extractor for mint selector ---');
  await policyEngine.connect(deployer).setExtractor(selectors.mint, extractorAddress);
  console.log('Extractor set for mint selector');

  /* ============================================================
   * 10. Add PausePolicy to all external functions
   * ============================================================ */
  console.log('\n--- Step 10: Add PausePolicy to all functions ---');
  const allSelectors = Object.entries(selectors);
  for (const [name, sel] of allSelectors) {
    await policyEngine.connect(deployer).addPolicy(cmtatAddress, sel, pausePolicyAddress, []);
    console.log(`  PausePolicy added for: ${name} (${sel})`);
  }

  /* ============================================================
   * 11. Add RBAC policy to all external functions
   * ============================================================ */
  console.log('\n--- Step 11: Add RBAC policy to all functions ---');
  for (const [name, sel] of allSelectors) {
    await policyEngine.connect(deployer).addPolicy(cmtatAddress, sel, rbacPolicyAddress, []);
    console.log(`  RBAC policy added for: ${name} (${sel})`);
  }

  /* ============================================================
   * 12. Add SecureMint policy to mint function
   * ============================================================ */
  console.log('\n--- Step 12: Add SecureMint policy to mint ---');
  // SecureMintPolicy expects 1 parameter: "amount"
  // The extractor produces parameters named keccak256("amount") and keccak256("account")
  const PARAM_AMOUNT = keccak256(toUtf8Bytes('amount'));
  await policyEngine
    .connect(deployer)
    .addPolicy(cmtatAddress, selectors.mint, secureMintPolicyAddress, [PARAM_AMOUNT]);
  console.log('SecureMint policy added for mint selector');

  /* ============================================================
   * 12b. Deploy ERC20TransferExtractor + ERC20TransferFromExtractor
   * ============================================================ */
  console.log('\n--- Step 12b: Deploy Transfer Extractors ---');

  const ERC20ExtractorFactory = await ethers.getContractFactory('ERC20TransferExtractor');
  const erc20TransferExtractor = await ERC20ExtractorFactory.deploy();
  await erc20TransferExtractor.waitForDeployment();
  const erc20TransferExtractorAddress = await erc20TransferExtractor.getAddress();
  console.log('ERC20TransferExtractor deployed to:', erc20TransferExtractorAddress);

  const ERC20FromExtractorFactory = await ethers.getContractFactory('ERC20TransferFromExtractor');
  const erc20TransferFromExtractor = await ERC20FromExtractorFactory.deploy();
  await erc20TransferFromExtractor.waitForDeployment();
  const erc20TransferFromExtractorAddress = await erc20TransferFromExtractor.getAddress();
  console.log('ERC20TransferFromExtractor deployed to:', erc20TransferFromExtractorAddress);

  /* ============================================================
   * 12c. Deploy mock rules + TransferValidationPolicy
   * ============================================================ */
  console.log('\n--- Step 12c: Deploy TransferValidationPolicy with mock rules ---');

  // Deploy MaxAmountRule (max 1000 tokens)
  const MaxAmountRuleFactory = await ethers.getContractFactory('MaxAmountRule');
  const maxTransferAmount = 1000n * 10n ** BigInt(tokenDecimals);
  const maxAmountRule = await MaxAmountRuleFactory.deploy(maxTransferAmount);
  await maxAmountRule.waitForDeployment();
  const maxAmountRuleAddress = await maxAmountRule.getAddress();
  console.log('MaxAmountRule deployed to:', maxAmountRuleAddress, `(max: ${maxTransferAmount})`);

  // Deploy RestrictedAddressRule (no initially restricted addresses)
  const RestrictedAddressRuleFactory = await ethers.getContractFactory('RestrictedAddressRule');
  const restrictedAddressRule = await RestrictedAddressRuleFactory.deploy([]);
  await restrictedAddressRule.waitForDeployment();
  const restrictedAddressRuleAddress = await restrictedAddressRule.getAddress();
  console.log('RestrictedAddressRule deployed to:', restrictedAddressRuleAddress);

  // Deploy TransferValidationPolicy with both rules
  const transferPolicyConfigParams = abiCoder.encode(
    ['address[]'],
    [[maxAmountRuleAddress, restrictedAddressRuleAddress]],
  );
  const TransferPolicyFactory = await ethers.getContractFactory('TransferValidationPolicy');
  const transferPolicy = await upgrades.deployProxy(
    TransferPolicyFactory,
    [policyEngineAddress, admin, transferPolicyConfigParams],
    {
      initializer: 'initialize',
      unsafeAllow: ['constructor', 'missing-initializer', 'missing-initializer-call'],
      silenceWarnings: true,
    },
  );
  await transferPolicy.waitForDeployment();
  const transferPolicyAddress = await transferPolicy.getAddress();
  console.log('TransferValidationPolicy deployed to:', transferPolicyAddress);

  /* ============================================================
   * 12d. Set extractors and add TransferValidationPolicy
   * ============================================================ */
  console.log('\n--- Step 12d: Register extractors & TransferValidationPolicy ---');

  // Set ERC20TransferExtractor for transfer()
  await policyEngine
    .connect(deployer)
    .setExtractor(selectors.transfer, erc20TransferExtractorAddress);
  console.log('ERC20TransferExtractor set for transfer selector');

  // Set ERC20TransferFromExtractor for transferFrom()
  await policyEngine
    .connect(deployer)
    .setExtractor(selectors.transferFrom, erc20TransferFromExtractorAddress);
  console.log('ERC20TransferFromExtractor set for transferFrom selector');

  // Parameter name constants
  const PARAM_SPENDER = keccak256(toUtf8Bytes('spender'));
  const PARAM_FROM = keccak256(toUtf8Bytes('from'));
  const PARAM_TO = keccak256(toUtf8Bytes('to'));
  const PARAM_AMOUNT_TRANSFER = keccak256(toUtf8Bytes('amount'));

  // Add TransferValidationPolicy to transfer() — expects [from, to, amount]
  await policyEngine
    .connect(deployer)
    .addPolicy(cmtatAddress, selectors.transfer, transferPolicyAddress, [
      PARAM_FROM,
      PARAM_TO,
      PARAM_AMOUNT_TRANSFER,
    ]);
  console.log('TransferValidationPolicy added for transfer (3 params: from, to, amount)');

  // Add TransferValidationPolicy to transferFrom() — expects [spender, from, to, amount]
  await policyEngine
    .connect(deployer)
    .addPolicy(cmtatAddress, selectors.transferFrom, transferPolicyAddress, [
      PARAM_SPENDER,
      PARAM_FROM,
      PARAM_TO,
      PARAM_AMOUNT_TRANSFER,
    ]);
  console.log(
    'TransferValidationPolicy added for transferFrom (4 params: spender, from, to, amount)',
  );

  /* ============================================================
   * 13. Grant operation allowances on RBAC policy
   * ============================================================ */
  console.log('\n--- Step 13: Grant RBAC operation allowances ---');

  // Map selectors to their logical roles
  const roleMapping = [
    { selector: selectors.mint, role: MINTER_ROLE, name: 'mint → MINTER_ROLE' },
    { selector: selectors.burn, role: BURNER_ROLE, name: 'burn → BURNER_ROLE' },
    { selector: selectors.burnFrom, role: BURNER_FROM_ROLE, name: 'burnFrom → BURNER_FROM_ROLE' },
    {
      selector: selectors.transfer,
      role: DEFAULT_ADMIN_ROLE,
      name: 'transfer → DEFAULT_ADMIN_ROLE',
    },
    {
      selector: selectors.transferFrom,
      role: DEFAULT_ADMIN_ROLE,
      name: 'transferFrom → DEFAULT_ADMIN_ROLE',
    },
    {
      selector: selectors.forcedTransfer,
      role: ENFORCER_ROLE,
      name: 'forcedTransfer → ENFORCER_ROLE',
    },
    {
      selector: selectors.freezePartial,
      role: ERC20ENFORCER_ROLE,
      name: 'freezePartialTokens → ERC20ENFORCER_ROLE',
    },
    {
      selector: selectors.unfreezePartial,
      role: ERC20ENFORCER_ROLE,
      name: 'unfreezePartialTokens → ERC20ENFORCER_ROLE',
    },
    { selector: selectors.setName, role: DEFAULT_ADMIN_ROLE, name: 'setName → DEFAULT_ADMIN_ROLE' },
    {
      selector: selectors.setSymbol,
      role: DEFAULT_ADMIN_ROLE,
      name: 'setSymbol → DEFAULT_ADMIN_ROLE',
    },
    {
      selector: selectors.setDocument,
      role: DOCUMENT_ROLE,
      name: 'setDocument → DOCUMENT_ROLE',
    },
  ];

  for (const { selector, role, name } of roleMapping) {
    await rbacPolicy.connect(deployer).grantOperationAllowanceToRole(selector, role);
    console.log(`  ${name}`);
  }

  /* ============================================================
   * 14. Grant roles to the admin account
   * ============================================================ */
  console.log('\n--- Step 14: Grant roles to admin ---');
  const rolesToGrant = [
    { role: MINTER_ROLE, name: 'MINTER_ROLE' },
    { role: BURNER_ROLE, name: 'BURNER_ROLE' },
    { role: BURNER_FROM_ROLE, name: 'BURNER_FROM_ROLE' },
    { role: ENFORCER_ROLE, name: 'ENFORCER_ROLE' },
    { role: ERC20ENFORCER_ROLE, name: 'ERC20ENFORCER_ROLE' },
    { role: DOCUMENT_ROLE, name: 'DOCUMENT_ROLE' },
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
  const secureMintPolicyImpl =
    await upgrades.erc1967.getImplementationAddress(secureMintPolicyAddress);
  const transferPolicyImpl = await upgrades.erc1967.getImplementationAddress(transferPolicyAddress);

  // PolicyEngine uses Transparent Proxy, so it also has a ProxyAdmin
  const policyEngineAdmin = await upgrades.erc1967.getAdminAddress(policyEngineAddress);

  console.log('\n========================================');
  console.log('Demo deployment complete!');
  console.log('========================================');

  console.log('\n--- Proxy Contracts (interact via these addresses) ---');
  console.log('PolicyEngine (proxy):       ', policyEngineAddress);
  console.log('PausePolicy (proxy):        ', pausePolicyAddress);
  console.log('RBAC Policy (proxy):        ', rbacPolicyAddress);
  console.log('SecureMint Policy (proxy):  ', secureMintPolicyAddress);
  console.log('Transfer Policy (proxy):    ', transferPolicyAddress);

  console.log('\n--- Implementation Contracts ---');
  console.log('PolicyEngine (impl):        ', policyEngineImpl);
  console.log('PausePolicy (impl):         ', pausePolicyImpl);
  console.log('RBAC Policy (impl):         ', rbacPolicyImpl);
  console.log('SecureMint Policy (impl):   ', secureMintPolicyImpl);
  console.log('Transfer Policy (impl):     ', transferPolicyImpl);

  console.log('\n--- Proxy Admin ---');
  console.log('PolicyEngine ProxyAdmin:    ', policyEngineAdmin);

  console.log('\n--- Non-Proxy Contracts ---');
  console.log('Token (Standalone):         ', cmtatAddress);
  console.log('MintBurn Extractor:         ', extractorAddress);
  console.log('ERC20Transfer Extractor:    ', erc20TransferExtractorAddress);
  console.log('ERC20TransferFrom Extractor:', erc20TransferFromExtractorAddress);
  console.log('MaxAmountRule:              ', maxAmountRuleAddress);
  console.log('RestrictedAddressRule:      ', restrictedAddressRuleAddress);
  console.log('Mock Reserve Feed:          ', mockFeedAddress);

  console.log('\n--- Configuration ---');
  console.log(
    `Reserve amount:              1,000,000 tokens (${reserveAmount} raw with ${tokenDecimals} decimals)`,
  );
  console.log('Admin account:              ', admin);

  console.log('\n--- Policy Configuration ---');
  console.log('  - PausePolicy protects ALL listed external functions (initially unpaused)');
  console.log('  - RBAC policy protects ALL listed external functions');
  console.log('  - SecureMint policy protects mint() (reserve-backed minting)');
  console.log('  - TransferValidationPolicy protects transfer() and transferFrom()');
  console.log('    → MaxAmountRule: max', maxTransferAmount.toString(), 'raw units per transfer');
  console.log('    → RestrictedAddressRule: no addresses initially restricted');
  console.log(
    '  - Policy execution order per function: PausePolicy → RBAC → (SecureMint on mint) → (TransferValidation on transfer/transferFrom)',
  );
  console.log('  - Admin has MINTER, BURNER, BURNER_FROM, ENFORCER, ERC20ENFORCER, DOCUMENT roles');
  console.log(
    '  - Documents are managed in-contract via setDocument() (DocumentERC1643Module, DOCUMENT_ROLE)',
  );
  console.log('========================================');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
