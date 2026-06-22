const { ethers, upgrades } = require('hardhat');
const { expect } = require('chai');
const { loadFixture, time } = require('@nomicfoundation/hardhat-network-helpers');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
const { fixture, deployPolicyEngine, deployCCTLiteStandalone } = require('../deploymentUtils');

const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));

// Cycle config: 1s slots, 10-slot cycle, transfers allowed only in slots [START, END).
// With slotDuration=1 and cycleOffset=0, currentSlot == block.timestamp % CYCLE_SIZE.
const SLOT_DURATION = 1;
const CYCLE_SIZE = 10;
const CYCLE_OFFSET = 0;
const START = 2; // inclusive
const END = 5; // exclusive

/**
 * Integration test for the Chainlink ACE `IntervalPolicy`, used here as a "trading-hours" /
 * settlement-window control: a regulated token may only be transferred during a configured window
 * of a repeating cycle. Wired onto `transfer` (the policy ignores parameters, so no extractor is
 * needed). Slots are pinned deterministically via setNextBlockTimestamp.
 */
describe('IntervalPolicy integration (trading-hours window)', function () {
  async function deployIntervalPolicy(policyEngineAddress, owner) {
    const configParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'uint256', 'tuple(uint256,uint256,uint256)'],
      [START, END, [SLOT_DURATION, CYCLE_SIZE, CYCLE_OFFSET]],
    );
    const Factory = await ethers.getContractFactory('IntervalPolicy');
    return upgrades.deployProxy(Factory, [policyEngineAddress, owner, configParams], {
      initializer: 'initialize',
      unsafeAllow: ['constructor', 'missing-initializer', 'missing-initializer-call'],
      silenceWarnings: true,
    });
  }

  // Pin the NEXT block so that currentSlot == slot (currentSlot = block.timestamp % CYCLE_SIZE).
  async function mineNextAtSlot(slot) {
    const now = await time.latest();
    let t = Math.floor(now / CYCLE_SIZE) * CYCLE_SIZE + slot;
    while (t <= now) t += CYCLE_SIZE;
    await time.setNextBlockTimestamp(t);
  }

  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));

    this.policyEngine = await deployPolicyEngine(true, this.admin.address);
    this.policyEngineAddress = await this.policyEngine.getAddress();
    this.cmtat = await deployCCTLiteStandalone(this.admin.address, this.policyEngineAddress);
    this.cmtatAddress = await this.cmtat.getAddress();

    await this.cmtat.connect(this.admin).grantRole(MINTER_ROLE, this.admin.address);
    await this.cmtat.connect(this.admin).mint(this.address1.address, 10_000n);

    this.transferSelector = this.cmtat.interface.getFunction('transfer(address,uint256)').selector;
    this.policy = await deployIntervalPolicy(this.policyEngineAddress, this.admin.address);
    await this.policyEngine
      .connect(this.admin)
      .addPolicy(this.cmtatAddress, this.transferSelector, await this.policy.getAddress(), []);
  });

  it('allows a transfer inside the window', async function () {
    await mineNextAtSlot(3); // 3 in [2,5)
    await expect(this.cmtat.connect(this.address1).transfer(this.address2.address, 100n)).to.not.be
      .reverted;
  });

  it('allows a transfer at the inclusive start slot', async function () {
    await mineNextAtSlot(START); // 2 in [2,5)
    await expect(this.cmtat.connect(this.address1).transfer(this.address2.address, 100n)).to.not.be
      .reverted;
  });

  it('rejects a transfer at the exclusive end slot', async function () {
    await mineNextAtSlot(END); // 5 not in [2,5)
    await expect(this.cmtat.connect(this.address1).transfer(this.address2.address, 100n))
      .to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
      .withArgs(
        await this.policy.getAddress(),
        'execution outside allowed time interval',
        anyValue,
      );
  });

  it('rejects a transfer outside the window', async function () {
    await mineNextAtSlot(7); // 7 not in [2,5)
    await expect(
      this.cmtat.connect(this.address1).transfer(this.address2.address, 100n),
    ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected');
  });

  it('honors an owner widening the window', async function () {
    await mineNextAtSlot(7);
    await expect(
      this.cmtat.connect(this.address1).transfer(this.address2.address, 100n),
    ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected');

    await expect(this.policy.connect(this.admin).setEndSlot(8))
      .to.emit(this.policy, 'EndSlotSet')
      .withArgs(8);

    await mineNextAtSlot(7); // now 7 in [2,8)
    await expect(this.cmtat.connect(this.address1).transfer(this.address2.address, 100n)).to.not.be
      .reverted;
  });

  it('restricts window config to the owner', async function () {
    await expect(this.policy.connect(this.address1).setEndSlot(8)).to.be.reverted;
  });
});
