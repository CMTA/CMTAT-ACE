const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { fixture } = require('../deploymentUtils');

describe('RestrictedAddressRule (example rule)', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
    // owner = admin
    this.RuleFactory = await ethers.getContractFactory('RestrictedAddressRule', this.admin);
  });

  it('emits RestrictionUpdated for each address in the initial list at deploy', async function () {
    const rule = await this.RuleFactory.deploy([this.address1.address]);
    await rule.waitForDeployment();
    await expect(rule.deploymentTransaction())
      .to.emit(rule, 'RestrictionUpdated')
      .withArgs(this.address1.address, true);
    expect(await rule.restricted(this.address1.address)).to.equal(true);
  });

  it('emits RestrictionUpdated when setRestricted changes status', async function () {
    const rule = await this.RuleFactory.deploy([]);
    await expect(rule.connect(this.admin).setRestricted(this.address2.address, true))
      .to.emit(rule, 'RestrictionUpdated')
      .withArgs(this.address2.address, true);
    expect(await rule.restricted(this.address2.address)).to.equal(true);

    await expect(rule.connect(this.admin).setRestricted(this.address2.address, false))
      .to.emit(rule, 'RestrictionUpdated')
      .withArgs(this.address2.address, false);
    expect(await rule.restricted(this.address2.address)).to.equal(false);
  });

  it('restricts setRestricted to the owner', async function () {
    const rule = await this.RuleFactory.deploy([]);
    await expect(
      rule.connect(this.address1).setRestricted(this.address2.address, true),
    ).to.be.revertedWith('only owner');
  });
});
