const {ethers} =  require("hardhat");
const { expect } = require('chai')
const { etherAddresses, deployComplianceTokenCMTATStandalone } = require("./testUtils.js");
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers')


describe("ComplianceTokenCMTAT Standalone Deployment", () => {

  it("should deploy the ComplianceTokenCMTAT standalone contract", async () => {
    Object.assign(this, await loadFixture(etherAddresses))
    const cmtat = await deployComplianceTokenCMTATStandalone(
      this.forwarder.address,
      this.admin.address,
      this.deployerAddress
    );

    expect(await cmtat.name()).to.equal("Security Token");
    expect(await cmtat.symbol()).to.equal("ST");
    expect(await cmtat.getAdmin()).to.equal(this.admin.address);
  });
})