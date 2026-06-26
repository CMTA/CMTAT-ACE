const { ethers, upgrades } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { fixture, deployPolicyEngine, deployCCTLiteStandalone } = require('../deploymentUtils');

const PARAM_SPENDER = ethers.keccak256(ethers.toUtf8Bytes('spender'));
const PARAM_FROM = ethers.keccak256(ethers.toUtf8Bytes('from'));
const PARAM_TO = ethers.keccak256(ethers.toUtf8Bytes('to'));
const PARAM_AMOUNT = ethers.keccak256(ethers.toUtf8Bytes('amount'));
const TRANSFER_PARAM_NAMES = [PARAM_SPENDER, PARAM_FROM, PARAM_TO, PARAM_AMOUNT];

async function deployTransferValidationPolicy(policyEngineAddress, ownerAddress, ruleAddresses) {
  const configParams = ethers.AbiCoder.defaultAbiCoder().encode(['address[]'], [ruleAddresses]);
  const Factory = await ethers.getContractFactory('TransferValidationPolicy');
  return upgrades.deployProxy(Factory, [policyEngineAddress, ownerAddress, configParams], {
    initializer: 'initialize',
    unsafeAllow: ['constructor', 'missing-initializer', 'missing-initializer-call'],
    silenceWarnings: true,
  });
}

/**
 * NM-2: TransferValidationPolicy previously validated transfers with the VIEW `detectTransferRestriction*`
 * but never invoked the state-mutating `IRule.transferred` enforcement hook, so STATEFUL rules
 * (rolling-window caps, per-period counters) were never advanced and could be bypassed by repeated transfers.
 * The policy now calls `transferred` in `postRun` (state path only). These tests use `CumulativeCapRule`,
 * whose `sent[from]` counter is advanced ONLY by `transferred`, to prove the stateful rule is now enforced.
 */
describe('Stateful IRule.transferred enforcement via postRun (NM-2)', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
    this.from = this.address1;
    this.to = this.address2;

    this.policyEngine = await deployPolicyEngine(true, this.admin.address);
    this.policyEngineAddress = await this.policyEngine.getAddress();
    this.cmtat = await deployCCTLiteStandalone(this.admin.address, this.policyEngineAddress);
    this.cmtatAddress = await this.cmtat.getAddress();

    this.extractor = await ethers.deployContract('ERC20TransferFromExtractor');
    const extractorAddress = await this.extractor.getAddress();
    this.transferSelector = this.cmtat.interface.getFunction('transfer(address,uint256)').selector;
    await this.policyEngine.connect(this.admin).setExtractor(this.transferSelector, extractorAddress);

    // Cumulative cap of 100 per sender; state advanced only by transferred().
    this.rule = await ethers.deployContract('CumulativeCapRule', [100n]);
    this.policy = await deployTransferValidationPolicy(this.policyEngineAddress, this.admin.address, [
      await this.rule.getAddress(),
    ]);
    await this.policyEngine
      .connect(this.admin)
      .addPolicy(this.cmtatAddress, this.transferSelector, await this.policy.getAddress(), TRANSFER_PARAM_NAMES);

    await this.cmtat.connect(this.admin).mint(this.from.address, 1000n);
  });

  it('advances the rule counter on each executed transfer (postRun ran)', async function () {
    expect(await this.rule.sent(this.from.address)).to.equal(0n);
    await this.cmtat.connect(this.from).transfer(this.to.address, 40n);
    expect(await this.rule.sent(this.from.address)).to.equal(40n); // <-- proves transferred() was invoked
    await this.cmtat.connect(this.from).transfer(this.to.address, 30n);
    expect(await this.rule.sent(this.from.address)).to.equal(70n);
  });

  it('enforces the cumulative cap across repeated transfers (cannot be bypassed)', async function () {
    await this.cmtat.connect(this.from).transfer(this.to.address, 60n); // sent: 0 -> 60, ok
    // Second 60 would make 120 > 100. Pre-fix (counter never advanced) this passed; now it is rejected.
    await expect(this.cmtat.connect(this.from).transfer(this.to.address, 60n)).to.be.reverted;
    // A transfer within the remaining headroom still works (60 + 40 = 100).
    await expect(this.cmtat.connect(this.from).transfer(this.to.address, 40n)).to.not.be.reverted;
    expect(await this.rule.sent(this.from.address)).to.equal(100n);
    // Now fully capped.
    await expect(this.cmtat.connect(this.from).transfer(this.to.address, 1n)).to.be.reverted;
  });

  it('a read-only canTransfer preview does NOT advance state (no postRun on check)', async function () {
    await this.cmtat.canTransfer(this.from.address, this.to.address, 50n); // staticcall / check path
    expect(await this.rule.sent(this.from.address)).to.equal(0n); // unchanged
  });

  describe('enforcement performed SOLELY in transferred (CMTAT RuleEngine pattern)', function () {
    beforeEach(async function () {
      // Re-wire with a rule whose detect* is always OK and whose enforcement lives only in transferred,
      // exactly as CMTAT's write path (ruleEngine.transferred -> rule.transferred per rule) does.
      this.policyEngine.connect(this.admin);
      this.tRule = await ethers.deployContract('TransferredEnforcedCapRule', [100n]);
      this.tPolicy = await deployTransferValidationPolicy(this.policyEngineAddress, this.admin.address, [
        await this.tRule.getAddress(),
      ]);
      // Replace the previous policy on the transfer selector with this one.
      await this.policyEngine
        .connect(this.admin)
        .removePolicy(this.cmtatAddress, this.transferSelector, await this.policy.getAddress());
      await this.policyEngine
        .connect(this.admin)
        .addPolicy(this.cmtatAddress, this.transferSelector, await this.tPolicy.getAddress(), TRANSFER_PARAM_NAMES);
    });

    it('run()/detect passes, but postRun()/transferred enforces the cap (matches CMTAT)', async function () {
      // detect always returns OK, so the run veto cannot block it; only transferred can.
      expect(await this.tRule.detectTransferRestriction(this.from.address, this.to.address, 999n)).to.equal(0n);

      await this.cmtat.connect(this.from).transfer(this.to.address, 60n); // sent 0 -> 60
      expect(await this.tRule.sent(this.from.address)).to.equal(60n);

      // 60 + 60 = 120 > 100 → transferred reverts in postRun → transfer reverts (atomic rollback).
      await expect(this.cmtat.connect(this.from).transfer(this.to.address, 60n)).to.be.reverted;
      expect(await this.tRule.sent(this.from.address)).to.equal(60n); // rolled back

      await expect(this.cmtat.connect(this.from).transfer(this.to.address, 40n)).to.not.be.reverted; // 100
      await expect(this.cmtat.connect(this.from).transfer(this.to.address, 1n)).to.be.reverted; // capped
    });
  });
});
