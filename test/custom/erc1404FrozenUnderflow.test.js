const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { fixture, deployPolicyEngine, deployCCTLiteStandalone } = require('../deploymentUtils');

const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));
const ERC20ENFORCER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('ERC20ENFORCER_ROLE'));
const NO_RESTRICTION = 0n;
const INSUFFICIENT_ACTIVE_BALANCE_MSG = 'AddrFrom:insufficientActiveBalance';

/**
 * Regression for NM-5: the ERC-1404 `detectTransferRestriction*` views are specified MUST-NOT-revert,
 * but the Lite variant previously recomputed `balanceOf(from) - frozenTokens` directly, which panics
 * (underflow) when the frozen amount exceeds the balance — a state ERC-7943 `setFrozenTokens`
 * explicitly allows. The fix reuses CMTAT's clamped `_checkActiveBalance`, so the view now returns the
 * insufficient-active-balance code instead of reverting.
 */
describe('ERC-1404 detect* does not revert when frozen > balance (NM-5)', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));

    this.holder = this.address1;
    this.to = this.address2;

    this.pe = await deployPolicyEngine(true, this.admin.address);
    this.cmtat = await deployCCTLiteStandalone(this.admin.address, await this.pe.getAddress());

    await this.cmtat.connect(this.admin).grantRole(MINTER_ROLE, this.admin.address);
    await this.cmtat.connect(this.admin).grantRole(ERC20ENFORCER_ROLE, this.admin.address);

    // Holder owns 100, but 1000 are frozen (> balance) — the underflow trigger.
    await this.cmtat.connect(this.admin).mint(this.holder.address, 100n);
    await this.cmtat.connect(this.admin).setFrozenTokens(this.holder.address, 1000n);
  });

  it('detectTransferRestriction returns the insufficient-active-balance code, not a revert', async function () {
    const code = await this.cmtat.detectTransferRestriction(this.holder.address, this.to.address, 50n);
    expect(code).to.not.equal(NO_RESTRICTION);
    expect(await this.cmtat.messageForTransferRestriction(code)).to.equal(
      INSUFFICIENT_ACTIVE_BALANCE_MSG,
    );
  });

  it('detectTransferRestrictionFrom returns the insufficient-active-balance code, not a revert', async function () {
    const code = await this.cmtat.detectTransferRestrictionFrom(
      this.admin.address,
      this.holder.address,
      this.to.address,
      50n,
    );
    expect(code).to.not.equal(NO_RESTRICTION);
    expect(await this.cmtat.messageForTransferRestriction(code)).to.equal(
      INSUFFICIENT_ACTIVE_BALANCE_MSG,
    );
  });

  it('a zero-value check is not restricted by active balance and does not revert', async function () {
    // frozen >= balance with value == 0 is allowed by _checkActiveBalance (clamped, no underflow).
    const code = await this.cmtat.detectTransferRestriction(this.holder.address, this.to.address, 0n);
    expect(code).to.equal(NO_RESTRICTION);
  });

  it('canTransfer returns false (not revert) for the same frozen-over-balance holder', async function () {
    expect(await this.cmtat.canTransfer(this.holder.address, this.to.address, 50n)).to.equal(false);
  });
});
