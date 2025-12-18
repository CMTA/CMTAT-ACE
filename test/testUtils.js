const {ethers } = require("hardhat");

async function etherAddresses () {
  const [
    forwarder,
    admin,
    address1,
    address2,
    address3,
    deployerAddress,
    fakeRuleEngine,
    ruleEngine,
    attacker
  ] = await ethers.getSigners()
  return {
    forwarder,
    admin,
    address1,
    address2,
    address3,
    deployerAddress,
    fakeRuleEngine,
    ruleEngine,
    attacker
  }
}


async function deployComplianceTokenCMTAT (forwarderAddress, adminAddress, deployerAddress) {
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
    "ComplianceTokenCMTAT smart contract" // information string
  ]
  const ComplianceTokenCMTAT = await ethers.deployContract(
    "ComplianceTokenCMTAT", 
    [
      forwarderAddress,
      adminAddress,
      erc20Attributes,
      extraInformationAttributes,
      ethers.ZeroAddress, // snapshotEngine
      ethers.ZeroAddress, // documentEngine
      ethers.ZeroAddress  // policyEngine
    ],
    deployerAddress
  )
  
  return ComplianceTokenCMTAT;
} 


module.exports = {
  etherAddresses,
  deployComplianceTokenCMTAT
};