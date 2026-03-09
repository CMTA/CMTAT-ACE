const {ethers, upgrades } = require("hardhat");

const ZERO_ADDRESS = ethers.ZeroAddress;
const DEPLOYMENT_DECIMAL = 0;
const TERMS = {
  name: "Token Terms v2",
  uri: "https://cmta.ch/standards/cmta-token-cmtat",
  documentHash: ethers.keccak256(ethers.toUtf8Bytes("terms-v2"))
};
const ERC20_ATTRIBUTES = ["Security Token", "ST", DEPLOYMENT_DECIMAL];
const EXTRA_INFO_ATTRIBUTES_STANDALONE = ["1234567890", TERMS, "ComplianceTokenCMTATStandalone smart contract"];
const EXTRA_INFO_ATTRIBUTES_UPGRADEABLE = ["1234567890", TERMS, "ComplianceTokenCMTATUpgradeable smart contract"];
const EXTRA_INFO_ATTRIBUTES_LITE_STANDALONE = ["1234567890", TERMS, "ComplianceTokenCMTATLiteStandalone smart contract"];
const EXTRA_INFO_ATTRIBUTES_LITE_UPGRADEABLE = ["1234567890", TERMS, "ComplianceTokenCMTATLiteUpgradeable smart contract"];

// Role constants matching CMTAT convention
const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
const BURNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE"));
const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

async function etherAddresses () {
  const [
    admin,
    forwarder,
    address1,
    address2,
    address3,
    deployerAddress,
    fakeRuleEngine,
    ruleEngine,
    attacker
  ] = await ethers.getSigners()
  return {
    admin,
    forwarder,
    address1,
    address2,
    address3,
    deployerAddress,
    fakeRuleEngine,
    ruleEngine,
    attacker
  }
}

/**
 * Deploy PolicyEngine through upgrades.deployProxy (ERC1967 proxy pattern)
 */
async function deployPolicyEngine(defaultAllow, initialOwner) {
  const PolicyEngineFactory = await ethers.getContractFactory("PolicyEngine");
  const policyEngine = await upgrades.deployProxy(
    PolicyEngineFactory,
    [defaultAllow, initialOwner],
    {
      initializer: 'initialize',
      unsafeAllow: ['constructor']
    }
  );
  return policyEngine;
}

/**
 * Deploy PausePolicy through upgrades.deployProxy
 */
async function deployPausePolicy(policyEngineAddress, ownerAddress, initiallyPaused = false) {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const configParams = abiCoder.encode(["bool"], [initiallyPaused]);
  const PausePolicyFactory = await ethers.getContractFactory("PausePolicy");
  const pausePolicy = await upgrades.deployProxy(
    PausePolicyFactory,
    [policyEngineAddress, ownerAddress, configParams],
    {
      initializer: 'initialize',
      unsafeAllow: ['constructor', 'missing-initializer', 'missing-initializer-call']
    }
  );
  return pausePolicy;
}

/**
 * Deploy RoleBasedAccessControlPolicy through upgrades.deployProxy
 */
async function deployRBACPolicy(policyEngineAddress, ownerAddress) {
  const RBACFactory = await ethers.getContractFactory("RoleBasedAccessControlPolicy");
  const rbacPolicy = await upgrades.deployProxy(
    RBACFactory,
    [policyEngineAddress, ownerAddress, "0x"],
    {
      initializer: 'initialize',
      unsafeAllow: ['constructor', 'missing-initializer', 'missing-initializer-call']
    }
  );
  return rbacPolicy;
}

/**
 * Deploy ComplianceTokenCMTATStandalone (non-upgradeable)
 */
async function deployComplianceTokenCMTATStandalone(forwarderAddress, adminAddress, policyEngineAddress) {
  const cmtat = await ethers.deployContract(
    "ComplianceTokenCMTATStandalone",
    [
      forwarderAddress,
      adminAddress,
      ERC20_ATTRIBUTES,
      EXTRA_INFO_ATTRIBUTES_STANDALONE,
      policyEngineAddress
    ]
  );
  return cmtat;
}

/**
 * Deploy ComplianceTokenCMTATUpgradeable (proxy)
 */
async function deployComplianceTokenCMTATUpgradeable(forwarderAddress, adminAddress, policyEngineAddress) {
  const ETHERS_CMTAT_PROXY_FACTORY = await ethers.getContractFactory(
    'ComplianceTokenCMTATUpgradeable'
  );
  const cmtat = await upgrades.deployProxy(
    ETHERS_CMTAT_PROXY_FACTORY,
    [
      adminAddress,
      ERC20_ATTRIBUTES,
      EXTRA_INFO_ATTRIBUTES_UPGRADEABLE,
      policyEngineAddress
    ],
    {
      initializer: 'initialize',
      constructorArgs: [forwarderAddress],
      unsafeAllow: ['missing-initializer', 'constructor']
    }
  );
  return cmtat;
}

/**
 * Deploy ComplianceTokenCMTATLiteStandalone (non-upgradeable)
 */
async function deployComplianceTokenCMTATLiteStandalone(forwarderAddress, adminAddress, policyEngineAddress) {
  const cmtat = await ethers.deployContract(
    "ComplianceTokenCMTATLiteStandalone",
    [
      forwarderAddress,
      adminAddress,
      ERC20_ATTRIBUTES,
      EXTRA_INFO_ATTRIBUTES_LITE_STANDALONE,
      policyEngineAddress
    ]
  );
  return cmtat;
}

/**
 * Deploy ComplianceTokenCMTATLiteUpgradeable (proxy)
 */
async function deployComplianceTokenCMTATLiteUpgradeable(forwarderAddress, adminAddress, policyEngineAddress) {
  const ETHERS_CMTAT_PROXY_FACTORY = await ethers.getContractFactory(
    'ComplianceTokenCMTATLiteUpgradeable'
  );
  const cmtat = await upgrades.deployProxy(
    ETHERS_CMTAT_PROXY_FACTORY,
    [
      adminAddress,
      ERC20_ATTRIBUTES,
      EXTRA_INFO_ATTRIBUTES_LITE_UPGRADEABLE,
      policyEngineAddress
    ],
    {
      initializer: 'initialize',
      constructorArgs: [forwarderAddress, adminAddress, ERC20_ATTRIBUTES, EXTRA_INFO_ATTRIBUTES_LITE_UPGRADEABLE, policyEngineAddress],
      unsafeAllow: ['missing-initializer', 'constructor']
    }
  );
  return cmtat;
}

module.exports = {
  ZERO_ADDRESS,
  MINTER_ROLE,
  BURNER_ROLE,
  DEFAULT_ADMIN_ROLE,
  DEPLOYMENT_DECIMAL,
  TERMS,
  ERC20_ATTRIBUTES,
  etherAddresses,
  deployPolicyEngine,
  deployPausePolicy,
  deployRBACPolicy,
  deployComplianceTokenCMTATStandalone,
  deployComplianceTokenCMTATUpgradeable,
  deployComplianceTokenCMTATLiteStandalone,
  deployComplianceTokenCMTATLiteUpgradeable,
};