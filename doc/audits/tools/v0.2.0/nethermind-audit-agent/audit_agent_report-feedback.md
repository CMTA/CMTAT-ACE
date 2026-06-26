# Nethermind AuditAgent Report Feedback (v0.2.0)

Developer triage of the AI-generated AuditAgent report
(`doc/audits/tools/v0.2.0/nethermind-audit-agent/audit_agent_report_v0.2.0.pdf`).

| Version | Report | Assessment |
| ------- | ------ | ---------- |
| v0.2.0 | `audit_agent_report_v0.2.0.pdf` | `audit_agent_report-feedback.md` (this file) |

Scan: 21 contracts · 1973 LOC · commit `e4717f3…8eb0d8f3`.
AuditAgent totals: **2 High · 1 Medium · 4 Low · 3 Info** (10 findings).

> The AuditAgent disclaimer states its output may contain errors and must be human-verified. Each item below was
> re-checked against the code. Outcome: **6 fixed in code** (NM-2/4/5/6/7/8, two upgraded above the tool's
> severity), **2 accepted as documented design** (NM-3, NM-10), **1 informational / not exploitable as deployed**
> (NM-1), and **1 confirmed false positive** (NM-9).

## Triage summary

Commits are on branch `audit` (`git log`); findings with no code change are documentation/by-design.

| ID | Finding | Tool sev | Our verdict | Our sev | Status / commit |
| -- | ------- | -------- | ----------- | ------- | --------------- |
| NM-1 | Uninitialized proxy hijack via public `initialize()` | High | **Informational** (not exploitable as deployed; atomic init + impl locked) | Info | No code change (docs/by-design) |
| NM-2 | `TransferValidationPolicy` never calls stateful `IRule.transferred()` | High | **Accepted — upgraded** | High | **Fixed** — `df2d1f0` |
| NM-3 | Unmapped inherited privileged selectors bypass policy auth (Standard) | Medium | **Accepted as design** (Lite already safe; Standard policy-authoritative by design) | n/a (by design) | No code change; deployment guidance `8861325`; ops via VULN-3 |
| NM-4 | `MintBurnExtractor` lacks `burn(address,uint256)` (`0x9dc29fac`) | Low | **Accepted — upgraded** | Medium | **Fixed** — `3f69269` |
| NM-5 | `detectTransferRestriction*` reverts when frozen > balance | Low | Accepted | Low | **Fixed** — `fc529d2` (+ refactor `b0ab2d2`) |
| NM-6 | Context cleared mid-batch breaks batch ops w/ context policies | Low | Accepted | Low | **Fixed** — `b848795` |
| NM-7 | `burnAndMint` bypasses screening in Lite (wrong selector) | Low | **Accepted — upgraded** (= NM-3 in Lite) | Medium | **Fixed** — `f3e72e6` |
| NM-8 | Standard `canSend`/`canReceive` always `true` | Info | **Fixed (account-level signal added)** | Info | **Fixed** — `16f0620` |
| NM-9 | `initialize()` accepts zero PolicyEngine (Standard) | Info | **False positive** | — | Rejected (no change) |
| NM-10 | Lite flows only screened if exact selectors wired | Info | Accepted by design | Info | No code change; deployment guidance `8861325` + preflight |

Related refactor (not an AuditAgent finding): `b0ab2d2` removed duplicated mint/burn/minterTransfer logic in the
Lite base (delegate to `CMTATBaseCommon`), surfaced while fixing NM-5.

---

## NM-1 — Uninitialized proxy can be hijacked via public `initialize()` — **Informational (severity downgraded)**

**Verdict:** This is a **well-known, expected property of the proxy pattern, not a contract defect**, and is
**not exploitable on this codebase as deployed**. We therefore rate it **Informational** — the AuditAgent's
"High" is not justified here.

Evidence (mitigations already in place):
- **Implementations are locked:** every upgradeable implementation calls `_disableInitializers()` in its
  constructor, so the dangerous variant (initializing the *implementation* itself → takeover via
  delegatecall/selfdestruct) is closed.
- **Deployment is atomic:** the supported deploy scripts use `upgrades.deployProxy(Factory, [args],
  { initializer: 'initialize' })` (`scripts/standard/*`, `scripts/lite/*`), which deploys the proxy **and** runs
  `initialize` in the **same transaction** — there is no separate-tx window to front-run. The **standalone**
  contracts call `initialize(...)` directly in their constructor. No deterministic (`CREATE2`) address is
  pre-registered or funded before initialization.
- **Worst realistic case** even in a hypothetical non-atomic deploy: an attacker captures a freshly deployed,
  **unfunded, unreferenced** proxy; the deployer notices `owner()`/admin ≠ expected and simply redeploys. No
  existing user funds or supply are ever at risk — so the "full protocol takeover / theft of user funds" framing
  does not apply to this code.

**Severity policy (per the `audit-proxy-upgradeable` skill rubric):** proxy init front-running is Informational by
default and is escalated above Informational **only when there is a clear mistake in an actual deployment script**
— i.e. a script that deploys a bare proxy/clone and initializes in a *separate* transaction, leaves init to a
manual/off-chain step, or trusts/funds a `CREATE2` address before init. None of these are present here, so it
stays Informational.

**Optional hardening (zero-cost, not required):**
1. Keep using `upgrades.deployProxy(...)` for atomic init in every deploy script (already the case); never
   introduce a bare-proxy + separate-`initialize` flow.
2. Add a post-deploy assertion in the deploy scripts: read back `owner()`/`DEFAULT_ADMIN_ROLE` and
   `getPolicyEngine()` and fail the script if they are not the intended values — locks in the guarantee.
3. One-line note in `README.md` (Deployment): always deploy proxies with atomic initialization; never a bare
   proxy + separate `initialize` transaction.

## NM-2 — `TransferValidationPolicy` never invokes stateful `IRule.transferred()` — **Fixed**

**Verdict:** Confirmed. `run()` is `view` and only called `detectTransferRestriction*`; there was no `postRun`
override, so any CMTA `IRule` whose enforcement depends on state mutated in `transferred()` (rolling-window
volume caps, per-period counters, conditional rules) was **never advanced** and could be bypassed by repeated
transfers — contradicting the "reuse CMTA Rules without code changes" claim for stateful rules.

**Reference check (CMTAT):** verified CMTAT's write path calls `transferred` per rule, never `detect*`:
`3_CMTATBaseRuleEngine.sol:179` → `RuleEngine._transferred` → `for each rule: IRule(rule).transferred(spender,
from, to, value)` (`submodules/RuleEngine/src/modules/RulesManagementModule.sol`). `detect*` is the view/preview
path only.

**Resolution:** implemented `postRun(...)` in `TransferValidationPolicy` (`contracts/modules/chainlink-ace/custom/
TransferValidationPolicy.sol`). It mirrors `run()`'s 3-param (transfer) vs 4-param (transferFrom) decode and calls
the matching `IRule.transferred` overload on each rule — exactly mirroring CMTAT's `RuleEngine.transferred`. The
PolicyEngine invokes `postRun` only after a successful `run` on the **state** path (`run(payload)`), never on the
`check()` preview (STATICCALL) — so stateful rules are advanced exactly once per executed transfer, and read-only
previews remain side-effect-free. Both `transferred` overloads are reachable on `IRule` (the 4-arg via
`IRuleEngine`, the 3-arg via `IERC3643IComplianceContract`), so no cast is needed. A `transferred` revert surfaces
as `PolicyPostRunError` and reverts the transfer.

**Why `run`/`detect*` is kept (not folded into `postRun`):** ACE reuses `run()` for both the read-only `check()`
preview (STATICCALLed by `canTransfer` / ERC-1404 `detectTransferRestriction` / off-chain simulation) and the
state path; `check()` never calls `postRun` and cannot (it is `view`). So `run`/`detect*` is what keeps the
preview accurate, while `postRun`/`transferred` does the state-path advancement + enforcement — the two together
reproduce CMTAT's behaviour (which only needs `transferred` because its write path is not reused as a `view`
preview). This split is now documented in `README.md` → *TransferValidationPolicy → run vs postRun*.

**Tests** (`test/custom/statefulRuleTransferred.test.js`, 4 cases; mocks in `TransferRuleMocks.sol`):
(1) the rule counter advances on each executed transfer — proves `transferred` is invoked;
(2) the cumulative cap is enforced across repeated transfers — the exact bypass NM-2 describes is closed
(60+60 over a cap of 100 now reverts; pre-fix it passed) — via **`CumulativeCapRule`** (counter advanced only by
`transferred`);
(3) a `canTransfer` preview does **not** advance state (no `postRun` on the `check` path);
(4) **`TransferredEnforcedCapRule`** — a rule whose `detect*` is permissive and whose enforcement lives **solely**
in `transferred` (the CMTAT pattern) — confirms `postRun`/`transferred` is an authoritative enforcer (the over-cap
transfer is blocked by `postRun`, not by `run`). All pass; full suite green (1160 passing).

## NM-3 — Unmapped inherited privileged selectors bypass policy authorization (Standard) — **Accepted as design; no code change**

**Decision (developer):** **No contract change.** Per variant:
- **Lite — already safe, nothing to do.** Lite keeps CMTAT native access control: its `_authorizeMint`/
  `_authorizeBurn` (and the other privileged hooks) are `onlyRole(...)`, applied per *operation* regardless of the
  outer selector. An unprivileged caller of any overload/multiplexer (`mint(address,uint256,bytes)`,
  `burnAndMint`, `batchMint`, …) already fails the role check. No bypass exists in Lite.
- **Standard — intentional, policy-authoritative design.** The Standard variant deliberately delegates *all*
  authorization to the PolicyEngine (`runPolicy`), keyed by selector; it has no on-token role system to "layer"
  onto. Treating the engine as the sole, authoritative gate is the design of this variant — not a contract bug to
  patch in `CCTCommon`.

**Residual responsibility is operational, not a code fix.** Because Standard is policy-authoritative, its safety
is a property of the *deployment configuration*, not the contract: the PoC in
`test/custom/auditAccessControlBypass.test.js` shows that *if* the engine runs `defaultAllow=true` *and* a
privileged selector (including the overloads/multiplexers above) is left unwired, that selector is allowed by
default. The design is sound **provided** the deployment either (a) wires an access-control policy for **every**
privileged selector — the full ABI set, not just the canonical names — or (b) runs `defaultPolicyAllow = false`
(fail-closed) with explicit allow policies (note the `TransferValidationPolicy` returns-`Continue` interaction —
verify with preflight).
This deployment requirement is tracked operationally via NM-10 / our VULN-3: `scripts/preflight.js` now
enumerates selectors from the **full token ABI** (`deriveOperations`, not a hand-maintained list) so an unwired
privileged selector is flagged before launch.

**Update — deployment remediation applied (contract still unchanged).** The canonical reference wiring now gates
the privileged overloads/multiplexers, so the as-shipped reference deployment is no longer under-wired:
`test/deploymentUtils.js` (the standard fixture) and `scripts/demo.js` add Pause + RBAC + a role allowance for
`mint(address,uint256,bytes)`, `burn(address,uint256,bytes)`, `batchMint`, `batchTransfer`, `batchBurn` (both
overloads), and `burnAndMint` (each gated to the same role as its base operation). The PoC
`test/custom/auditAccessControlBypass.test.js` was **converted into a passing regression** asserting that an
unprivileged attacker is now **blocked** on every privileged selector (and that a legitimate minter still works).
So NM-3 is: Standard contract intentionally policy-authoritative (unchanged) + complete reference wiring +
ABI-derived preflight gate + regression test.

## NM-4 — `MintBurnExtractor` lacks `burn(address,uint256)` (`0x9dc29fac`) — **Fixed**

**Resolution:** added a `burn(address,uint256)` (`0x9dc29fac`) branch to `MintBurnExtractor.extract` mapping
`from = account, to = 0, amount = value` (mirrors `burnFrom`), bumped `typeAndVersion` to `MintBurnExtractor
1.2.0`, and updated the NatSpec selector table. Direct unit coverage added in
`test/custom/mintBurnExtractor.test.js` (asserts the new selector resolves to `[account, amount, from, to]`
and that the selector is `0x9dc29fac`); `test/custom/mintBurnScreening.test.js` still passes (no regression).
The primary BURNER_ROLE burn can now be screened by `TransferValidationPolicy`, and wiring the extractor to that
selector no longer reverts. Verdict below retained for context.



**Verdict:** Confirmed. The extractor handles `mint(address,uint256)`, `burnFrom(address,uint256)`,
`burn(uint256)` but not the primary BURNER_ROLE burn `burn(address,uint256)` (`0x9dc29fac`), which the README and
`scripts/preflight.js` document as policy-protected. Two impacts: screening gap (H-1 remediation doesn't cover the
main burn) and a hard DoS if wired as documented (`_extractParameters` → `ExtractorError` → every burn reverts).
A conditional DoS on the redemption path is **Medium**, not Low.

**Fix steps:**
1. Add a branch to `MintBurnExtractor.extract`:
   ```solidity
   bytes4 private constant BURN_ACCOUNT_SELECTOR = bytes4(keccak256("burn(address,uint256)")); // 0x9dc29fac
   ...
   } else if (payload.selector == BURN_ACCOUNT_SELECTOR) {
       (account, amount) = abi.decode(payload.data, (address, uint256));
       from = account; // burn: holder = account, to = 0
   }
   ```
2. Bump `typeAndVersion` to `MintBurnExtractor 1.2.0`.
3. Test: add a direct `extract()` unit test for `0x9dc29fac` asserting `(from=account, to=0, amount)`, and an
   integration test screening a `burn(address,uint256)` of a sanctioned holder.

## NM-5 — `detectTransferRestriction*` reverts when frozen > balance — **Fixed**

**Verdict:** Confirmed. `CCTCMTATBaseERC1404._detectTransferRestriction` recomputed
`balanceOf(from) - frozenTokensLocal` under checked arithmetic; the ERC-7943 `setFrozenTokens` may set frozen >
balance, causing an underflow panic and breaking ERC-1404's "MUST NOT revert" contract.

**Resolution:** removed the hand-rolled subtraction and now delegate to CMTAT's existing, clamped, non-reverting
helper `ERC20EnforcementModuleInternal._checkActiveBalance(from, value)` — the same helper the Standard variant
(`CCTCommon`) already uses. It safely handles the `frozen >= balance` and `value == 0` edges (no underflow), and
`_detectTransferRestriction` returns `TRANSFER_REJECTED_FROM_INSUFFICIENT_ACTIVE_BALANCE` instead of reverting.
This also deletes duplicated CMTAT logic (root cause of the bug) — the now-unused `ERC20Upgradeable` and
`ERC20EnforcementModule` imports were dropped. Regression test:
`test/custom/erc1404FrozenUnderflow.test.js` (freeze 1000 over a balance of 100; assert `detectTransferRestriction`
/ `detectTransferRestrictionFrom` / `canTransfer` return a code/`false` and never revert; the `value == 0` edge
returns `NoRestriction`). The other non-reverting views (`canTransfer`/`canSend`/`canReceive`) were checked: they
route through `_checkActiveBalance` too, so they were never affected.

## NM-6 — Context cleared mid-batch breaks `batchMint`/`batchBurn`/`batchTransfer` — **Fixed**

**Verdict:** Confirmed. `ValidationModulePolicyEngine._transferred` read/cleared the per-sender `context` inside the
per-item body; in a batch each element routes through `_transferred`, so the first element consumed the caller's
context and later elements ran with empty context → an asymmetric "first item OK, rest revert" failure under a
context-dependent policy.

**Reference check (Chainlink ACE):** ACE's own reference tokens treat `context` as a **single-call** concept.
Single ops read the ambient per-sender context via the `runPolicy` modifier and clear it once after the call; for
**batch** ops, `ComplianceTokenERC3643` does **not** thread the stored context — it runs the engine per item via a
helper with `context: ""` (empty). So the intended model is: single op → ambient context (+ clear once);
batch → every item screened with empty context.

**Resolution:** aligned the Lite token with ACE's model. `_transferred` is unchanged (single ops still read the
ambient context and clear it once — there is exactly one `_update` per single op). The Lite token now overrides
`batchMint`, `batchTransfer`, and both `batchBurn` overloads to `clearContext()` **before** the loop, so every
batch item's `_transferred` evaluates the engine with an empty context — consistent for all items, no mid-batch
asymmetry. A batch + context-dependent policy is therefore intentionally unsupported (use the single-op path for
context-bearing calls), matching ACE. Files: `contracts/modules/lite/CCTCMTATBaseERC20CrossChain.sol` (batch
overrides), `contracts/modules/chainlink-ace/mocks/PolicyProtectedUpgradeableMocks.sol` (mock now records
`runCount` + `firstRunContext`). Test: `test/custom/batchContext.test.js` — a single mint threads `0x5678` to the
run; `batchMint`/`batchBurn` with `0x1234` set screen **every** item (including the first) with empty context
(`firstRunContext == 0x`), and the stored context ends cleared.

## NM-7 — `burnAndMint` bypasses compliance screening in Lite — **Fixed**

**Verdict:** Confirmed; same root cause as NM-3 (`msg.sig` of the outer call ≠ underlying operation), here on the
Lite **screening** path: a role-holding minter/burner calling `burnAndMint` ran `_transferred` under the
`burnAndMint` selector, which has no extractor/IRule policy, so under `defaultAllow=true` the sanctions/KYC `IRule`
screening was skipped.

**Reference check (Chainlink ACE):** ACE's reference tokens screen each batch/multiplexer item by running the
engine under the **underlying per-item selector** (e.g. `_requirePolicyRun(this.mint.selector, …)`) with empty
context — never the outer multiplexer selector.

**Resolution (Lite only; `burnAndMint` could not be neutralized because the CMTAT common suites exercise it, and
cross-chain uses `crosschainMint/Burn` not `burnAndMint`):** the Lite token overrides `burnAndMint` to explicitly
run the PolicyEngine for the **redemption leg under `burn(address,uint256)`** (`abi.encode(from, amountToBurn)`)
and the **issuance leg under `mint(address,uint256)`** (`abi.encode(to, amountToMint)`), each with empty context,
before delegating to CMTAT's `burnAndMint`. So whatever screening the deployer wired for `mint`/`burn` now applies
to both legs. The inner burn/mint still run the CMTAT module checks (pause/freeze/active-balance); under the
intended `defaultAllow=true` their `burnAndMint`-selector run is a no-op, so the explicit leg screening is
authoritative (under `defaultAllow=false`, `burnAndMint` fails closed — use the single-op paths). This depends on
the NM-4 fix (extractor now supports `burn(address,uint256)`). Files:
`contracts/modules/lite/CCTCMTATBaseERC20CrossChain.sol`. Test: `test/custom/burnAndMintScreening.test.js` —
wires `mint`+`burn` screening and asserts `burnAndMint` reverts when the redemption holder *or* the issuance
recipient is restricted, and succeeds between clean parties. (Standard's `burnAndMint` is unchanged — that is the
NM-3 policy-authoritative-by-design path.)

## NM-8 — Standard `canSend`/`canReceive` always return `true` — **Fixed (account-level signal added)**

**Verdict:** In the Standard variant the ERC-7943 account views were hardcoded `true`, so an integrator
pre-screening a wallet got no compliance signal (only the per-transfer `canTransfer` consulted the engine).
(Lite was unaffected — it already returns `false` for a frozen account.)

**Resolution:** `CCTCommon.canSend`/`canReceive` now query the PolicyEngine via the read-only `check` under
dedicated account-level selectors `canSend(address)` / `canReceive(address)`, with the queried account as the
payload `sender` (a rejection maps to `false`, so the view never reverts — ERC-7943 compliant). An account-level
policy wired on those selectors is therefore reflected. **Backward compatible:** with no policy wired the engine's
`defaultPolicyAllow` decides (allow-by-default ⇒ `true`, as before), so it is purely opt-in. Because
`canTransfer`/`canTransferFrom` already call these views, they now also reflect account eligibility, consistently.

**Works with ACE policies (not only repo policies).** The mechanism is the standard ACE `check` interface, so any
policy wired on the selector is evaluated. Verified against Chainlink ACE's own policies in
`test/custom/canSendReceivePolicy.test.js`: **`OnlyAuthorizedSenderPolicy`** (an account allowlist keyed on the
payload `sender`, **no extractor needed**) wired with *independent* send/receive allowlists — `canSend`/`canReceive`
reflect each list independently; **`RejectPolicy`** makes an account ineligible; the unwired selector returns
`true` (backward compat); the views never revert; and `canTransfer` reflects `canSend(from)`/`canReceive(to)`.
(Account/identity ACE policies are the right fit; quantitative transfer policies — Volume/Max/Interval, and this
repo's `TransferValidationPolicy` — are not, as they need `from/to/amount`.) `hardhat.config.js` adds the two ACE
policies to the dependency-compiler list. Files: `contracts/modules/standard/CCTCommon.sol`. Stays Info severity
(the authoritative gate `canTransfer` / `runPolicy` enforcement is unchanged).

## NM-9 — `initialize()` accepts a zero PolicyEngine (Standard) — **False positive (Reject)**

**Verdict:** **Incorrect.** The Standard variant does **not** override `_validatePolicyEngine`, so the ACE base
enforces it: `PolicyProtectedBaseUpgradeable._validatePolicyEngine` → `require(policyEngine != address(0), "Policy
engine is zero address")`, invoked from `__PolicyProtectedBase_init_unchained`. A zero engine therefore **reverts
at initialization** on Standard. Only the **Lite** variant overrides `_validatePolicyEngine` to a no-op — that is
intentional and documented (the engine is detachable on Lite). The AuditAgent mis-resolved the inheritance graph
and attributed Lite's relaxation to Standard. No change required; no action other than this note.

## NM-10 — Lite flows only screened if exact selectors wired — **Accepted by design (Info)**

**Verdict:** Correct description; this is the intended ACE model (per-target, per-selector policy wiring). The risk
is operational (under-wiring), the same family as NM-3/NM-7.

**Fix steps (operational hardening):**
1. Extend `scripts/preflight.js` to enumerate **all** value-moving/issuance/redemption selectors (incl. overloads
   and `burnAndMint`) and warn when any lacks an extractor + transfer policy on Lite.
2. Ship a canonical "screen-everything" wiring snippet in the README and reference it from the deploy scripts.
3. CI gate: fail deployment if the preflight reports an unscreened value-moving selector.

---

## Executive triage (final state)

- **Fixed in code (6):** NM-2 (`df2d1f0`, stateful `transferred` enforcement), NM-4 (`3f69269`, extractor burn
  selector), NM-5 (`fc529d2`, ERC-1404 underflow), NM-6 (`b848795`, batch context), NM-7 (`f3e72e6`, Lite
  `burnAndMint` per-leg screening), NM-8 (`16f0620`, `canSend`/`canReceive` query the engine). NM-2/NM-7 were
  re-rated above the tool's severity; NM-4 upgraded to Medium. Each ships a regression test; full suite green
  (1160 passing).
- **Accepted as design — no code change (2):** NM-3 (Lite already enforces `onlyRole`; Standard is intentionally
  policy-authoritative — safety is a deployment-config property: cover every privileged selector, or run
  `defaultAllow=false`) and NM-10 (per-target/per-selector ACE wiring is the intended model). Deployment guidance
  added in the README Security Considerations section (`8861325`); tracked operationally via VULN-3.
- **Informational — not exploitable as deployed (1):** NM-1 (proxy init front-running; mitigated by atomic
  `deployProxy` + `_disableInitializers`; optional deploy-script assertion suggested).
- **Rejected — false positive (1):** NM-9 (Standard enforces a non-zero engine; the tool mis-resolved the
  inheritance graph).
- **Cross-reference (our independent review):** `scripts/preflight.js` `OPERATIONS` omits the
  overloads/multiplexers — an assurance gap (VULN-3) that hides the NM-3/NM-7 selector surface; recommended fix is
  to derive `OPERATIONS` from the full token ABI. Still open (tooling), tracked separately.
