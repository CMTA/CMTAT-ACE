/**
 * Script example - do not use it for production
 */
const { ethers } = require("hardhat");
const { ZeroAddress, keccak256, toUtf8Bytes } = require("ethers");


async function main() {
  // To change
  // Replace these with actual deployed contract addresses or deploy mocks before this
  const forwarderIrrevocable = ZeroAddress;
  const admin = "0x1000000000000000000000000000000000000001";
  const policyEngine = ZeroAddress;
  const snapshotEngine = ZeroAddress;
  const documentEngine = ZeroAddress;
  const ERC20Attributes = {
    name: "Security Token",
    symbol: "ST",
    decimalsIrrevocable: 0 // Compliant with CMTAT spec but can be different
  };
  const terms = {
    name: "Token Terms v1",
    uri: "https://cmta.ch/standards/cmta-token-cmtat",
    documentHash: keccak256(toUtf8Bytes("terms-v1"))
  };
  const extraInformationAttributes = {
    tokenId: "1234567890", // ISIN or identifier
    terms: terms,
    information: "CMTAT smart contract"
  };

  // Get contract factory and deploy
  const CMTATStandalone = await ethers.getContractFactory("ComplianceTokenCMTATLiteStandalone");
  const cmtat = await CMTATStandalone.deploy(
    forwarderIrrevocable,
    admin,
    ERC20Attributes,
    extraInformationAttributes,
    policyEngine,
    snapshotEngine,
    documentEngine
  );

  await cmtat.waitForDeployment();

  console.log("ComplianceTokenCMTATLite deployed to:", await cmtat.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});