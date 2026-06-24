const { ethers, upgrades } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const {
  fixture,
  deployPolicyEngine,
  deployCCTLiteStandalone,
  deployCCTStandalone,
} = require('../deploymentUtils');

const PARAM_SPENDER = ethers.keccak256(ethers.toUtf8Bytes('spender'));
const PARAM_FROM = ethers.keccak256(ethers.toUtf8Bytes('from'));
const PARAM_TO = ethers.keccak256(ethers.toUtf8Bytes('to'));
const PARAM_AMOUNT = ethers.keccak256(ethers.toUtf8Bytes('amount'));
const TRANSFER_PARAMS = [PARAM_SPENDER, PARAM_FROM, PARAM_TO, PARAM_AMOUNT];

async function deployTransferValidationPolicy(policyEngineAddress, owner, ruleAddresses) {
  const cfg =
    ruleAddresses.length > 0
      ? ethers.AbiCoder.defaultAbiCoder().encode(['address[]'], [ruleAddresses])
      : '0x';
  const Factory = await ethers.getContractFactory('TransferValidationPolicy');
  return upgrades.deployProxy(Factory, [policyEngineAddress, owner, cfg], {
    initializer: 'initialize',
    unsafeAllow: ['constructor', 'missing-initializer', 'missing-initializer-call'],
    silenceWarnings: true,
  });
}

/**
 * The PolicyEngine is detachable (settable to the zero address) only on the Lite variant, where
 * access control is CMTAT role-based and the engine is used for transfer validation only. The
 * Standard variant is policy-authoritative (every privileged op is `runPolicy`-gated), so it keeps
 * the base non-zero requirement and rejects detaching.
 */
describe('PolicyEngine detach (zero address)', function () {
  describe('Lite variant allows detaching the engine', function () {
    beforeEach(async function () {
      Object.assign(this, await loadFixture(fixture));
      this.pe = await deployPolicyEngine(true, this.admin.address);
      this.peAddress = await this.pe.getAddress();
      this.cmtat = await deployCCTLiteStandalone(this.admin.address, this.peAddress);
      this.cmtatAddress = await this.cmtat.getAddress();
      await this.cmtat.connect(this.admin).mint(this.admin.address, 1000n);
    });

    it('admin can set the engine to the zero address', async function () {
      expect(await this.cmtat.getPolicyEngine()).to.equal(this.peAddress);
      await expect(this.cmtat.connect(this.admin).attachPolicyEngine(ethers.ZeroAddress)).to.not.be
        .reverted;
      expect(await this.cmtat.getPolicyEngine()).to.equal(ethers.ZeroAddress);
    });

    it('transfers still work after detaching (CMTAT native validation only)', async function () {
      await this.cmtat.connect(this.admin).attachPolicyEngine(ethers.ZeroAddress);
      await expect(this.cmtat.connect(this.admin).transfer(this.address1.address, 100n)).to.not.be
        .reverted;
      expect(await this.cmtat.balanceOf(this.address1.address)).to.equal(100n);
      // canTransfer treats a zero engine as "no policy enforcement"
      expect(await this.cmtat.canTransfer(this.admin.address, this.address1.address, 50n)).to.equal(
        true,
      );
    });

    it('detaching disables ACE policy validation (a restricting policy no longer blocks)', async function () {
      // Wire a TransferValidationPolicy that restricts address2 on the transfer selector.
      const transferSelector = this.cmtat.interface.getFunction(
        'transfer(address,uint256)',
      ).selector;
      const extractor = await ethers.deployContract('ERC20TransferFromExtractor');
      await this.pe
        .connect(this.admin)
        .setExtractor(transferSelector, await extractor.getAddress());

      const rule = await ethers.deployContract('RestrictedAddressRule', [[this.address2.address]]);
      const policy = await deployTransferValidationPolicy(this.peAddress, this.admin.address, [
        await rule.getAddress(),
      ]);
      await this.pe
        .connect(this.admin)
        .addPolicy(this.cmtatAddress, transferSelector, await policy.getAddress(), TRANSFER_PARAMS);

      // While attached, the policy blocks transfers to the restricted address.
      await expect(this.cmtat.connect(this.admin).transfer(this.address2.address, 100n)).to.be
        .reverted;
      await expect(this.cmtat.connect(this.admin).transfer(this.address1.address, 100n)).to.not.be
        .reverted;

      // After detaching, ACE validation is bypassed and the previously-blocked transfer succeeds.
      await this.cmtat.connect(this.admin).attachPolicyEngine(ethers.ZeroAddress);
      await expect(this.cmtat.connect(this.admin).transfer(this.address2.address, 100n)).to.not.be
        .reverted;
      expect(await this.cmtat.balanceOf(this.address2.address)).to.equal(100n);
    });

    it('a non-admin cannot detach the engine', async function () {
      await expect(
        this.cmtat.connect(this.address1).attachPolicyEngine(ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(this.cmtat, 'AccessControlUnauthorizedAccount');
      expect(await this.cmtat.getPolicyEngine()).to.equal(this.peAddress);
    });
  });

  describe('Standard variant forbids detaching the engine', function () {
    beforeEach(async function () {
      Object.assign(this, await loadFixture(fixture));
      this.pe = await deployPolicyEngine(true, this.admin.address);
      this.peAddress = await this.pe.getAddress();
      this.cmtat = await deployCCTStandalone(this.admin.address, this.peAddress);
    });

    it('owner attachPolicyEngine(0) reverts (access control is policy-authoritative)', async function () {
      await expect(
        this.cmtat.connect(this.admin).attachPolicyEngine(ethers.ZeroAddress),
      ).to.be.revertedWith('Policy engine is zero address');
      expect(await this.cmtat.getPolicyEngine()).to.equal(this.peAddress);
    });
  });
});
