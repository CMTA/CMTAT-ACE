const { ethers, upgrades } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
const { fixture, deployPolicyEngine, deployCCTLiteStandalone } = require('../deploymentUtils');

const PARAM_FROM = ethers.keccak256(ethers.toUtf8Bytes('from'));
const PARAM_TO = ethers.keccak256(ethers.toUtf8Bytes('to'));
const PARAM_AMOUNT = ethers.keccak256(ethers.toUtf8Bytes('amount'));
const SCREEN_PARAM_NAMES = [PARAM_FROM, PARAM_TO, PARAM_AMOUNT];
const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));
const BURNER_FROM_ROLE = ethers.keccak256(ethers.toUtf8Bytes('BURNER_FROM_ROLE'));

async function deployTransferValidationPolicy(policyEngineAddress, ownerAddress, ruleAddresses) {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const configParams =
    ruleAddresses.length > 0 ? abiCoder.encode(['address[]'], [ruleAddresses]) : '0x';
  const Factory = await ethers.getContractFactory('TransferValidationPolicy');
  return upgrades.deployProxy(Factory, [policyEngineAddress, ownerAddress, configParams], {
    initializer: 'initialize',
    unsafeAllow: ['constructor', 'missing-initializer', 'missing-initializer-call'],
    silenceWarnings: true,
  });
}

/**
 * FEEDBACK.md H-1 (mint / burnFrom): screen issuance and operator redemption with the same IRule
 * rules used for transfers, via the extended MintBurnExtractor (which now also emits from/to/amount).
 */
describe('Mint / burnFrom screening (H-1)', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));

    this.burner = this.address1; // holds BURNER_FROM_ROLE
    this.restricted = this.address2; // sanctioned address
    this.clean = this.address3;

    this.policyEngine = await deployPolicyEngine(true, this.admin.address);
    this.policyEngineAddress = await this.policyEngine.getAddress();

    this.cmtat = await deployCCTLiteStandalone(this.admin.address, this.policyEngineAddress);
    this.cmtatAddress = await this.cmtat.getAddress();

    await this.cmtat.connect(this.admin).grantRole(MINTER_ROLE, this.admin.address);
    await this.cmtat.connect(this.admin).grantRole(BURNER_FROM_ROLE, this.burner.address);

    this.mintSelector = this.cmtat.interface.getFunction('mint(address,uint256)').selector;
    this.burnFromSelector = this.cmtat.interface.getFunction('burnFrom(address,uint256)').selector;

    // Single extractor serves both selectors (emits account/amount + from/to/amount).
    this.extractor = await ethers.deployContract('MintBurnExtractor');
    const extractorAddress = await this.extractor.getAddress();
    await this.policyEngine.connect(this.admin).setExtractor(this.mintSelector, extractorAddress);
    await this.policyEngine
      .connect(this.admin)
      .setExtractor(this.burnFromSelector, extractorAddress);

    const RuleFactory = await ethers.getContractFactory('RestrictedAddressRule', this.admin);
    this.rule = await RuleFactory.deploy([this.restricted.address]);
    this.policy = await deployTransferValidationPolicy(
      this.policyEngineAddress,
      this.admin.address,
      [await this.rule.getAddress()],
    );
    const policyAddress = await this.policy.getAddress();
    for (const selector of [this.mintSelector, this.burnFromSelector]) {
      await this.policyEngine
        .connect(this.admin)
        .addPolicy(this.cmtatAddress, selector, policyAddress, SCREEN_PARAM_NAMES);
    }
  });

  describe('mint', function () {
    it('rejects minting to a restricted recipient', async function () {
      await expect(this.cmtat.connect(this.admin).mint(this.restricted.address, 100n))
        .to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
        .withArgs(await this.policy.getAddress(), 'Recipient is restricted', anyValue);
    });

    it('allows minting to a clean recipient', async function () {
      await expect(this.cmtat.connect(this.admin).mint(this.clean.address, 100n)).to.not.be
        .reverted;
      expect(await this.cmtat.balanceOf(this.clean.address)).to.equal(100n);
    });
  });

  describe('burnFrom', function () {
    it('rejects burning from a restricted holder', async function () {
      // Fund + approve the holder while still clean (mint is now screened too), then sanction it.
      await this.cmtat.connect(this.admin).mint(this.clean.address, 100n);
      await this.cmtat.connect(this.clean).approve(this.burner.address, 100n);
      await this.rule.connect(this.admin).setRestricted(this.clean.address, true);
      await expect(this.cmtat.connect(this.burner).burnFrom(this.clean.address, 50n))
        .to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
        .withArgs(await this.policy.getAddress(), 'Sender is restricted', anyValue);
    });

    it('allows burning from a clean holder', async function () {
      await this.cmtat.connect(this.admin).mint(this.clean.address, 100n);
      await this.cmtat.connect(this.clean).approve(this.burner.address, 100n);
      await expect(this.cmtat.connect(this.burner).burnFrom(this.clean.address, 50n)).to.not.be
        .reverted;
      expect(await this.cmtat.balanceOf(this.clean.address)).to.equal(50n);
    });
  });

  it('SecureMint-style amount param still resolves (backward compatible)', async function () {
    // The extended extractor must keep emitting `account`/`amount`; a clean mint still works.
    await expect(this.cmtat.connect(this.admin).mint(this.clean.address, 1n)).to.not.be.reverted;
  });
});
