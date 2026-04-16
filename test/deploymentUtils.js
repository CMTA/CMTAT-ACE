const { ethers, upgrades } = require('hardhat');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const ZERO_ADDRESS = ethers.ZeroAddress;
const DEPLOYMENT_DECIMAL = 0n;
const TERMS = [
  'doc1',
  'https://example.com/doc1',
  '0x6a12eff2f559a5e529ca2c563c53194f6463ed5c61d1ae8f8731137467ab0279',
];

// Role constants (match CMTAT convention)
const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));
const BURNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('BURNER_ROLE'));
const BURNER_FROM_ROLE = ethers.keccak256(ethers.toUtf8Bytes('BURNER_FROM_ROLE'));
const BURNER_SELF_ROLE = ethers.keccak256(ethers.toUtf8Bytes('BURNER_SELF_ROLE'));
const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('PAUSER_ROLE'));
const ENFORCER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('ENFORCER_ROLE'));
const ERC20ENFORCER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('ERC20ENFORCER_ROLE'));
const DOCUMENT_ROLE = ethers.keccak256(ethers.toUtf8Bytes('DOCUMENT_ROLE'));
const SNAPSHOOTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('SNAPSHOOTER_ROLE'));
const CROSS_CHAIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes('CROSS_CHAIN_ROLE'));
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Fixture matching CMTAT signer convention
 */
async function fixture() {
  const [
    _,
    admin,
    address1,
    address2,
    address3,
    deployerAddress,
    fakeRuleEngine,
    ruleEngine,
    attacker,
  ] = await ethers.getSigners();
  return {
    _,
    admin,
    address1,
    address2,
    address3,
    deployerAddress,
    fakeRuleEngine,
    ruleEngine,
    attacker,
  };
}

/* ======== ACE Infrastructure Deploy Helpers ======== */

async function deployPolicyEngine(defaultAllow, initialOwner) {
  const Factory = await ethers.getContractFactory('PolicyEngine');
  const policyEngine = await upgrades.deployProxy(Factory, [defaultAllow, initialOwner], {
    initializer: 'initialize',
    unsafeAllow: ['constructor'],
    silenceWarnings: true,
  });
  return policyEngine;
}

async function deployPausePolicy(policyEngineAddress, ownerAddress, initiallyPaused = false) {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
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
  return pausePolicy;
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
  return rbacPolicy;
}

/* ======== Standard Contract Deploy Helpers ======== */

async function deployCCTStandalone(
  admin,
  policyEngineAddress,
  snapshotEngine = ZERO_ADDRESS,
  documentEngine = ZERO_ADDRESS,
) {
  const cmtat = await ethers.deployContract('ComplianceTokenCMTATStandalone', [
    admin,
    ['CMTA Token', 'CMTAT', DEPLOYMENT_DECIMAL],
    ['CMTAT_ISIN', TERMS, 'CMTAT_info'],
    policyEngineAddress,
    snapshotEngine,
    documentEngine,
  ]);
  return cmtat;
}

async function deployCCTUpgradeable(
  admin,
  policyEngineAddress,
  snapshotEngine = ZERO_ADDRESS,
  documentEngine = ZERO_ADDRESS,
) {
  const Factory = await ethers.getContractFactory('ComplianceTokenCMTATUpgradeable');
  const cmtat = await upgrades.deployProxy(
    Factory,
    [
      admin,
      ['CMTA Token', 'CMTAT', DEPLOYMENT_DECIMAL],
      ['CMTAT_ISIN', TERMS, 'CMTAT_info'],
      policyEngineAddress,
      snapshotEngine,
      documentEngine,
    ],
    {
      initializer: 'initialize',
      unsafeAllow: ['missing-initializer', 'constructor'],
      silenceWarnings: true,
    },
  );
  return cmtat;
}

/* ======== Lite Contract Deploy Helpers ======== */

async function deployCCTLiteStandalone(
  admin,
  policyEngineAddress,
  snapshotEngine = ZERO_ADDRESS,
  documentEngine = ZERO_ADDRESS,
) {
  const cmtat = await ethers.deployContract('ComplianceTokenCMTATLiteStandalone', [
    admin,
    ['CMTA Token', 'CMTAT', DEPLOYMENT_DECIMAL],
    ['CMTAT_ISIN', TERMS, 'CMTAT_info'],
    policyEngineAddress,
    snapshotEngine,
    documentEngine,
  ]);
  return cmtat;
}

async function deployCCTLiteUpgradeable(
  admin,
  policyEngineAddress,
  snapshotEngine = ZERO_ADDRESS,
  documentEngine = ZERO_ADDRESS,
) {
  const Factory = await ethers.getContractFactory('ComplianceTokenCMTATLiteUpgradeable');
  const cmtat = await upgrades.deployProxy(
    Factory,
    [
      admin,
      ['CMTA Token', 'CMTAT', DEPLOYMENT_DECIMAL],
      ['CMTAT_ISIN', TERMS, 'CMTAT_info'],
      policyEngineAddress,
      snapshotEngine,
      documentEngine,
    ],
    {
      initializer: 'initialize',
      unsafeAllow: ['missing-initializer', 'constructor'],
      silenceWarnings: true,
    },
  );
  return cmtat;
}

/* ======== UUPS Contract Deploy Helpers ======== */

async function deployCCTUUPSUpgradeable(
  admin,
  policyEngineAddress,
  snapshotEngine = ZERO_ADDRESS,
  documentEngine = ZERO_ADDRESS,
) {
  const Factory = await ethers.getContractFactory('ComplianceTokenCMTATUUPSUpgradeable');
  const cmtat = await upgrades.deployProxy(
    Factory,
    [
      admin,
      ['CMTA Token', 'CMTAT', DEPLOYMENT_DECIMAL],
      ['CMTAT_ISIN', TERMS, 'CMTAT_info'],
      policyEngineAddress,
      snapshotEngine,
      documentEngine,
    ],
    {
      initializer: 'initialize',
      unsafeAllow: ['missing-initializer', 'constructor'],
      silenceWarnings: true,
      kind: 'uups',
    },
  );
  return cmtat;
}

async function deployCCTLiteUUPSUpgradeable(
  admin,
  policyEngineAddress,
  snapshotEngine = ZERO_ADDRESS,
  documentEngine = ZERO_ADDRESS,
) {
  const Factory = await ethers.getContractFactory('ComplianceTokenCMTATLiteUUPSUpgradeable');
  const cmtat = await upgrades.deployProxy(
    Factory,
    [
      admin,
      ['CMTA Token', 'CMTAT', DEPLOYMENT_DECIMAL],
      ['CMTAT_ISIN', TERMS, 'CMTAT_info'],
      policyEngineAddress,
      snapshotEngine,
      documentEngine,
    ],
    {
      initializer: 'initialize',
      unsafeAllow: ['missing-initializer', 'constructor'],
      silenceWarnings: true,
      kind: 'uups',
    },
  );
  return cmtat;
}

/* ======== Fixture Factories ======== */

/**
 * Creates a fixture for standard (PolicyEngine + RBAC) deployment tests.
 * All contract deployment, policy registration, and role grants happen once;
 * loadFixture snapshots the state and restores it for each test.
 */
function createStandardFixture(deployTokenFn) {
  return async function standardFixture() {
    const [
      _,
      admin,
      address1,
      address2,
      address3,
      deployerAddress,
      fakeRuleEngine,
      ruleEngine,
      attacker,
    ] = await ethers.getSigners();

    // Deploy ACE infrastructure
    const policyEngine = await deployPolicyEngine(true, admin.address);
    const policyEngineAddress = await policyEngine.getAddress();

    const pausePolicy = await deployPausePolicy(policyEngineAddress, admin.address, false);
    const pausePolicyAddress = await pausePolicy.getAddress();

    const rbacPolicy = await deployRBACPolicy(policyEngineAddress, admin.address);
    const rbacPolicyAddress = await rbacPolicy.getAddress();

    // Deploy compliance token
    const cmtat = await deployTokenFn(admin.address, policyEngineAddress);
    const cmtatAddress = await cmtat.getAddress();

    // Collect all selectors
    const mintSelector = cmtat.interface.getFunction('mint(address,uint256)').selector;
    const burnSelector = cmtat.interface.getFunction('burn(address,uint256)').selector;
    const selfBurnSelector = cmtat.interface.getFunction('burn(uint256)').selector;
    const burnFromSelector = cmtat.interface.getFunction('burnFrom').selector;
    const transferSelector = cmtat.interface.getFunction('transfer(address,uint256)').selector;
    const transferFromSelector = cmtat.interface.getFunction(
      'transferFrom(address,address,uint256)',
    ).selector;
    const forcedTransferSelector = cmtat.interface.getFunction(
      'forcedTransfer(address,address,uint256)',
    ).selector;
    const freezeSelector = cmtat.interface.getFunction(
      'freezePartialTokens(address,uint256)',
    ).selector;
    const unfreezeSelector = cmtat.interface.getFunction(
      'unfreezePartialTokens(address,uint256)',
    ).selector;
    const setNameSelector = cmtat.interface.getFunction('setName').selector;
    const setTokenIdSelector = cmtat.interface.getFunction('setTokenId').selector;
    const setDocumentEngineSelector = cmtat.interface.getFunction('setDocumentEngine').selector;
    const setSnapshotEngineSelector = cmtat.interface.getFunction('setSnapshotEngine').selector;
    const setCCIPAdminSelector = cmtat.interface.getFunction('setCCIPAdmin').selector;
    const crosschainMintSelector = cmtat.interface.getFunction('crosschainMint').selector;
    const crosschainBurnSelector = cmtat.interface.getFunction('crosschainBurn').selector;

    const allSelectors = [
      mintSelector,
      burnSelector,
      selfBurnSelector,
      burnFromSelector,
      forcedTransferSelector,
      freezeSelector,
      unfreezeSelector,
      setNameSelector,
      setTokenIdSelector,
      setDocumentEngineSelector,
      setSnapshotEngineSelector,
      setCCIPAdminSelector,
      crosschainMintSelector,
      crosschainBurnSelector,
    ];

    // Add PausePolicy + RBAC to all admin selectors
    for (const sel of allSelectors) {
      await policyEngine.connect(admin).addPolicy(cmtatAddress, sel, pausePolicyAddress, []);
      await policyEngine.connect(admin).addPolicy(cmtatAddress, sel, rbacPolicyAddress, []);
    }

    // Transfer selectors get PausePolicy only (no RBAC - anyone can transfer)
    await policyEngine
      .connect(admin)
      .addPolicy(cmtatAddress, transferSelector, pausePolicyAddress, []);
    await policyEngine
      .connect(admin)
      .addPolicy(cmtatAddress, transferFromSelector, pausePolicyAddress, []);

    // Grant operation allowances
    const opAllowances = [
      [mintSelector, MINTER_ROLE],
      [burnSelector, BURNER_ROLE],
      [selfBurnSelector, BURNER_SELF_ROLE],
      [burnFromSelector, BURNER_FROM_ROLE],
      [forcedTransferSelector, ENFORCER_ROLE],
      [freezeSelector, ERC20ENFORCER_ROLE],
      [unfreezeSelector, ERC20ENFORCER_ROLE],
      [setNameSelector, DEFAULT_ADMIN_ROLE],
      [setTokenIdSelector, DEFAULT_ADMIN_ROLE],
      [setDocumentEngineSelector, DOCUMENT_ROLE],
      [setSnapshotEngineSelector, SNAPSHOOTER_ROLE],
      [setCCIPAdminSelector, DEFAULT_ADMIN_ROLE],
      [crosschainMintSelector, CROSS_CHAIN_ROLE],
      [crosschainBurnSelector, CROSS_CHAIN_ROLE],
    ];
    for (const [sel, role] of opAllowances) {
      await rbacPolicy.connect(admin).grantOperationAllowanceToRole(sel, role);
    }

    // Grant roles to admin
    const adminRoles = [
      MINTER_ROLE,
      BURNER_ROLE,
      ENFORCER_ROLE,
      ERC20ENFORCER_ROLE,
      DOCUMENT_ROLE,
      SNAPSHOOTER_ROLE,
    ];
    for (const role of adminRoles) {
      await rbacPolicy.connect(admin).grantRole(role, admin.address);
    }

    return {
      _,
      admin,
      address1,
      address2,
      address3,
      deployerAddress,
      fakeRuleEngine,
      ruleEngine,
      attacker,
      policyEngine,
      policyEngineAddress,
      pausePolicy,
      pausePolicyAddress,
      rbacPolicy,
      rbacPolicyAddress,
      cmtat,
      cmtatAddress,
      mintSelector,
      burnSelector,
      selfBurnSelector,
      burnFromSelector,
      transferSelector,
      transferFromSelector,
      forcedTransferSelector,
      freezeSelector,
      unfreezeSelector,
      setNameSelector,
      setTokenIdSelector,
      setDocumentEngineSelector,
      setSnapshotEngineSelector,
      setCCIPAdminSelector,
      crosschainMintSelector,
      crosschainBurnSelector,
      erc1404: true,
    };
  };
}

/**
 * Creates a fixture for lite (AccessControl + PolicyEngine for validation) deployment tests.
 * Deploys just the PolicyEngine and token; no PausePolicy or RBAC needed.
 */
function createLiteFixture(deployTokenFn) {
  return async function liteFixture() {
    const [
      _,
      admin,
      address1,
      address2,
      address3,
      deployerAddress,
      fakeRuleEngine,
      ruleEngine,
      attacker,
    ] = await ethers.getSigners();

    const policyEngine = await deployPolicyEngine(true, admin.address);
    const cmtat = await deployTokenFn(admin.address, await policyEngine.getAddress());

    return {
      _,
      admin,
      address1,
      address2,
      address3,
      deployerAddress,
      fakeRuleEngine,
      ruleEngine,
      attacker,
      policyEngine,
      cmtat,
      erc1404: true,
    };
  };
}

module.exports = {
  ZERO_ADDRESS,
  DEPLOYMENT_DECIMAL,
  TERMS,
  MINTER_ROLE,
  BURNER_ROLE,
  BURNER_FROM_ROLE,
  BURNER_SELF_ROLE,
  PAUSER_ROLE,
  ENFORCER_ROLE,
  ERC20ENFORCER_ROLE,
  DOCUMENT_ROLE,
  SNAPSHOOTER_ROLE,
  CROSS_CHAIN_ROLE,
  DEFAULT_ADMIN_ROLE,
  fixture,
  loadFixture,
  deployPolicyEngine,
  deployPausePolicy,
  deployRBACPolicy,
  deployCCTStandalone,
  deployCCTUpgradeable,
  deployCCTUUPSUpgradeable,
  deployCCTLiteStandalone,
  deployCCTLiteUpgradeable,
  deployCCTLiteUUPSUpgradeable,
  createStandardFixture,
  createLiteFixture,
};
