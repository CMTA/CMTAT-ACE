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
  const ERC20Attributes = {
    name: "Security Token",
    symbol: "ST",
    decimalsIrrevocable: 8,
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

  const policyEngineContract = await deployPolicyEngine(admin);
  const policyEngineAddress = await policyEngineContract.getAddress();
  const policyEngineImplAddress = await upgrades.erc1967.getImplementationAddress(policyEngineAddress);

  const CMTATFactory = await ethers.getContractFactory("ComplianceTokenCMTATLiteStandalone", deployer);
  const cmtat = await CMTATFactory.deploy(
    forwarderIrrevocable,
    admin,
    ERC20Attributes,
    extraInformationAttributes,
    policyEngineAddress
  );

  await cmtat.waitForDeployment();
  console.log("PolicyEngine (proxy):                       ", policyEngineAddress);
  console.log("PolicyEngine (impl):                        ", policyEngineImplAddress);
  console.log("ComplianceTokenCMTATLiteStandalone:         ", await cmtat.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
