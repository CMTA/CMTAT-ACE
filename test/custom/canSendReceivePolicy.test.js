const { ethers, upgrades } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { fixture, deployPolicyEngine, deployCCTStandalone } = require('../deploymentUtils');

const CAN_SEND_SELECTOR = ethers.id('canSend(address)').slice(0, 10);
const CAN_RECEIVE_SELECTOR = ethers.id('canReceive(address)').slice(0, 10);

/**
 * NM-8: the Standard variant's ERC-7943 `canSend`/`canReceive` now query the PolicyEngine under dedicated
 * account-level selectors, so a wired account-eligibility policy is reflected (instead of hardcoded `true`).
 *
 * These tests wire Chainlink ACE's own `OnlyAuthorizedSenderPolicy` (an account allowlist that keys on the
 * payload `sender`, needs no extractor) to prove the integration works with ACE policies — not only repo
 * policies. Includes independent send/receive allowlists, backward-compat (unwired ⇒ `true`), the
 * never-revert contract, a second ACE policy type (`RejectPolicy`), and `canTransfer` consistency.
 */
async function deployAcePolicy(name, policyEngineAddress, owner) {
  const Factory = await ethers.getContractFactory(name);
  return upgrades.deployProxy(Factory, [policyEngineAddress, owner, '0x'], {
    initializer: 'initialize',
    unsafeAllow: ['constructor', 'missing-initializer', 'missing-initializer-call'],
    silenceWarnings: true,
  });
}

describe('Standard canSend/canReceive query the PolicyEngine (NM-8) — with ACE policies', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
    this.pe = await deployPolicyEngine(true, this.admin.address); // defaultAllow = true
    this.peAddr = await this.pe.getAddress();
    this.cmtat = await deployCCTStandalone(this.admin.address, this.peAddr);
    this.cmtatAddr = await this.cmtat.getAddress();

    this.sender = this.address1; // allowed to SEND
    this.receiver = this.address2; // allowed to RECEIVE
    this.outsider = this.address3; // on no list
  });

  it('backward compatible: with no policy wired, canSend/canReceive return true (defaultAllow)', async function () {
    expect(await this.cmtat.canSend(this.outsider.address)).to.equal(true);
    expect(await this.cmtat.canReceive(this.outsider.address)).to.equal(true);
  });

  describe('ACE OnlyAuthorizedSenderPolicy wired on canSend / canReceive (independent allowlists)', function () {
    beforeEach(async function () {
      // Separate ACE allowlists for send vs receive to prove the selectors are wired independently.
      this.sendPolicy = await deployAcePolicy('OnlyAuthorizedSenderPolicy', this.peAddr, this.admin.address);
      this.receivePolicy = await deployAcePolicy('OnlyAuthorizedSenderPolicy', this.peAddr, this.admin.address);
      await this.sendPolicy.connect(this.admin).authorizeSender(this.sender.address);
      await this.receivePolicy.connect(this.admin).authorizeSender(this.receiver.address);

      await this.pe
        .connect(this.admin)
        .addPolicy(this.cmtatAddr, CAN_SEND_SELECTOR, await this.sendPolicy.getAddress(), []);
      await this.pe
        .connect(this.admin)
        .addPolicy(this.cmtatAddr, CAN_RECEIVE_SELECTOR, await this.receivePolicy.getAddress(), []);
    });

    it('canSend reflects the ACE send allowlist', async function () {
      expect(await this.cmtat.canSend(this.sender.address)).to.equal(true);
      expect(await this.cmtat.canSend(this.receiver.address)).to.equal(false); // only on receive list
      expect(await this.cmtat.canSend(this.outsider.address)).to.equal(false);
    });

    it('canReceive reflects the ACE receive allowlist (independent of canSend)', async function () {
      expect(await this.cmtat.canReceive(this.receiver.address)).to.equal(true);
      expect(await this.cmtat.canReceive(this.sender.address)).to.equal(false); // only on send list
      expect(await this.cmtat.canReceive(this.outsider.address)).to.equal(false);
    });

    it('never reverts: a rejected account returns false (does not bubble the PolicyRejected revert)', async function () {
      // staticCall-style read; a revert would throw here instead of returning a bool.
      expect(await this.cmtat.canSend(this.outsider.address)).to.be.a('boolean').that.equals(false);
    });

    it('canTransfer reflects account-level eligibility via canSend(from)/canReceive(to)', async function () {
      await this.cmtat.connect(this.admin).mint(this.sender.address, 100n); // fund an authorized sender

      // sender ∈ send list, receiver ∈ receive list, sender has balance, no transfer policy ⇒ allowed
      expect(await this.cmtat.canTransfer(this.sender.address, this.receiver.address, 10n)).to.equal(true);
      // sender not allowed to send ⇒ blocked
      expect(await this.cmtat.canTransfer(this.outsider.address, this.receiver.address, 10n)).to.equal(false);
      // receiver not allowed to receive ⇒ blocked
      expect(await this.cmtat.canTransfer(this.sender.address, this.outsider.address, 10n)).to.equal(false);
    });
  });

  it('works with a different ACE policy type: RejectPolicy on canSend makes every account ineligible', async function () {
    const reject = await deployAcePolicy('RejectPolicy', this.peAddr, this.admin.address);
    await this.pe
      .connect(this.admin)
      .addPolicy(this.cmtatAddr, CAN_SEND_SELECTOR, await reject.getAddress(), []);

    expect(await this.cmtat.canSend(this.sender.address)).to.equal(false);
    expect(await this.cmtat.canReceive(this.sender.address)).to.equal(true); // canReceive still unwired ⇒ true
  });
});
