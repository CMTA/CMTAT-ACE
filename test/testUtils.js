const {ethers, upgrades } = require("hardhat");

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


async function deployComplianceTokenCMTATStandalone (forwarderAddress, deployerAddress, policyEngine) {
  const erc20Attributes = [
    "Security Token",  // name
    "ST",             // symbol
    0 // decimalsIrrevocable (legacy)
  ]
  const terms = {
    name: "Token Terms v2",
    uri: "https://cmta.ch/standards/cmta-token-cmtat",
    documentHash: ethers.keccak256(ethers.toUtf8Bytes("terms-v2"))
  }
  const extraInformationAttributes = [
    "1234567890", // ISIN or identifier as tokenId
    terms,
    "ComplianceTokenCMTATStandalone smart contract" // information string
  ]
  const ComplianceTokenCMTATStandalone = await ethers.deployContract(
    "ComplianceTokenCMTATStandalone", 
    [
      forwarderAddress,
      erc20Attributes,
      extraInformationAttributes,
      policyEngine
    ],
    deployerAddress
  )
  
  return ComplianceTokenCMTATStandalone;
} 

async function deployComplianceTokenCMTATUpgradeable (forwarderAddress, deployerAddress, policyEngine) {
  const ETHERS_CMTAT_PROXY_FACTORY = await ethers.getContractFactory(
    'ComplianceTokenCMTATUpgradeable'
  )
  const erc20Attributes = [
    "Security Token",  // name
    "ST",             // symbol
    0 // decimalsIrrevocable (legacy)
  ]
  const terms = {
    name: "Token Terms v2",
    uri: "https://cmta.ch/standards/cmta-token-cmtat",
    documentHash: ethers.keccak256(ethers.toUtf8Bytes("terms-v2"))
  }
  const extraInformationAttributes = [
    "1234567890", // ISIN or identifier as tokenId
    terms,
    "ComplianceTokenCMTATUpgradeable smart contract" // information string
  ]
  const ComplianceTokenCMTATUpgradeable = await upgrades.deployProxy(
    ETHERS_CMTAT_PROXY_FACTORY, 
    [
      erc20Attributes,
      extraInformationAttributes,
      policyEngine  // policyEngine
    ],
    {
      initializer: 'initialize',
      constructorArgs: [forwarderAddress],
      from: deployerAddress,
      unsafeAllow: ['missing-initializer','missing-initializer', 'constructor']
    }
  )
  
  return ComplianceTokenCMTATUpgradeable;
}

/**
 * Deploy PolicyEngine through upgrades.deployProxy (ERC1967 proxy pattern)
 * @param {boolean} defaultAllow - The default policy result (true = allow, false = reject)
 * @param {string} initialOwner - The address of the initial owner
 * @returns {Promise<Contract>} The deployed PolicyEngine proxy instance
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

module.exports = {
  etherAddresses,
  deployComplianceTokenCMTATStandalone,
  deployComplianceTokenCMTATUpgradeable,
  deployPolicyEngine
};