const { ethers, upgrades } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { fixture, deployPolicyEngine, deployCCTLiteStandalone } = require('../deploymentUtils');

const PARAM_FROM = ethers.keccak256(ethers.toUtf8Bytes('from'));
const PARAM_TO = ethers.keccak256(ethers.toUtf8Bytes('to'));
const PARAM_AMOUNT = ethers.keccak256(ethers.toUtf8Bytes('amount'));
const SCREEN_PARAM_NAMES = [PARAM_FROM, PARAM_TO, PARAM_AMOUNT];
const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));
const BURNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('BURNER_ROLE'));

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
 * NM-7: the `burnAndMint` multiplexer previously ran the PolicyEngine under its own (unwired) selector,
 * so the IRule sanctions/KYC screening was skipped under defaultAllow=true. The Lite token now screens
 * each leg under its canonical selector — redemption under `burn(address,uint256)`, issuance under
 * `mint(address,uint256)` — mirroring Chainlink ACE's per-item pattern. These tests wire the same
 * MintBurnExtractor + TransferValidationPolicy used for mint/burn and verify burnAndMint is screened.
 */
describe('burnAndMint per-leg compliance screening (NM-7)', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
    this.restricted = this.address2;
    this.clean = this.address3;

    this.policyEngine = await deployPolicyEngine(true, this.admin.address);
    this.policyEngineAddress = await this.policyEngine.getAddress();
    this.cmtat = await deployCCTLiteStandalone(this.admin.address, this.policyEngineAddress);
    this.cmtatAddress = await this.cmtat.getAddress();

    // burnAndMint's caller needs both roles (inner burn + mint).
    await this.cmtat.connect(this.admin).grantRole(MINTER_ROLE, this.admin.address);
    await this.cmtat.connect(this.admin).grantRole(BURNER_ROLE, this.admin.address);

    this.mintSelector = this.cmtat.interface.getFunction('mint(address,uint256)').selector;
    this.burnSelector = this.cmtat.interface.getFunction('burn(address,uint256)').selector; // 0x9dc29fac

    this.extractor = await ethers.deployContract('MintBurnExtractor');
    const extractorAddress = await this.extractor.getAddress();
    await this.policyEngine.connect(this.admin).setExtractor(this.mintSelector, extractorAddress);
    await this.policyEngine.connect(this.admin).setExtractor(this.burnSelector, extractorAddress);

    const RuleFactory = await ethers.getContractFactory('RestrictedAddressRule', this.admin);
    this.rule = await RuleFactory.deploy([]); // start empty so we can fund first, then restrict
    this.policy = await deployTransferValidationPolicy(this.policyEngineAddress, this.admin.address, [
      await this.rule.getAddress(),
    ]);
    const policyAddress = await this.policy.getAddress();
    for (const selector of [this.mintSelector, this.burnSelector]) {
      await this.policyEngine
        .connect(this.admin)
        .addPolicy(this.cmtatAddress, selector, policyAddress, SCREEN_PARAM_NAMES);
    }
  });

  it('allows burnAndMint between clean holders and screens balances', async function () {
    await this.cmtat.connect(this.admin).mint(this.clean.address, 100n);
    await expect(
      this.cmtat.connect(this.admin).burnAndMint(this.clean.address, this.address1.address, 30n, 50n, '0x'),
    ).to.not.be.reverted;
    expect(await this.cmtat.balanceOf(this.clean.address)).to.equal(70n);
    expect(await this.cmtat.balanceOf(this.address1.address)).to.equal(50n);
  });

  it('rejects burnAndMint when the redemption holder (from) is restricted (burn leg)', async function () {
    // Fund while clean, then restrict the holder.
    await this.cmtat.connect(this.admin).mint(this.restricted.address, 100n);
    await this.rule.connect(this.admin).setRestricted(this.restricted.address, true);

    await expect(
      this.cmtat
        .connect(this.admin)
        .burnAndMint(this.restricted.address, this.clean.address, 30n, 50n, '0x'),
    ).to.be.reverted;
    // No state change (atomic revert).
    expect(await this.cmtat.balanceOf(this.restricted.address)).to.equal(100n);
    expect(await this.cmtat.balanceOf(this.clean.address)).to.equal(0n);
  });

  it('rejects burnAndMint when the issuance recipient (to) is restricted (mint leg)', async function () {
    await this.cmtat.connect(this.admin).mint(this.clean.address, 100n);
    await this.rule.connect(this.admin).setRestricted(this.restricted.address, true);

    await expect(
      this.cmtat
        .connect(this.admin)
        .burnAndMint(this.clean.address, this.restricted.address, 30n, 50n, '0x'),
    ).to.be.reverted;
    expect(await this.cmtat.balanceOf(this.clean.address)).to.equal(100n);
    expect(await this.cmtat.balanceOf(this.restricted.address)).to.equal(0n);
  });
});
