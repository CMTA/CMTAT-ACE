const {ethers, upgrades} =  require("hardhat");
const { expect } = require('chai')
const { etherAddresses, deployComplianceTokenCMTATUpgradeable, deployPolicyEngine } = require("./testUtils.js");
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers')

describe("ComplianceTokenCMTAT Upgradeable Deployment", () => {

  it("should deploy the ComplianceTokenCMTAT standalone contract", async () => {
    Object.assign(this, await loadFixture(etherAddresses))
    /*const cmtat = await deployComplianceTokenCMTATUpgradeable(
      this.forwarder.address,
      this.admin.address,
      this.admin.address
    );
    expect(await cmtat.name()).to.equal("Security Token");
    expect(await cmtat.symbol()).to.equal("ST");
    expect(await cmtat.getCCIPAdmin()).to.equal(this.admin.address);*/
  });

  it("should deploy PolicyEngine and ComplianceTokenCMTAT with policy engine configured", async () => {
    Object.assign(this, await loadFixture(etherAddresses))
    const policyEngine = await deployPolicyEngine(true, this.admin.address);
   // expect(await policyEngine.getAddress()).to.be.properAddress;

    // Deploy ComplianceTokenCMTAT with the PolicyEngine
    const cmtat =  await deployComplianceTokenCMTATUpgradeable(this.forwarder.address, this.admin.address, await policyEngine.getAddress())
    
    await cmtat.connect(this.admin).attach(policyEngine)
    expect(await cmtat.name()).to.equal("Security Token");
    expect(await cmtat.symbol()).to.equal("ST");
    expect(await cmtat.getPolicyEngine()).to.equal(await policyEngine.getAddress());
  });
})

