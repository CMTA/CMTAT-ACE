const { ethers, upgrades } = require('hardhat');
const { expect } = require('chai');
const { loadFixture, time } = require('@nomicfoundation/hardhat-network-helpers');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
const { fixture, deployPolicyEngine, TERMS } = require('../deploymentUtils');

const PARAM_AMOUNT = ethers.keccak256(ethers.toUtf8Bytes('amount'));
const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));

const TOKEN_DECIMALS = 8;
const RESERVE = 1000n; // raw cap (feed and token both 8 decimals → scaledReserve == answer)

/**
 * Integration test for the Chainlink ACE `SecureMintPolicy` wired onto a ComplianceToken's
 * `mint` selector via `MintBurnExtractor` (which exposes `amount`). Verifies reserve-backed
 * minting end-to-end: mints within reserves pass; mints that would push totalSupply past the
 * Proof-of-Reserve value are rejected; stale/negative feeds are rejected.
 *
 * SecureMintPolicy is a third-party Chainlink contract; the value here is testing OUR
 * integration (selector wiring + amount extraction + the token's mint path), not Chainlink internals.
 */
describe('SecureMintPolicy integration', function () {
  async function deploySecureMintPolicy(policyEngineAddress, owner, feed, tokenAddress) {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const configParams = abiCoder.encode(
      ['address', 'tuple(uint8,uint256)', 'uint256', 'tuple(address,uint8)'],
      [feed, [0, 0], 0, [tokenAddress, TOKEN_DECIMALS]], // ReserveMarginMode.None, no staleness
    );
    const Factory = await ethers.getContractFactory('SecureMintPolicy');
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

    // SecureMintPolicy config requires token decimals in [1,18], so deploy with 8 decimals.
    this.cmtat = await ethers.deployContract('ComplianceTokenCMTATLiteStandalone', [
      this.admin.address,
      ['CMTA Token', 'CMTAT', TOKEN_DECIMALS],
      ['CMTAT_ISIN', TERMS, 'CMTAT_info'],
      this.policyEngineAddress,
    ]);
    this.cmtatAddress = await this.cmtat.getAddress();
    await this.cmtat.connect(this.admin).grantRole(MINTER_ROLE, this.admin.address);

    this.mintSelector = this.cmtat.interface.getFunction('mint(address,uint256)').selector;

    // Reserve feed: 8 decimals to match the token (1:1 scaling).
    this.feed = await ethers.deployContract('MockV3Aggregator', [TOKEN_DECIMALS, RESERVE]);

    this.extractor = await ethers.deployContract('MintBurnExtractor');
    await this.policyEngine
      .connect(this.admin)
      .setExtractor(this.mintSelector, await this.extractor.getAddress());

    this.policy = await deploySecureMintPolicy(
      this.policyEngineAddress,
      this.admin.address,
      await this.feed.getAddress(),
      this.cmtatAddress,
    );
    await this.policyEngine
      .connect(this.admin)
      .addPolicy(this.cmtatAddress, this.mintSelector, await this.policy.getAddress(), [
        PARAM_AMOUNT,
      ]);
  });

  it('allows minting within reserves', async function () {
    await expect(this.cmtat.connect(this.admin).mint(this.address1.address, 600n)).to.not.be
      .reverted;
    expect(await this.cmtat.balanceOf(this.address1.address)).to.equal(600n);
  });

  it('allows minting up to exactly the reserve value', async function () {
    await expect(this.cmtat.connect(this.admin).mint(this.address1.address, RESERVE)).to.not.be
      .reverted;
    expect(await this.cmtat.totalSupply()).to.equal(RESERVE);
  });

  it('rejects a mint that would exceed reserves', async function () {
    await expect(this.cmtat.connect(this.admin).mint(this.address1.address, RESERVE + 1n))
      .to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
      .withArgs(await this.policy.getAddress(), 'mint would exceed available reserves', anyValue);
  });

  it('accounts for existing totalSupply across successive mints', async function () {
    await this.cmtat.connect(this.admin).mint(this.address1.address, 600n);
    // 600 + 401 = 1001 > 1000 → rejected
    await expect(
      this.cmtat.connect(this.admin).mint(this.address1.address, 401n),
    ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected');
    // 600 + 400 = 1000 → allowed
    await expect(this.cmtat.connect(this.admin).mint(this.address1.address, 400n)).to.not.be
      .reverted;
  });

  it('allows more minting after reserves increase', async function () {
    await this.cmtat.connect(this.admin).mint(this.address1.address, RESERVE);
    await expect(
      this.cmtat.connect(this.admin).mint(this.address1.address, 1n),
    ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected');

    await this.feed.updateAnswer(RESERVE * 2n);
    await expect(this.cmtat.connect(this.admin).mint(this.address1.address, RESERVE)).to.not.be
      .reverted;
    expect(await this.cmtat.totalSupply()).to.equal(RESERVE * 2n);
  });

  it('rejects when the reserve feed reports a negative value', async function () {
    await this.feed.updateAnswer(-1);
    await expect(this.cmtat.connect(this.admin).mint(this.address1.address, 1n))
      .to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
      .withArgs(await this.policy.getAddress(), 'reserve value is negative', anyValue);
  });

  it('rejects when the reserve data is stale', async function () {
    await this.policy.connect(this.admin).setMaxStalenessSeconds(100);
    await time.increase(200); // push block.timestamp well past the last feed update
    await expect(this.cmtat.connect(this.admin).mint(this.address1.address, 1n))
      .to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
      .withArgs(await this.policy.getAddress(), 'reserve data is stale', anyValue);
  });
});
