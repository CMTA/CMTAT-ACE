# Aderyn Report Feedback (v0.3.0)

Report performed with [Aderyn](https://github.com/Cyfrin/aderyn) 0.6.5, **mocks included** in scope (no `-x mocks`).

```bash
aderyn --output doc/audits/tools/v0.3.0/aderyn/aderyn-report.md
```

| Version | Report | Assessment |
| ------- | ------ | ---------- |
| v0.3.0  | `doc/audits/tools/v0.3.0/aderyn/aderyn-report.md` | `doc/audits/tools/v0.3.0/aderyn/aderyn-report-feedback.md` (this file) |

Scope: 1324 nSLOC **including** `contracts/**/mocks/**` (inflates nSLOC and several categories vs. a non-mock run).

**2 High · 11 Low**

## Summary

| ID | Finding | Instances | Assessment |
| --- | --- | --- | --- |
| H-1 | Arbitrary `from` passed to `transferFrom` | 1 | **Accepted in context** — policy-gated flow; not an unguarded arbitrary-transfer primitive (same as v0.2.0). |
| H-2 | Contract locks Ether without withdraw | 3 | **False positive** — token contracts, not ETH custody. |
| L-1 | Centralization Risk | 12 | **By design** — privileged governance is intentional (gate behind timelock/multisig). |
| L-2 | Unsafe ERC20 Operation | 9 | **False positive** — selector/module-flow usage, not unsafe token-transfer wrappers. |
| L-3 | Unspecific Solidity Pragma | 21 | **By design** — version ranges are intentional. |
| L-4 | Literal Instead of Constant | 4 | **Cosmetic** — `parameters.length == 3 / == 4` is the `IRule` 3-param/4-param layout branch in `TransferValidationPolicy` (plus mock literals); these are inherent layout sizes, not magic constants. Optional. |
| L-5 | PUSH0 Opcode | 21 | **Environment-dependent** informational (EVM target). |
| L-6 | Modifier Invoked Only Once | 1 | **Cosmetic** style. |
| L-7 | Empty Block | 37 | **By design** — authorization-hook pattern (`_authorizeX() {}`); count inflated by mocks. |
| L-8 | Loop Contains `require`/`revert` | 4 | **By design** — atomic validation / explicit failure signalling. |
| L-9 | Unused State Variable | 1 | **False positive** — `TransferValidationPolicy.STORAGE_LOCATION` is read via inline assembly in `_getStorage()` (ERC-7201); Aderyn explicitly notes it does not trace assembly. |
| L-10 | Costly operations inside loop | 2 | **By design** — expected tradeoff in policy/rule iteration paths. |
| L-11 | State Change Without Event | 10 | **Mock-only** — all 10 instances are in `contracts/modules/chainlink-ace/mocks/*` (`CanSendReceiveOverrideMock`, `PolicyProtectedUpgradeableMocks`, `TransferRuleMocks`), present only because `-m` includes mocks; test scaffolding needs no events. |

## Delta from v0.2.0

- **Mocks now in scope** (`-m`): nSLOC 902 → **1324**; `Empty Block` 21 → 37, `Unsafe ERC20` rises, and the new
  **`L-11 State Change Without Event` (10)** is **entirely** mock setters/overrides. None apply to production code.
- **New `L-4 Literal Instead of Constant` (4)** — mostly the `parameters.length == 3/4` branch added/extended by
  `TransferValidationPolicy.postRun` (NM-2). Cosmetic.
- `L-6 Modifier Invoked Only Once` (1) — minor, new.
- H-1/H-2 unchanged in disposition.

## Executive triage

- **No relevant finding to fix.** The two Highs are the long-standing accepted-context / false-positive items;
  all Lows are by-design, environment noise, mock-only, or cosmetic.
- Because mocks are intentionally in scope for this run, the **mock-driven** items (`L-11`, part of `L-7`, part of
  `L-4`) should be read as test-scaffolding noise, not production findings.
