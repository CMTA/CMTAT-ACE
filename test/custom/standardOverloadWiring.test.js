const { ethers } = require('hardhat');
const { expect } = require('chai');
const {
  loadFixture,
  createStandardFixture,
  deployCCTStandalone,
  MINTER_ROLE,
} = require('../deploymentUtils');

/**
 * Demonstrates the NM-3 deployment remediation: the privileged *overload* selectors
 * (e.g. `mint(address,uint256,bytes)`) can be wired to the same RBAC policy as the canonical
 * `mint(address,uint256)`. A PolicyEngine policy is keyed by (target, selector), so any selector —
 * including overloads/multiplexers the canonical wiring missed — can be gated the same way.
 * Once wired, the unprivileged bypass from auditAccessControlBypass.test.js is CLOSED.
 */
describe('Standard: wiring the mint(address,uint256,bytes) overload to a policy closes the bypass', function () {
  const standardFixture = createStandardFixture(deployCCTStandalone);

  beforeEach(async function () {
    Object.assign(this, await loadFixture(standardFixture));
    this.mintBytesSelector = this.cmtat.interface.getFunction('mint(address,uint256,bytes)').selector;
  });

  it('before wiring: the overload is unguarded (attacker can mint) — the NM-3 footgun', async function () {
    await expect(
      this.cmtat
        .connect(this.attacker)
        ['mint(address,uint256,bytes)'](this.attacker.address, 1000n, '0x'),
    ).to.not.be.reverted;
  });

  it('after wiring RBAC on the overload selector: attacker is blocked, minter still works', async function () {
    // Wire the overload selector exactly like the canonical mint selector.
    expect(this.mintBytesSelector).to.equal('0x94d008ef');
    await this.policyEngine
      .connect(this.admin)
      .addPolicy(this.cmtatAddress, this.mintBytesSelector, this.pausePolicyAddress, []);
    await this.policyEngine
      .connect(this.admin)
      .addPolicy(this.cmtatAddress, this.mintBytesSelector, this.rbacPolicyAddress, []);
    await this.rbacPolicy
      .connect(this.admin)
      .grantOperationAllowanceToRole(this.mintBytesSelector, MINTER_ROLE);

    // Attacker (no MINTER_ROLE in the RBAC policy) is now rejected on the overload.
    await expect(
      this.cmtat
        .connect(this.attacker)
        ['mint(address,uint256,bytes)'](this.attacker.address, 1000n, '0x'),
    ).to.be.reverted;

    // The legitimate minter (admin holds MINTER_ROLE in the RBAC policy) can still use the overload.
    await expect(
      this.cmtat
        .connect(this.admin)
        ['mint(address,uint256,bytes)'](this.address1.address, 500n, '0x'),
    ).to.not.be.reverted;
    expect(await this.cmtat.balanceOf(this.address1.address)).to.equal(500n);
  });
});
