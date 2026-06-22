/**
 * Policy-coverage preflight check (addresses FEEDBACK.md H-2).
 *
 * Verifies that a deployed ComplianceToken (Standard or Lite) will not have its
 * state-changing operations bricked by the PolicyEngine configuration, and reports
 * per-selector policy coverage.
 *
 * Background — why this matters
 * -----------------------------
 * Every policy-routed operation reverts UNLESS, for that target+selector, some policy
 * returns `PolicyResult.Allowed` OR the effective `defaultAllow` is `true`. The policies
 * shipped with this integration (PausePolicy, RoleBasedAccessControlPolicy,
 * TransferValidationPolicy) all return `Continue` (never `Allowed`). Therefore:
 *
 *   - The token MUST be attached to the engine, AND
 *   - The effective `defaultAllow` (per-target override if set, else global) MUST be `true`.
 *
 * If `defaultAllow` is `false`, EVERY policy-routed operation (mint/burn/transfer/...) reverts,
 * even for selectors that have policies attached. This integration is designed for
 * `defaultAllow = true` (allow-by-default; reject only when a policy explicitly reverts).
 *
 * Usage (CLI)
 * -----------
 *   POLICY_ENGINE=0x... TOKEN=0x... \
 *   [TOKEN_CONTRACT=ComplianceTokenCMTATLiteStandalone] \
 *   npx hardhat run scripts/preflight.js
 *
 * Exit code is non-zero when the configuration would brick the token (suitable for CI/gates).
 *
 * Usage (programmatic)
 * --------------------
 *   const { preflightPolicyCoverage } = require('./scripts/preflight');
 *   const report = await preflightPolicyCoverage(tokenContract, policyEngineContract);
 */
const { ethers } = require('hardhat');

const ZERO = ethers.ZeroAddress;

/**
 * Catalogue of token operations that may be routed through the PolicyEngine.
 * `movement: true`  → moves value; routed through the engine in BOTH variants
 *                     (Lite routes these via `_transferred`; Standard via `runPolicy`).
 * `movement: false` → admin/config; routed through the engine only in the Standard
 *                     (policy-authoritative) variant. In Lite these are role-gated and
 *                     do NOT hit the engine.
 */
const OPERATIONS = [
  { sig: 'transfer(address,uint256)', movement: true },
  { sig: 'transferFrom(address,address,uint256)', movement: true },
  { sig: 'mint(address,uint256)', movement: true },
  { sig: 'burn(address,uint256)', movement: true },
  { sig: 'burn(uint256)', movement: true },
  { sig: 'burnFrom(address,uint256)', movement: true },
  { sig: 'forcedTransfer(address,address,uint256)', movement: true },
  { sig: 'crosschainMint(address,uint256)', movement: true },
  { sig: 'crosschainBurn(address,uint256)', movement: true },
  { sig: 'freezePartialTokens(address,uint256)', movement: false },
  { sig: 'unfreezePartialTokens(address,uint256)', movement: false },
  { sig: 'setName(string)', movement: false },
  { sig: 'setSymbol(string)', movement: false },
  { sig: 'setTokenId(string)', movement: false },
  { sig: 'setDocument(bytes32,string,bytes32)', movement: false },
  { sig: 'setCCIPAdmin(address)', movement: false },
];

function selectorOf(sig) {
  return ethers.id(sig).substring(0, 10);
}

/** Pick the chronologically last event from a queryFilter result. */
function lastEvent(events) {
  if (events.length === 0) return undefined;
  // queryFilter returns ascending order; guard with an explicit sort by (block, logIndex).
  const sorted = [...events].sort((a, b) =>
    a.blockNumber === b.blockNumber ? a.index - b.index : a.blockNumber - b.blockNumber,
  );
  return sorted[sorted.length - 1];
}

/**
 * Reconstruct the effective `defaultAllow` for a target from events
 * (there is no public getter on the PolicyEngine).
 */
async function readEffectiveDefaultAllow(policyEngine, tokenAddress) {
  const globalEvents = await policyEngine.queryFilter(policyEngine.filters.DefaultPolicyAllowSet());
  const targetEvents = await policyEngine.queryFilter(
    policyEngine.filters.TargetDefaultPolicyAllowSet(tokenAddress),
  );
  const lastGlobal = lastEvent(globalEvents);
  const lastTarget = lastEvent(targetEvents);
  const global = lastGlobal ? lastGlobal.args[0] : undefined;
  const target = lastTarget ? lastTarget.args[1] : undefined;
  return { global, target, effective: target === undefined ? global : target };
}

/** Reconstruct attachment state for a target from TargetAttached/TargetDetached events. */
async function readAttachment(policyEngine, tokenAddress) {
  const attached = await policyEngine.queryFilter(
    policyEngine.filters.TargetAttached(tokenAddress),
  );
  const detached = await policyEngine.queryFilter(
    policyEngine.filters.TargetDetached(tokenAddress),
  );
  const last = lastEvent([...attached, ...detached]);
  if (!last) return undefined;
  return last.fragment.name === 'TargetAttached';
}

/** Returns true if `addr` is a Chainlink ACE PausePolicy (detected via `typeAndVersion`). */
async function isPausePolicy(policyEngine, addr) {
  if (addr === ZERO) return false;
  try {
    const policy = new ethers.Contract(
      addr,
      ['function typeAndVersion() view returns (string)'],
      policyEngine.runner,
    );
    const tv = await policy.typeAndVersion();
    return tv.startsWith('PausePolicy');
  } catch {
    return false;
  }
}

/**
 * Run the preflight check.
 * @param token ethers.Contract attached with the token's real artifact ABI.
 * @param policyEngine ethers.Contract for the PolicyEngine.
 * @returns structured report: { ok, errors[], warnings[], items[], ... }
 */
async function preflightPolicyCoverage(token, policyEngine) {
  const tokenAddress = await token.getAddress();
  const variant = token.interface.hasFunction('owner()') ? 'standard' : 'lite';

  const report = {
    tokenAddress,
    variant,
    engineAddress: undefined,
    attached: undefined,
    defaultAllow: undefined,
    effectiveDefaultAllow: undefined,
    items: [],
    errors: [],
    warnings: [],
    ok: true,
  };

  const engineAddress = await token.getPolicyEngine();
  report.engineAddress = engineAddress;

  if (engineAddress === ZERO) {
    report.warnings.push(
      'No policy engine is attached (getPolicyEngine() == 0): the token performs NO compliance enforcement. ' +
        'This is functional but almost certainly unintended for a production issuance.',
    );
    return report; // nothing else to check
  }

  // 1) Attachment invariant
  const attached = await readAttachment(policyEngine, tokenAddress);
  report.attached = attached;
  if (attached === false) {
    report.errors.push(
      'Token is NOT attached to the PolicyEngine (last event was TargetDetached): every policy-routed ' +
        'operation will revert with TargetNotAttached.',
    );
  } else if (attached === undefined) {
    report.warnings.push(
      'Could not determine attachment from events (no TargetAttached/TargetDetached found for this token on ' +
        'this engine). Verify the token/engine addresses and that the engine emitted attachment events.',
    );
  }

  // 2) Effective defaultAllow invariant
  const da = await readEffectiveDefaultAllow(policyEngine, tokenAddress);
  report.defaultAllow = da;
  report.effectiveDefaultAllow = da.effective;
  if (da.effective === false) {
    report.errors.push(
      'Effective defaultAllow is FALSE. The shipped policies (Pause/RBAC/TransferValidation) return ' +
        '`Continue`, never `Allowed`, so with a fail-closed default EVERY policy-routed operation ' +
        '(mint/burn/transfer/...) reverts — the token is bricked. This integration requires ' +
        'defaultAllow = true (set it globally or per-target via setTargetDefaultPolicyAllow), unless you ' +
        'have added a terminal policy that returns `Allowed` for each selector.',
    );
  } else if (da.effective === undefined) {
    report.warnings.push(
      'Could not determine effective defaultAllow from events; verify the PolicyEngine address.',
    );
  }

  // 3) Per-selector coverage report
  const bricked = da.effective === false || attached === false;
  let anyPausePolicy = false;
  const pauselessMovement = [];
  for (const op of OPERATIONS) {
    if (!token.interface.hasFunction(op.sig)) continue;
    const selector = selectorOf(op.sig);
    const policies = await policyEngine.getPolicies(tokenAddress, selector);
    const extractor = await policyEngine.getExtractor(selector);
    const engineHitting = variant === 'standard' ? true : op.movement;

    let hasPausePolicy = false;
    for (const p of policies) {
      if (await isPausePolicy(policyEngine, p)) {
        hasPausePolicy = true;
        anyPausePolicy = true;
        break;
      }
    }

    let status;
    if (!engineHitting) {
      status = 'NOT_ROUTED'; // Lite admin op: role-gated, does not hit the engine
    } else if (bricked) {
      status = 'WILL_REVERT';
    } else {
      status = policies.length > 0 ? 'GUARDED' : 'DEFAULT_ALLOW';
    }

    report.items.push({
      name: op.sig,
      selector,
      engineHitting,
      movement: op.movement,
      policies: [...policies],
      extractor,
      hasPausePolicy,
      status,
    });

    // Soft warnings (do not fail the gate)
    if (status === 'DEFAULT_ALLOW' && op.movement) {
      report.warnings.push(
        `${op.sig}: no policy attached — relies on defaultAllow=true and is NOT compliance-screened ` +
          `(see FEEDBACK.md H-1). Attach a screening policy if this movement must be checked.`,
      );
    }
    if (status === 'GUARDED' && extractor === ZERO) {
      report.warnings.push(
        `${op.sig}: has policies but no extractor is set — any policy that needs parameters will revert at run().`,
      );
    }
    if (variant === 'standard' && op.movement && !hasPausePolicy) {
      pauselessMovement.push(op.sig);
    }
  }

  // The Standard variant has no native pause() on the token; pausing relies on a PausePolicy.
  if (variant === 'standard') {
    if (!anyPausePolicy) {
      report.warnings.push(
        'No PausePolicy is attached to any protected selector — the Standard variant has no native ' +
          'pause(), so the token currently CANNOT be paused. Attach a PausePolicy to the selectors you ' +
          'want pausable (at minimum transfer/transferFrom/mint/burn).',
      );
    } else if (pauselessMovement.length > 0) {
      report.warnings.push(
        'PausePolicy is not attached to these movement selectors, so they cannot be paused: ' +
          `${pauselessMovement.join(', ')}.`,
      );
    }
  }

  report.ok = report.errors.length === 0;
  return report;
}

/** Pretty-print a report to the console. */
function printReport(report) {
  console.log('\n=== ACE Policy-Coverage Preflight ===');
  console.log('Token:            ', report.tokenAddress, `(${report.variant})`);
  console.log('PolicyEngine:     ', report.engineAddress);
  if (report.engineAddress === ZERO) {
    console.log('Attached:          n/a');
  } else {
    console.log('Attached:         ', report.attached);
    console.log(
      'defaultAllow:      effective=%s (global=%s, target=%s)',
      String(report.effectiveDefaultAllow),
      String(report.defaultAllow?.global),
      String(report.defaultAllow?.target),
    );
  }

  if (report.items.length > 0) {
    console.log('\n  Selector coverage:');
    for (const it of report.items) {
      console.log(
        `   ${it.status.padEnd(13)} ${it.selector}  ${it.name}` +
          (it.policies.length ? `  [${it.policies.length} policy]` : ''),
      );
    }
  }

  if (report.warnings.length > 0) {
    console.log('\n  ⚠️  Warnings:');
    for (const w of report.warnings) console.log('   -', w);
  }
  if (report.errors.length > 0) {
    console.log('\n  ❌ Errors (would brick the token):');
    for (const e of report.errors) console.log('   -', e);
  }

  console.log(`\nResult: ${report.ok ? '✅ OK' : '❌ FAIL'}\n`);
}

async function main() {
  const policyEngineAddress = process.env.POLICY_ENGINE;
  const tokenAddress = process.env.TOKEN;
  const tokenContract = process.env.TOKEN_CONTRACT || 'ComplianceTokenCMTATStandalone';

  if (!policyEngineAddress || !tokenAddress) {
    console.error(
      'Usage: POLICY_ENGINE=0x.. TOKEN=0x.. [TOKEN_CONTRACT=ComplianceTokenCMTATLiteStandalone] ' +
        'npx hardhat run scripts/preflight.js',
    );
    process.exitCode = 1;
    return 1;
  }

  const policyEngine = await ethers.getContractAt('PolicyEngine', policyEngineAddress);
  const token = await ethers.getContractAt(tokenContract, tokenAddress);

  const report = await preflightPolicyCoverage(token, policyEngine);
  printReport(report);
  const code = report.ok ? 0 : 1;
  process.exitCode = code;
  return code;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { preflightPolicyCoverage, printReport, selectorOf, OPERATIONS, main };
