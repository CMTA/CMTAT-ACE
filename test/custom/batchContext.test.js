const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { fixture, deployCCTLiteStandalone } = require('../deploymentUtils');

const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));
const BURNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('BURNER_ROLE'));
const EMPTY = '0x';

/**
 * NM-6: the per-sender PolicyEngine `context` is a single-call concept. Chainlink ACE's reference
 * tokens screen each *batch* item with an empty context (never the ambient stored context), so the
 * Lite token now clears the context before a batch runs. This avoids the mid-batch asymmetry where the
 * first item consumed the context and later items reverted under a context-dependent policy.
 *
 * Uses MockPolicyEngine, which records `runCount` and the context seen on the FIRST `run` — the field
 * that distinguishes the fix (first batch item now sees empty context, not the ambient one).
 */
describe('Batch operations screen every item with empty context (NM-6)', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
    this.engine = await ethers.deployContract('MockPolicyEngine');
    this.cmtat = await deployCCTLiteStandalone(this.admin.address, await this.engine.getAddress());
    await this.cmtat.connect(this.admin).grantRole(MINTER_ROLE, this.admin.address);
    await this.cmtat.connect(this.admin).grantRole(BURNER_ROLE, this.admin.address);
  });

  it('a single mint threads the ambient context to the policy run and then clears it', async function () {
    await this.cmtat.connect(this.admin).setContext('0x5678');
    await this.cmtat.connect(this.admin).mint(this.address1.address, 10n);

    expect(await this.engine.runCount()).to.equal(1n);
    expect(await this.engine.firstRunContext()).to.equal('0x5678');
    expect(await this.cmtat.getContext()).to.equal(EMPTY); // cleared after the single op
  });

  it('batchMint screens the FIRST item with empty context (ambient context not threaded)', async function () {
    await this.cmtat.connect(this.admin).setContext('0x1234');

    await this.cmtat
      .connect(this.admin)
      .batchMint([this.address1.address, this.address2.address], [10n, 20n]);

    expect(await this.engine.runCount()).to.equal(2n); // every item screened
    expect(await this.engine.firstRunContext()).to.equal(EMPTY); // <-- the fix (was 0x1234 before)
    expect(await this.cmtat.getContext()).to.equal(EMPTY); // cleared at batch start
    expect(await this.cmtat.balanceOf(this.address1.address)).to.equal(10n);
    expect(await this.cmtat.balanceOf(this.address2.address)).to.equal(20n);
  });

  it('batchBurn also screens the first item with empty context', async function () {
    await this.cmtat.connect(this.admin).mint(this.address1.address, 100n);
    await this.cmtat.connect(this.admin).mint(this.address2.address, 100n);
    await this.cmtat.connect(this.admin).setContext('0x1234');

    await this.cmtat
      .connect(this.admin)
      ['batchBurn(address[],uint256[])']([this.address1.address, this.address2.address], [10n, 20n]);

    expect(await this.engine.firstRunContext()).to.equal(EMPTY);
    expect(await this.cmtat.getContext()).to.equal(EMPTY);
  });
});
