const { expect } = require('chai');
const { ethers } = require('hardhat');
const {
  loadFixture,
  deployCCTStandalone,
  deployCCTLiteStandalone,
  deployPolicyEngine,
  createStandardFixture,
} = require('../deploymentUtils');
const { preflightPolicyCoverage, selectorOf } = require('../../scripts/preflight');

/**
 * Invariant tests for FEEDBACK.md H-2: a fail-closed PolicyEngine (defaultAllow=false)
 * bricks every policy-routed operation in this integration, because the shipped policies
 * only return `Continue` (never `Allowed`). The preflight checker must flag this, and the
 * flag must match real on-chain behavior.
 */
describe('Preflight: policy coverage (H-2 invariant)', function () {
  const standardFixture = createStandardFixture(deployCCTStandalone);

  async function liteFalseFixture() {
    const [, admin, address1] = await ethers.getSigners();
    const policyEngine = await deployPolicyEngine(false, admin.address);
    const cmtat = await deployCCTLiteStandalone(admin.address, await policyEngine.getAddress());
    return { admin, address1, policyEngine, cmtat };
  }

  async function standardFalseFixture() {
    const [, admin, address1] = await ethers.getSigners();
    const policyEngine = await deployPolicyEngine(false, admin.address);
    const cmtat = await deployCCTStandalone(admin.address, await policyEngine.getAddress());
    return { admin, address1, policyEngine, cmtat };
  }

  context('defaultAllow = true, policies wired (healthy deployment)', function () {
    beforeEach(async function () {
      Object.assign(this, await loadFixture(standardFixture));
    });

    it('preflight passes', async function () {
      const report = await preflightPolicyCoverage(this.cmtat, this.policyEngine);
      expect(report.ok, JSON.stringify(report.errors)).to.equal(true);
      expect(report.errors).to.have.lengthOf(0);
      expect(report.effectiveDefaultAllow).to.equal(true);
      expect(report.attached).to.equal(true);
    });

    it('reports transfer/mint as guarded by attached policies', async function () {
      const report = await preflightPolicyCoverage(this.cmtat, this.policyEngine);
      const transfer = report.items.find(
        (i) => i.selector === selectorOf('transfer(address,uint256)'),
      );
      const mint = report.items.find((i) => i.selector === selectorOf('mint(address,uint256)'));
      expect(transfer.status).to.equal('GUARDED');
      expect(mint.status).to.equal('GUARDED');
    });

    it('on-chain mint succeeds (not bricked)', async function () {
      await expect(this.cmtat.connect(this.admin).mint(this.address1.address, 100n)).to.not.be
        .reverted;
    });
  });

  context('defaultAllow = false, no policies (bricked deployment) — Standard', function () {
    beforeEach(async function () {
      Object.assign(this, await loadFixture(standardFalseFixture));
    });

    it('preflight fails with a defaultAllow error', async function () {
      const report = await preflightPolicyCoverage(this.cmtat, this.policyEngine);
      expect(report.ok).to.equal(false);
      expect(report.effectiveDefaultAllow).to.equal(false);
      expect(report.errors.join(' ')).to.match(/defaultAllow is FALSE/i);
    });

    it('flags mint as WILL_REVERT, matching real on-chain revert', async function () {
      const report = await preflightPolicyCoverage(this.cmtat, this.policyEngine);
      const mint = report.items.find((i) => i.selector === selectorOf('mint(address,uint256)'));
      expect(mint.status).to.equal('WILL_REVERT');
      // The preflight prediction must match reality: minting actually reverts.
      await expect(this.cmtat.connect(this.admin).mint(this.address1.address, 100n)).to.be.reverted;
    });
  });

  context('defaultAllow = false, no policies (bricked deployment) — Lite', function () {
    beforeEach(async function () {
      Object.assign(this, await loadFixture(liteFalseFixture));
    });

    it('preflight fails and a real transfer-path operation reverts', async function () {
      const report = await preflightPolicyCoverage(this.cmtat, this.policyEngine);
      expect(report.ok).to.equal(false);
      expect(report.effectiveDefaultAllow).to.equal(false);

      // In Lite, movement ops route through the engine via `_transferred`; mint reverts under
      // a fail-closed default even though mint authorization is role-based.
      await this.cmtat
        .connect(this.admin)
        .grantRole(ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE')), this.admin.address);
      await expect(this.cmtat.connect(this.admin).mint(this.address1.address, 100n)).to.be.reverted;
    });
  });

  context('per-target override flips a healthy global to bricked', function () {
    it('setTargetDefaultPolicyAllow(false) is detected as the effective default', async function () {
      const { admin, cmtat, policyEngine } = await loadFixture(standardFixture);
      // Global is true; override this token to false.
      await policyEngine
        .connect(admin)
        .setTargetDefaultPolicyAllow(await cmtat.getAddress(), false);

      const report = await preflightPolicyCoverage(cmtat, policyEngine);
      expect(report.effectiveDefaultAllow).to.equal(false);
      expect(report.defaultAllow.global).to.equal(true);
      expect(report.defaultAllow.target).to.equal(false);
      expect(report.ok).to.equal(false);
    });
  });

  context('Standard PausePolicy coverage', function () {
    it('warns when no PausePolicy is attached to any selector', async function () {
      const [, admin] = await ethers.getSigners();
      const policyEngine = await deployPolicyEngine(true, admin.address);
      const cmtat = await deployCCTStandalone(admin.address, await policyEngine.getAddress());

      const report = await preflightPolicyCoverage(cmtat, policyEngine);
      expect(report.ok).to.equal(true); // not bricked, just unpausable
      expect(report.warnings.join(' ')).to.match(/no PausePolicy is attached/i);
    });

    it('does not warn about pause when PausePolicy is wired on the movement selectors', async function () {
      const { cmtat, policyEngine } = await loadFixture(standardFixture);
      const report = await preflightPolicyCoverage(cmtat, policyEngine);
      expect(report.warnings.join(' ')).to.not.match(/PausePolicy/i);
      // transfer is guarded by a PausePolicy in the standard fixture
      const transfer = report.items.find(
        (i) => i.selector === selectorOf('transfer(address,uint256)'),
      );
      expect(transfer.hasPausePolicy).to.equal(true);
    });
  });
});
