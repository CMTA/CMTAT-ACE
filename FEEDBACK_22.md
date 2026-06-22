# Review — CMTAT × ACE integration (ERC compliance, transfers, pause/freeze, events, tests)

> Independent follow-up review focused on what was added/changed in this work stream:
> ERC-7943 (uRWA) support, the screening extractors, the policy integration tests, and the
> transfer-enforcement surface. Verified against source + compiled ABIs; full suite **1059
> passing, 0 failing** at time of review. CMTAT is pinned to the unaudited `v3.3.0-rc1`.

## Verdict

The implementation is **correct and internally consistent** for the headline goals:

- ERC-7943 fungible id `0x3edbb4c4` is advertised by both variants and matches the spec.
- The new `canTransfer`/`canTransferFrom` views **faithfully mirror** the real on-chain
  enforcement (same selector + sender + calldata fed to the engine), so a `canTransfer` preview
  and the actual transfer cannot silently disagree about policy outcome.
- `forcedTransfer` unfreezes first and emits `Frozen` **before** the base `Transfer` event, as
  ERC-7943 requires.

Remaining items are **known limitations / documentation / test-coverage gaps**, not correctness
bugs. Details below.

---

## 1. ERC compliance

### ERC-7943 (uRWA, fungible) — ✅ conformant

- **Interface id**: `type(IERC7943Fungible).interfaceId == 0x3edbb4c4`, verified equal to the
  value pinned in the spec (`erc-7943-uRWA.md`). Advertised in
  `CCTCommon.supportsInterface` and `CCTCMTATBasePolicyEngine.supportsInterface`. ERC-165 base
  (`0x01ffc9a7`) true, `0xffffffff` false (tested).
- **Function surface** present on both variants (ABI-verified): `forcedTransfer(address,address,uint256)→bool`,
  `setFrozenTokens(address,uint256)→bool`, `getFrozenTokens(address)→uint256`,
  `canTransfer(address,address,uint256)→bool`, `canSend(address)→bool`, `canReceive(address)→bool`.
- **`canTransfer` semantics** (`CCTCommon.sol`, `CCTCMTATBasePolicyEngine.sol`): non-reverting;
  combines the unfrozen-amount check + `canSend`/`canReceive` + the PolicyEngine permissioned
  rules. Matches the spec’s “MUST NOT revert / MUST validate unfrozen / MUST be permissioned”.
- **`forcedTransfer` event order** (`ERC20EnforcementModuleInternal._forcedTransfer`): `_unfreezeTokens`
  (emits `Frozen`) → `_transfer` (emits `Transfer`) → `ForcedTransfer`. Conformant.

**Known limitation (Info):** In the **Standard** variant `canSend`/`canReceive` return constant
`true`. That is honest — the Standard token has no on-chain account allowlist/freeze; eligibility
is decided per transfer by the PolicyEngine inside `canTransfer`. It satisfies the interface
(non-reverting, non-quantitative) and the spec’s allowance for `canTransfer` to carry the
permissioned check, but integrators must not treat Standard `canSend`/`canReceive` as a KYC oracle
— `canTransfer` is authoritative. This is documented in the README and in code comments.

### ERC-1404 — ✅ addressed (was M-1 partial divergence)

Previously `detectTransferRestriction` checked only `deactivated`/`paused`/`frozen`/active-balance
and ignored the PolicyEngine, so it could return `0` (“NoRestriction”) for a transfer the engine
would reject.

**Fix (this change):** `CCTCMTATBaseERC1404` now overrides the public `detectTransferRestriction`
and `detectTransferRestrictionFrom` to consult the PolicyEngine after the module checks pass, and
returns a new code **`200` (`TRANSFER_REJECTED_BY_POLICY_ENGINE_CODE`)** when the engine would
reject (`messageForTransferRestriction(200) == "PolicyEngine:transferRejected"`). It uses the same
`try/catch` engine `check` as `canTransfer`, so the ERC-1404 view stays non-reverting, and
module-level codes still take precedence over `200`. Covered by
`test/custom/erc1404PolicyEngine.test.js`.

Residual nuance (Low): like `canTransfer`, the engine `check` revert is mapped to a single code, so
a genuine policy rejection and a misconfiguration both surface as `200` (the M-4 boolean-collapse
limitation).

### ERC-20 / ERC-165 — ✅

Base ERC-20 unchanged; ERC-165 discovery wired for token (`IPolicyProtected`, now uRWA), policy
(`IPolicy`), and rule mocks (`IRule`).

---

## 2. Transfer check (enforcement consistency)

- **Lite**: `transfer`/`transferFrom` → `_checkTransferred` → `_transferred` →
  `policyEngine.run(selector = msg.sig, sender = _msgSender(), data = msg.data[4:])`. The view
  `canTransfer` runs the same evaluation via `check()`. Consistent. Real-transfer rejection is
  exercised by `transferValidationPolicy.test.js`.
- **Standard**: `transfer`/`transferFrom` carry `runPolicy` (same selector + `msg.data`), plus
  `_checkTransferred` (active-balance) inside `_update`. `canTransfer` replicates exactly:
  `_checkActiveBalance(from,value)` + `check(transfer selector, from, encode(to,value))`. The
  payload is byte-for-byte what a real `transfer` produces, so the preview is faithful. ✅
- **`run()` vs `check()` nuance (expected):** the real transfer uses `run()` (stateful — e.g.
  `VolumeRatePolicy.postRun` accumulates), while `canTransfer` uses the view `check()` (no
  accumulation). This is the correct behavior for a preview (“would this pass now?”).
- **Unfrozen check (correct, easily misread):** `_checkActiveBalance` only restricts when
  `getFrozenTokens(from) > 0`. With zero frozen tokens, `canTransfer` may return `true` for an
  `amount > balance`; that is intentional and spec-aligned — raw balance is the base token’s
  concern (the ERC-20 transfer then reverts), and uRWA forbids `canTransfer` returning `false`
  on non-permissioned balance checks.

**Test-coverage gap (recommend):** the **Standard** variant’s _real_ `transfer`/`transferFrom`
reverting via `runPolicy` on a restricted recipient is not directly asserted (only the
`canTransfer` view is, in `erc7943Compliance.test.js`). The mechanism is the same as Lite, but a
direct state-changing test would close the loop. See §5.

---

## 3. Pause / freeze / deactivate

ABI-verified exposure:

| Function                                                  | Standard | Lite                 |
| --------------------------------------------------------- | -------- | -------------------- |
| `pause` / `unpause` / `paused`                            | ❌       | ✅ (`PAUSER_ROLE`)   |
| `deactivateContract` / `deactivated`                      | ❌       | ✅                   |
| `setAddressFrozen` / `isFrozen` (account freeze)          | ❌       | ✅ (`ENFORCER_ROLE`) |
| `freezePartialTokens` / `getFrozenTokens` (amount freeze) | ✅       | ✅                   |
| `forcedTransfer`                                          | ✅       | ✅                   |

- **Lite**: full native pause/account-freeze/deactivate; `canSend`/`canReceive` correctly flip to
  `false` once an account is frozen (tested). Token-amount freeze feeds the `canTransfer` unfrozen
  check. Good.
- **Standard (by design):** pause and account-freeze are **not** on the token — pausing is meant
  to be enforced by attaching a `PausePolicy` (and access via RBAC) on the PolicyEngine.
  - **Operational risk (Medium):** if an issuer deploys the Standard variant and **forgets to
    attach `PausePolicy`** to the relevant selectors, the token has **no pause capability at all**
    — there is no on-chain fallback. This is documented but is an easy and high-impact
    misconfiguration. The `scripts/preflight.js` check flags selectors with no policy; consider
    extending it to specifically warn when no `PausePolicy` is present on movement/admin selectors.
  - Standard still has `freezePartialTokens`/`forcedTransfer` for amount-level enforcement and
    recovery.

---

## 4. Events

- **ERC-7943**: `Frozen` (on `setFrozenTokens`/unfreeze) and `ForcedTransfer` emitted by CMTAT’s
  `ERC20EnforcementModuleInternal`. Order on forced transfer is spec-correct (§1). ✅
- **Custom policy**: `TransferValidationPolicy` emits `RulesUpdated` on `setRules`; rule mocks
  (`MaxAmountRule`, `RestrictedAddressRule`) — `RestrictedAddressRule.setRestricted` is owner-gated
  but **emits no event**. Minor: a `RestrictionUpdated(account,status)` event would aid monitoring
  (these are example/mocks, so low priority).
- **Extractors** (`MintBurnExtractor`, `CrossChainMintBurnExtractor`, `ERC20TransferFromExtractor`):
  pure, stateless — no events needed. ✅
- **New uRWA views**: read-only, no events. ✅
- No state-changing function was added in this work stream without an event, except the mock’s
  `setRestricted` noted above.

---

## 5. Tests

**Strong coverage added** (all passing): ERC-7943 conformance (`erc7943Compliance.test.js`),
cross-chain screening, mint/burnFrom screening, and integration tests for `SecureMintPolicy`,
`VolumePolicy`, `MaxPolicy`, `VolumeRatePolicy`, `OnlyOwnerPolicy`, `IntervalPolicy`, plus the
preflight (`preflightPolicyCoverage` + `preflightCli`). Each asserts both positive and
negative paths and ties rejections to the concrete `PolicyRunRejected` reason.

**Gaps worth closing (Low):**

1. **Standard real-transfer enforcement:** add a test that an actual `transfer`/`transferFrom` on
   the Standard variant **reverts** (via `runPolicy`) when a screening policy rejects — currently
   only the `canTransfer` view is asserted for Standard.
2. **`forcedTransfer` uRWA event order:** assert `Frozen`-before-`Transfer` (and `ForcedTransfer`)
   on a forced transfer that touches frozen tokens, at the integration level (CMTAT covers it
   upstream, but it is part of the uRWA claim here).
3. **uRWA ↔ reality consistency:** a test asserting `canTransfer(from,to,x) == false` **and** the
   matching real transfer reverts (and the `true` case succeeds), for both variants, would lock in
   the “faithful preview” property.
4. **`MintBurnExtractor.burn(uint256)` self-burn screening** is exercised at the extractor level
   but not end-to-end (self-burn is not wired to a screening policy in the demo). Optional.

---

## 6. Findings summary

| #   | Sev      | Area     | Finding                                                                                                                                        |
| --- | -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | ✅ Fixed | ERC-1404 | `detectTransferRestriction`/`…From` now consult the engine and return code `200` on rejection (was M-1)                                        |
| 2   | Medium   | Pause    | Standard variant has no on-chain pause/account-freeze; forgetting `PausePolicy` leaves no pause fallback                                       |
| 3   | Low      | uRWA     | Standard `canSend`/`canReceive` are constant `true` (no account-level KYC on token); `canTransfer` authoritative — documented                  |
| 4   | Low      | uRWA     | `canTransfer` maps any `check()` revert to `false`, so a real rejection and a misconfiguration are indistinguishable in the boolean view (M-4) |
| 5   | Low      | Tests    | No direct test of Standard real-transfer `runPolicy` rejection; no integration assertion of `forcedTransfer` event order                       |
| 6   | Info     | Events   | `RestrictedAddressRule.setRestricted` (mock) emits no event                                                                                    |

## 7. Recommended actions

1. Decide ERC-1404 stance: either make the detect path engine-aware, or document it as a partial
   predictor (and point integrators to `canTransfer`). (Finding 1)
2. Extend `scripts/preflight.js` to warn when no `PausePolicy` is attached on the Standard
   variant’s movement/admin selectors. (Finding 2)
3. Add the three transfer/forcedTransfer tests in §5 to lock behavior and the uRWA preview
   property. (Finding 5)
4. Keep the documented caveats for Findings 3–4; optionally add an event to the example rule.

**Bottom line:** the ERC-7943 work, screening extractors, and policy tests are correctly
implemented and consistent with the real enforcement path. The open items are a known ERC-1404
divergence, a Standard-variant pause operational risk, and a few targeted test additions — none
block correctness, but Findings 1–2 deserve an explicit decision before a production issuance on
an audited CMTAT release.
