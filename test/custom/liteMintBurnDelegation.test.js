const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { fixture, deployPolicyEngine, deployCCTLiteStandalone } = require('../deploymentUtils');

const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));
const BURNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('BURNER_ROLE'));
const ENFORCER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('ENFORCER_ROLE'));

/**
 * Lite variant: `_mintOverride`, `_burnOverride` and `_minterTransferOverride` were simplified to
 * delegate to CMTATBaseCommon (instead of re-implementing the body), matching the Standard variant.
 * This is a behaviour-preserving refactor — these tests confirm the delegated path still runs the
 * CMTAT `_checkTransferred` enforcement (freeze) on mint, burn and the minter `batchTransfer`.
 */
describe('Lite mint/burn/minterTransfer delegate to CMTATBaseCommon (enforcement preserved)', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
    this.pe = await deployPolicyEngine(true, this.admin.address);
    this.cmtat = await deployCCTLiteStandalone(this.admin.address, await this.pe.getAddress());
    await this.cmtat.connect(this.admin).grantRole(MINTER_ROLE, this.admin.address);
    await this.cmtat.connect(this.admin).grantRole(BURNER_ROLE, this.admin.address);
    await this.cmtat.connect(this.admin).grantRole(ENFORCER_ROLE, this.admin.address);
  });

  it('mint succeeds for a clean recipient and updates balance', async function () {
    await expect(this.cmtat.connect(this.admin).mint(this.address1.address, 100n)).to.not.be
      .reverted;
    expect(await this.cmtat.balanceOf(this.address1.address)).to.equal(100n);
  });

  it('mint reverts to a fully frozen recipient (enforcement still runs via the delegated override)', async function () {
    await this.cmtat.connect(this.admin).setAddressFrozen(this.address1.address, true);
    await expect(this.cmtat.connect(this.admin).mint(this.address1.address, 100n)).to.be.reverted;
  });

  it('burn succeeds for a clean holder', async function () {
    await this.cmtat.connect(this.admin).mint(this.address1.address, 100n);
    await expect(
      this.cmtat.connect(this.admin)['burn(address,uint256)'](this.address1.address, 40n),
    ).to.not.be.reverted;
    expect(await this.cmtat.balanceOf(this.address1.address)).to.equal(60n);
  });

  it('minter batchTransfer moves tokens through the delegated _minterTransferOverride', async function () {
    await this.cmtat.connect(this.admin).mint(this.admin.address, 1000n);
    await expect(
      this.cmtat
        .connect(this.admin)
        .batchTransfer([this.address1.address, this.address2.address], [10n, 20n]),
    ).to.not.be.reverted;
    expect(await this.cmtat.balanceOf(this.address1.address)).to.equal(10n);
    expect(await this.cmtat.balanceOf(this.address2.address)).to.equal(20n);
  });

  it('minter batchTransfer reverts when a recipient is frozen (enforcement preserved)', async function () {
    await this.cmtat.connect(this.admin).mint(this.admin.address, 1000n);
    await this.cmtat.connect(this.admin).setAddressFrozen(this.address2.address, true);
    await expect(
      this.cmtat
        .connect(this.admin)
        .batchTransfer([this.address1.address, this.address2.address], [10n, 20n]),
    ).to.be.reverted;
  });
});
