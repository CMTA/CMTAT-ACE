/**
 * Script example - do not use it for production
 */
const { ethers } = require("hardhat");
const { ZeroAddress, keccak256, toUtf8Bytes } = require("ethers");

async function deployPolicyEngine(deployer) {
  const factory = await ethers.getContractFactory('PolicyEngine', deployer);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  return contract;
}

async function main() {
  const network = await ethers.provider.getNetwork();
  const isHardhatNetwork = network.chainId === 31337n;

  let deployer;
  if (isHardhatNetwork) {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    console.log("Hardhat network detected, using account:", deployer.address);
  } else {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    console.log("Deploying to network:", network.name, "with account:", deployer.address);
  }

  // To change
  // Replace these with actual deployed contract addresses or deploy mocks before this
  const forwarderIrrevocable = ZeroAddress;
  const admin = isHardhatNetwork ? deployer.address : "0x1000000000000000000000000000000000000001";
  const ERC20Attributes = {
    name: "Security Token",
    symbol: "ST",
    decimalsIrrevocable: 0 // Compliant with CMTAT spec but can be different
  };
  const terms = {
    name: "Token Terms v2",
    uri: "https://cmta.ch/standards/cmta-token-cmtat",
    documentHash: keccak256(toUtf8Bytes("terms-v2"))
  };
  const extraInformationAttributes = {
    tokenId: "1234567890", // ISIN or identifier
    terms: terms,
    information: "CMTAT smart contract"
  };

  const policyEngineContract = await deployPolicyEngine(deployer);
  const policyEngineAddress = await policyEngineContract.getAddress();
  console.log("Policy Engine deployed to:", policyEngineAddress);

  // Get contract factory and deploy
  const CMTATStandalone = await ethers.getContractFactory("ComplianceTokenCMTATStandalone", deployer);
  const cmtat = await CMTATStandalone.deploy(
    forwarderIrrevocable,
    admin,
    ERC20Attributes,
    extraInformationAttributes,
    policyEngineAddress,
  );

  await cmtat.waitForDeployment();

  console.log("ComplianceTokenCMTAT deployed to:", await cmtat.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});