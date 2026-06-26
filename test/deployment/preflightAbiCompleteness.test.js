const { expect } = require('chai');
const { ethers } = require('hardhat');
const {
  deployCCTStandalone,
  deployCCTLiteStandalone,
  deployPolicyEngine,
} = require('../deploymentUtils');
const {
  preflightPolicyCoverage,
  selectorOf,
  deriveOperations,
  OPERATIONS,
} = require('../../scripts/preflight');

/**
 * VULN-3 regression: the preflight coverage set is derived from the token ABI (not a hand-maintained
 * list), so privileged overloads and multiplexers — `mint(address,uint256,bytes)`, `batchMint`,
 * `batchBurn`, `burnAndMint(...)` — can no longer be silently omitted from the coverage report.
 */
describe('Preflight: ABI-derived operation completeness (VULN-3)', function () {
  // Selectors that share privileged logic with a canonical op but were missing from the static list.
  const OVERLOAD_MULTIPLEXER_SIGS = [
    'mint(address,uint256,bytes)',
    'burnAndMint(address,address,uint256,uint256,bytes)',
    'batchMint(address[],uint256[])',
    'batchBurn(address[],uint256[])',
  ];

  async function deployStandard() {
    const [, admin] = await ethers.getSigners();
    const pe = await deployPolicyEngine(true, admin.address);
    const cmtat = await deployCCTStandalone(admin.address, await pe.getAddress());
    return { admin, pe, cmtat };
  }

  async function deployLite() {
    const [, admin] = await ethers.getSigners();
    const pe = await deployPolicyEngine(true, admin.address);
    const cmtat = await deployCCTLiteStandalone(admin.address, await pe.getAddress());
    return { admin, pe, cmtat };
  }

  it('deriveOperations includes the overloads/multiplexers the static OPERATIONS list omitted', async function () {
    const { cmtat } = await deployStandard();
    const derived = deriveOperations(cmtat).map((o) => o.sig);
    const staticSigs = OPERATIONS.map((o) => o.sig);

    for (const sig of OVERLOAD_MULTIPLEXER_SIGS) {
      expect(cmtat.interface.hasFunction(sig), `token should expose ${sig}`).to.equal(true);
      expect(derived, `derived must include ${sig}`).to.include(sig);
      expect(staticSigs, `static OPERATIONS was missing ${sig} (the VULN-3 gap)`).to.not.include(sig);
    }
  });

  it('deriveOperations never drops a curated OPERATIONS selector the token exposes (regression guard)', async function () {
    for (const fn of [deployStandard, deployLite]) {
      const { cmtat } = await fn();
      const derived = new Set(deriveOperations(cmtat).map((o) => o.sig));
      for (const op of OPERATIONS) {
        if (cmtat.interface.hasFunction(op.sig)) {
          expect(derived, `derived must contain curated ${op.sig}`).to.include(op.sig);
        }
      }
    }
  });

  it('every derived movement selector is state-changing and policy-relevant (no views/approve/grantRole)', async function () {
    const { cmtat } = await deployStandard();
    for (const op of deriveOperations(cmtat)) {
      const fn = cmtat.interface.getFunction(op.sig);
      expect(['view', 'pure']).to.not.include(fn.stateMutability);
      expect(['approve', 'grantRole', 'revokeRole', 'initialize', 'attachPolicyEngine']).to.not.include(
        fn.name,
      );
    }
  });

  it('preflight report surfaces an unwired overload/multiplexer (no longer hidden)', async function () {
    const { cmtat, pe } = await deployStandard(); // defaultAllow=true, no policies wired
    const report = await preflightPolicyCoverage(cmtat, pe);

    const burnAndMint = report.items.find(
      (i) => i.selector === selectorOf('burnAndMint(address,address,uint256,uint256,bytes)'),
    );
    expect(burnAndMint, 'burnAndMint must appear in the coverage report').to.not.equal(undefined);
    expect(burnAndMint.status).to.equal('DEFAULT_ALLOW'); // unscreened → surfaced
    expect(
      report.warnings.some((w) => w.includes('burnAndMint')),
      'an unscreened burnAndMint must raise a warning',
    ).to.equal(true);
  });
});
