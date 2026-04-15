/**
 * Script example - do not use it for production
 */
const { ethers, upgrades } = require("hardhat");
const { ZeroAddress, keccak256, toUtf8Bytes } = require("ethers");

async function deployPolicyEngine(initialOwner) {
  const Factory = await ethers.getContractFactory("PolicyEngine");
  const contract = await upgrades.deployProxy(
    Factory,
    [true, initialOwner],
    { initializer: "initialize", unsafeAllow: ["constructor"], silenceWarnings: true }
  );
  await contract.waitForDeployment();
  return contract;
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

  // To change
  const forwarderIrrevocable = ZeroAddress;
  const admin = isHardhatNetwork ? deployer.address : "0x1000000000000000000000000000000000000001";
  const ERC20Attributes = ["Security Token", "ST", 0];
  const terms = {
    name: "Token Terms v2",
    uri: "https://cmta.ch/standards/cmta-token-cmtat",
    documentHash: keccak256(toUtf8Bytes("terms-v2")),
  };
  const extraInformationAttributes = ["1234567890", [terms.name, terms.uri, terms.documentHash], "CMTAT smart contract"];

  const policyEngineContract = await deployPolicyEngine(admin);
  const policyEngineAddress = await policyEngineContract.getAddress();

  const Factory = await ethers.getContractFactory("ComplianceTokenCMTATUpgradeable", deployer);
  const cmtat = await upgrades.deployProxy(
    Factory,
    [
      admin,
      ERC20Attributes,
      extraInformationAttributes,
      policyEngineAddress,
      ZeroAddress,
      ZeroAddress,
    ],
    {
      initializer: "initialize",
      constructorArgs: [forwarderIrrevocable],
      unsafeAllow: ["missing-initializer", "constructor"],
      silenceWarnings: true,
    }
  );

  await cmtat.waitForDeployment();
  const cmtatProxyAddress = await cmtat.getAddress();
  const cmtatImplAddress = await upgrades.erc1967.getImplementationAddress(cmtatProxyAddress);
  const policyEngineImplAddress = await upgrades.erc1967.getImplementationAddress(policyEngineAddress);
  console.log("PolicyEngine (proxy):                      ", policyEngineAddress);
  console.log("PolicyEngine (impl):                       ", policyEngineImplAddress);
  console.log("ComplianceTokenCMTATUpgradeable (proxy):   ", cmtatProxyAddress);
  console.log("ComplianceTokenCMTATUpgradeable (impl):    ", cmtatImplAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
