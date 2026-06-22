const { ethers, upgrades } = require('hardhat');
const { expect } = require('chai');
const { loadFixture, time } = require('@nomicfoundation/hardhat-network-helpers');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
const { fixture, deployPolicyEngine, deployCCTLiteStandalone } = require('../deploymentUtils');

const PARAM_AMOUNT = ethers.keccak256(ethers.toUtf8Bytes('amount'));
const PARAM_FROM = ethers.keccak256(ethers.toUtf8Bytes('from'));
const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));

const DURATION = 3600n; // 1h window
const MAX = 100n; // max cumulative per account per window

/**
 * Integration test for the Chainlink ACE `VolumeRatePolicy`: per-account cumulative volume cap
 * within a rolling time window. Wired onto `transfer` via `ERC20TransferFromExtractor`, passing
 * [amount, from] so the policy tracks per-sender volume. Relies on the engine's `postRun` hook to
 * accumulate (only reached through the state-changing `run()` path, i.e. real transfers).
 */
describe('VolumeRatePolicy integration', function () {
  async function deployVolumeRatePolicy(policyEngineAddress, owner, duration, max) {
    const configParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'uint256'],
      [duration, max],
    );
    const Factory = await ethers.getContractFactory('VolumeRatePolicy');
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

    await this.cmtat.connect(this.admin).grantRole(MINTER_ROLE, this.admin.address);
    await this.cmtat.connect(this.admin).mint(this.address1.address, 10_000n);
    await this.cmtat.connect(this.admin).mint(this.address3.address, 10_000n);

    this.transferSelector = this.cmtat.interface.getFunction('transfer(address,uint256)').selector;
    this.extractor = await ethers.deployContract('ERC20TransferFromExtractor');
    await this.policyEngine
      .connect(this.admin)
      .setExtractor(this.transferSelector, await this.extractor.getAddress());

    this.policy = await deployVolumeRatePolicy(
      this.policyEngineAddress,
      this.admin.address,
      DURATION,
      MAX,
    );
    await this.policyEngine
      .connect(this.admin)
      .addPolicy(this.cmtatAddress, this.transferSelector, await this.policy.getAddress(), [
        PARAM_AMOUNT,
        PARAM_FROM,
      ]);
  });

  it('accumulates per account within a window and rejects over the cap', async function () {
    await expect(this.cmtat.connect(this.address1).transfer(this.address2.address, 60n)).to.not.be
      .reverted;
    await expect(this.cmtat.connect(this.address1).transfer(this.address2.address, 50n))
      .to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
      .withArgs(
        await this.policy.getAddress(),
        'volume rate limit exceeded for time period',
        anyValue,
      );
    // 60 + 40 = 100 (== cap) is still allowed
    await expect(this.cmtat.connect(this.address1).transfer(this.address2.address, 40n)).to.not.be
      .reverted;
    await expect(
      this.cmtat.connect(this.address1).transfer(this.address2.address, 1n),
    ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected');
  });

  it('rejects a single transfer above the cap', async function () {
    await expect(
      this.cmtat.connect(this.address1).transfer(this.address2.address, MAX + 1n),
    ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected');
  });

  it('resets after the time window rolls over', async function () {
    await this.cmtat.connect(this.address1).transfer(this.address2.address, MAX);
    await expect(
      this.cmtat.connect(this.address1).transfer(this.address2.address, 1n),
    ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected');

    await time.increase(Number(DURATION)); // next window
    await expect(this.cmtat.connect(this.address1).transfer(this.address2.address, MAX)).to.not.be
      .reverted;
  });

  it('tracks volume independently per account', async function () {
    await this.cmtat.connect(this.address1).transfer(this.address2.address, MAX);
    await expect(
      this.cmtat.connect(this.address1).transfer(this.address2.address, 1n),
    ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected');
    // a different sender has its own independent budget
    await expect(this.cmtat.connect(this.address3).transfer(this.address2.address, MAX)).to.not.be
      .reverted;
  });

  it('honors an owner update to the max amount', async function () {
    await this.cmtat.connect(this.address1).transfer(this.address2.address, MAX);
    await expect(this.policy.connect(this.admin).setMaxAmount(200n))
      .to.emit(this.policy, 'MaxAmountSet')
      .withArgs(200n);
    // accumulated 100 + 100 = 200 (== new cap) is allowed
    await expect(this.cmtat.connect(this.address1).transfer(this.address2.address, MAX)).to.not.be
      .reverted;
  });
});
