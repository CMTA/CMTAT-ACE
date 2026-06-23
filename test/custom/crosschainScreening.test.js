const { ethers, upgrades } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
const { fixture, deployPolicyEngine, deployCCTLiteStandalone } = require('../deploymentUtils');

const PARAM_FROM = ethers.keccak256(ethers.toUtf8Bytes('from'));
const PARAM_TO = ethers.keccak256(ethers.toUtf8Bytes('to'));
const PARAM_AMOUNT = ethers.keccak256(ethers.toUtf8Bytes('amount'));
const SCREEN_PARAM_NAMES = [PARAM_FROM, PARAM_TO, PARAM_AMOUNT];
const CROSS_CHAIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes('CROSS_CHAIN_ROLE'));

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
 * Screen cross-chain mint/burn with the same IRule rules used for transfers, via
 * CrossChainMintBurnExtractor. Without this, a bridge could crosschainMint to a sanctioned
 * recipient despite a "sanctions policy" being present on transfer.
 */
describe('Cross-chain mint/burn screening (H-1)', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));

    // bridge is the cross-chain caller; restricted is the sanctioned address.
    this.bridge = this.address1;
    this.restricted = this.address2;
    this.clean = this.address3;

    this.policyEngine = await deployPolicyEngine(true, this.admin.address);
    this.policyEngineAddress = await this.policyEngine.getAddress();

    this.cmtat = await deployCCTLiteStandalone(this.admin.address, this.policyEngineAddress);
    this.cmtatAddress = await this.cmtat.getAddress();

    // Roles (Lite is role-based): admin can mint; bridge can crosschainMint/Burn.
    await this.cmtat
      .connect(this.admin)
      .grantRole(ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE')), this.admin.address);
    await this.cmtat.connect(this.admin).grantRole(CROSS_CHAIN_ROLE, this.bridge.address);

    this.crosschainMintSelector = this.cmtat.interface.getFunction(
      'crosschainMint(address,uint256)',
    ).selector;
    this.crosschainBurnSelector = this.cmtat.interface.getFunction(
      'crosschainBurn(address,uint256)',
    ).selector;

    // The extractor that maps cross-chain mint/burn into (from, to, amount).
    this.extractor = await ethers.deployContract('CrossChainMintBurnExtractor');
    const extractorAddress = await this.extractor.getAddress();
    await this.policyEngine
      .connect(this.admin)
      .setExtractor(this.crosschainMintSelector, extractorAddress);
    await this.policyEngine
      .connect(this.admin)
      .setExtractor(this.crosschainBurnSelector, extractorAddress);

    // Screening rule (owned by admin) + policy, attached to the cross-chain selectors.
    const RuleFactory = await ethers.getContractFactory('RestrictedAddressRule', this.admin);
    this.rule = await RuleFactory.deploy([this.restricted.address]);
    this.policy = await deployTransferValidationPolicy(
      this.policyEngineAddress,
      this.admin.address,
      [await this.rule.getAddress()],
    );
    const policyAddress = await this.policy.getAddress();
    for (const selector of [this.crosschainMintSelector, this.crosschainBurnSelector]) {
      await this.policyEngine
        .connect(this.admin)
        .addPolicy(this.cmtatAddress, selector, policyAddress, SCREEN_PARAM_NAMES);
    }
  });

  describe('crosschainMint', function () {
    it('rejects minting to a restricted recipient', async function () {
      // Reverts specifically because the screening policy rejected it (not an unrelated revert).
      await expect(this.cmtat.connect(this.bridge).crosschainMint(this.restricted.address, 100n))
        .to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
        .withArgs(await this.policy.getAddress(), 'Recipient is restricted', anyValue);
    });

    it('allows minting to a clean recipient', async function () {
      await expect(this.cmtat.connect(this.bridge).crosschainMint(this.clean.address, 100n)).to.not
        .be.reverted;
      expect(await this.cmtat.balanceOf(this.clean.address)).to.equal(100n);
    });
  });

  describe('crosschainBurn', function () {
    it('rejects burning from a restricted holder', async function () {
      // Give the (later-restricted) holder a balance via a normal mint, then burn cross-chain.
      await this.cmtat.connect(this.admin).mint(this.restricted.address, 100n);
      await expect(this.cmtat.connect(this.bridge).crosschainBurn(this.restricted.address, 50n)).to
        .be.reverted;
    });

    it('allows burning from a clean holder', async function () {
      await this.cmtat.connect(this.admin).mint(this.clean.address, 100n);
      await expect(this.cmtat.connect(this.bridge).crosschainBurn(this.clean.address, 50n)).to.not
        .be.reverted;
      expect(await this.cmtat.balanceOf(this.clean.address)).to.equal(50n);
    });
  });

  it('updating the rule set re-screens cross-chain operations', async function () {
    // Initially clean address passes; after restricting it, the same crosschainMint is rejected.
    await expect(this.cmtat.connect(this.bridge).crosschainMint(this.clean.address, 1n)).to.not.be
      .reverted;
    await this.rule.connect(this.admin).setRestricted(this.clean.address, true);
    await expect(this.cmtat.connect(this.bridge).crosschainMint(this.clean.address, 1n)).to.be
      .reverted;
  });
});
