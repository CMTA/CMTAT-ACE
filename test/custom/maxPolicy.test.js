const { ethers, upgrades } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
const { fixture, deployPolicyEngine, deployCCTLiteStandalone } = require('../deploymentUtils');

const PARAM_AMOUNT = ethers.keccak256(ethers.toUtf8Bytes('amount'));
const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));
const MAX = 100n;

/**
 * Integration test for the Chainlink ACE `MaxPolicy` (per-call hard cap, non-accumulating) wired
 * onto a ComplianceToken `transfer` selector via `ERC20TransferFromExtractor`.
 */
describe('MaxPolicy integration', function () {
  async function deployMaxPolicy(policyEngineAddress, owner, max) {
    const configParams = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [max]);
    const Factory = await ethers.getContractFactory('MaxPolicy');
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

    this.transferSelector = this.cmtat.interface.getFunction('transfer(address,uint256)').selector;
    this.extractor = await ethers.deployContract('ERC20TransferFromExtractor');
    await this.policyEngine
      .connect(this.admin)
      .setExtractor(this.transferSelector, await this.extractor.getAddress());

    this.policy = await deployMaxPolicy(this.policyEngineAddress, this.admin.address, MAX);
    await this.policyEngine
      .connect(this.admin)
      .addPolicy(this.cmtatAddress, this.transferSelector, await this.policy.getAddress(), [
        PARAM_AMOUNT,
      ]);
  });

  it('allows a transfer at exactly the max', async function () {
    await expect(this.cmtat.connect(this.address1).transfer(this.address2.address, MAX)).to.not.be
      .reverted;
  });

  it('rejects a transfer above the max', async function () {
    await expect(this.cmtat.connect(this.address1).transfer(this.address2.address, MAX + 1n))
      .to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
      .withArgs(await this.policy.getAddress(), 'amount exceeds maximum limit', anyValue);
  });

  it('does not accumulate between calls (each call judged independently)', async function () {
    await expect(this.cmtat.connect(this.address1).transfer(this.address2.address, MAX)).to.not.be
      .reverted;
    await expect(this.cmtat.connect(this.address1).transfer(this.address2.address, MAX)).to.not.be
      .reverted;
  });

  it('honors an owner update to the max', async function () {
    await this.policy.connect(this.admin).setMax(50n);
    await expect(
      this.cmtat.connect(this.address1).transfer(this.address2.address, 60n),
    ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected');
    await expect(this.cmtat.connect(this.address1).transfer(this.address2.address, 50n)).to.not.be
      .reverted;
  });

  it('restricts setMax to the owner', async function () {
    await expect(this.policy.connect(this.address1).setMax(50n)).to.be.reverted;
  });
});
