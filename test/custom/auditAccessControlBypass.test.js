const { ethers } = require('hardhat');
const { expect } = require('chai');
const {
  loadFixture,
  createStandardFixture,
  deployCCTStandalone,
  MINTER_ROLE,
  BURNER_ROLE,
} = require('../deploymentUtils');

/**
 * NM-3 / VULN-1 deployment remediation (regression).
 *
 * The Standard variant is policy-authoritative: authorization for a privileged operation lives entirely in
 * the per-`(target, selector)` PolicyEngine map. The same privileged logic is reachable through overloads
 * and multiplexers with DIFFERENT selectors — `mint(address,uint256,bytes)`, `burnAndMint(...)`, `batchMint`,
 * `batchBurn` — so each of those selectors must be wired too, or it is callable by anyone under
 * `defaultAllow = true` (the original unprivileged-mint/theft footgun).
 *
 * The canonical wiring in `deploymentUtils.js` now gates these overloads/multiplexers (to the same role as
 * their base operation), so this test asserts the bypass is CLOSED: an unprivileged attacker is rejected on
 * every privileged selector, while a legitimate role holder still works.
 *
 * (Was previously a PoC asserting the bypass succeeded; converted once the canonical wiring was completed.)
 */
describe('Standard variant: privileged overloads/multiplexers are gated (NM-3 remediation)', function () {
  const standardFixture = createStandardFixture(deployCCTStandalone);

  beforeEach(async function () {
    Object.assign(this, await loadFixture(standardFixture));
    this.attackerAddr = this.attacker.address;
  });

  it('the attacker holds neither MINTER_ROLE nor BURNER_ROLE in the authoritative RBAC policy', async function () {
    expect(await this.rbacPolicy.hasRole(MINTER_ROLE, this.attackerAddr)).to.equal(false);
    expect(await this.rbacPolicy.hasRole(BURNER_ROLE, this.attackerAddr)).to.equal(false);
  });

  it('canonical mint(address,uint256) is gated for the attacker', async function () {
    await expect(this.cmtat.connect(this.attacker).mint(this.attackerAddr, 1000n)).to.be.reverted;
  });

  it('the mint(address,uint256,bytes) overload is now gated for the attacker (bypass closed)', async function () {
    await expect(
      this.cmtat.connect(this.attacker)['mint(address,uint256,bytes)'](this.attackerAddr, 1_000_000n, '0x'),
    ).to.be.reverted;
  });

  it('the burnAndMint multiplexer is now gated for the attacker (theft closed)', async function () {
    await this.cmtat.connect(this.admin).mint(this.address1.address, 500n); // a victim with a balance
    await expect(
      this.cmtat.connect(this.attacker).burnAndMint(this.address1.address, this.attackerAddr, 500n, 500n, '0x'),
    ).to.be.reverted;
    expect(await this.cmtat.balanceOf(this.address1.address)).to.equal(500n); // untouched
  });

  it('a legitimate minter can still use the bytes overload (gating did not break the happy path)', async function () {
    await expect(
      this.cmtat.connect(this.admin)['mint(address,uint256,bytes)'](this.address1.address, 500n, '0x'),
    ).to.not.be.reverted;
    expect(await this.cmtat.balanceOf(this.address1.address)).to.equal(500n);
  });
});
