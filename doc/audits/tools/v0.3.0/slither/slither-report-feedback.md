# Slither Report Feedback (v0.3.0)

Report performed with [Slither](https://github.com/crytic/slither) 0.11.5, **mocks included** in scope.

```bash
slither . --checklist --filter-paths "node_modules,submodules,test,forge-std" \
  > doc/audits/tools/v0.3.0/slither/slither-report.md
```

| Version | Report | Assessment |
| ------- | ------ | ---------- |
| v0.3.0  | `doc/audits/tools/v0.3.0/slither/slither-report.md` | `doc/audits/tools/v0.3.0/slither/slither-report-feedback.md` (this file) |

Scope: repo `contracts/` **including** `**/mocks/**` (filtered out: `node_modules`, `submodules`, `test`, `forge-std`).

**0 High · 11 Medium · 10 Low · 21 Informational**

## Summary

| Detector | Severity | Instances | Assessment |
| --- | --- | --- | --- |
| `uninitialized-local` | Medium | 11 | **False positive.** The extractors declare `from`/`to`/`amount`/`account` then assign them per selector branch; every branch assigns or reverts, and where a value is intentionally `0` (mint `from`, burn `to`) the zero-default is the intended value. |
| `calls-loop` | Low | 10 | **Accepted by design.** Policy/rule chains iterate over external calls (`TransferValidationPolicy` over `IRule`s, the engine over policies). Monitor gas/complexity. |
| `assembly` | Informational | 1 | **Expected.** ERC-7201 namespaced-storage slot pointer (`$.slot := STORAGE_LOCATION`). |
| `naming-convention` | Informational | 18 | **Style-only.** |
| `unused-state` | Informational | 2 | **False positive (mock-inclusion artifact).** `CCTCommon.CAN_SEND_SELECTOR` / `CAN_RECEIVE_SELECTOR` are used by `CCTCommon.canSend`/`canReceive` (→ `_canAccountWithPolicyEngine`). Slither flags them "never used in `CanSendReceiveOverrideMock`" because that **mock overrides** `canSend`/`canReceive`; the constants are used by the real `ComplianceTokenCMTAT*` contracts. Only appears because mocks are in scope. |

## Delta from v0.2.0

- New **`unused-state` (2)** — solely a consequence of (a) the v0.3.0 `canSend`/`canReceive` PolicyEngine query
  (NM-8), which introduced `CAN_SEND_SELECTOR`/`CAN_RECEIVE_SELECTOR`, and (b) including the
  `CanSendReceiveOverrideMock` in scope (it overrides those views). False positive.
- `calls-loop` 8 → 10 and `naming-convention` 20 → 18 — movement consistent with the new
  `TransferValidationPolicy.postRun` rule loop (NM-2) and added mocks; nothing material.
- `uninitialized-local` unchanged at 11 (same intended extractor zero-default pattern).

## Executive triage

- **0 High; no relevant finding to fix.** Every item is a known false positive, an intentional design pattern, or
  style. The two new `unused-state` informational hits are an artifact of analysing the override mock.
- Optional cleanup (not required): explicitly initialise the extractor locals (`address from = address(0);`) to
  silence `uninitialized-local`; this is cosmetic and would only document intent.
