const { ethers, upgrades } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
const { fixture, deployPolicyEngine, deployCCTLiteStandalone } = require('../deploymentUtils');

const PARAM_AMOUNT = ethers.keccak256(ethers.toUtf8Bytes('amount'));
const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));

const MIN = 10n;
const MAX = 100n;

/**
 * Integration test for the Chainlink ACE `VolumePolicy` wired onto a ComplianceToken's
 * `transfer` selector via `ERC20TransferFromExtractor` (which exposes `amount`). Verifies that
 * per-call amount limits are enforced through the token's transfer path, and that owner config
 * updates take effect.
 *
 * VolumePolicy is a third-party Chainlink contract; this exercises OUR integration (selector
 * wiring + amount extraction), not Chainlink internals.
 */
describe('VolumePolicy integration', function () {
  async function deployVolumePolicy(policyEngineAddress, owner, minAmount, maxAmount) {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const configParams = abiCoder.encode(['uint256', 'uint256'], [minAmount, maxAmount]);
    const Factory = await ethers.getContractFactory('VolumePolicy');
    return upgrades.deployProxy(Factory, [policyEngineAddress, owner, configParams], {
      initializer: 'initialize',
      unsafeAllow: ['constructor', 'missing-initializer', 'missing-initializer-call'],
      silenceWarnings: true,
    });
  }

  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));

    this.policyEngine = await deployPolicyEngine(true, this.admin.address);
    this.policyEngineAddress = await this.policyEngine.getAddress();

    this.cmtat = await deployCCTLiteStandalone(this.admin.address, this.policyEngineAddress);
    this.cmtatAddress = await this.cmtat.getAddress();

    // Fund a holder (mint is not volume-screened in this test).
    await this.cmtat.connect(this.admin).grantRole(MINTER_ROLE, this.admin.address);
    await this.cmtat.connect(this.admin).mint(this.address1.address, 10_000n);

    this.transferSelector = this.cmtat.interface.getFunction('transfer(address,uint256)').selector;

    this.extractor = await ethers.deployContract('ERC20TransferFromExtractor');
    await this.policyEngine
      .connect(this.admin)
      .setExtractor(this.transferSelector, await this.extractor.getAddress());

    this.policy = await deployVolumePolicy(this.policyEngineAddress, this.admin.address, MIN, MAX);
    await this.policyEngine
      .connect(this.admin)
      .addPolicy(this.cmtatAddress, this.transferSelector, await this.policy.getAddress(), [
        PARAM_AMOUNT,
      ]);
  });

  it('allows a transfer within [min, max]', async function () {
    await expect(this.cmtat.connect(this.address1).transfer(this.address2.address, 50n)).to.not.be
      .reverted;
    expect(await this.cmtat.balanceOf(this.address2.address)).to.equal(50n);
  });

  it('allows a transfer at exactly the min and max bounds', async function () {
    await expect(this.cmtat.connect(this.address1).transfer(this.address2.address, MIN)).to.not.be
      .reverted;
    await expect(this.cmtat.connect(this.address1).transfer(this.address2.address, MAX)).to.not.be
      .reverted;
  });

  it('rejects a transfer above the max', async function () {
    await expect(this.cmtat.connect(this.address1).transfer(this.address2.address, MAX + 1n))
      .to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
      .withArgs(await this.policy.getAddress(), 'amount outside allowed volume limits', anyValue);
  });

  it('rejects a transfer below the min', async function () {
    await expect(this.cmtat.connect(this.address1).transfer(this.address2.address, MIN - 1n))
      .to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
      .withArgs(await this.policy.getAddress(), 'amount outside allowed volume limits', anyValue);
  });

  it('honors an owner update to the max limit', async function () {
    await expect(
      this.cmtat.connect(this.address1).transfer(this.address2.address, 150n),
    ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected');

    await expect(this.policy.connect(this.admin).setMax(200n))
      .to.emit(this.policy, 'MaxVolumeSet')
      .withArgs(200n);

    await expect(this.cmtat.connect(this.address1).transfer(this.address2.address, 150n)).to.not.be
      .reverted;
  });

  it('restricts config changes to the owner', async function () {
    await expect(this.policy.connect(this.address1).setMax(200n)).to.be.reverted;
  });
});
