# Aderyn Report Feedback (v0.2.0)

Here is the list of report performed with [Aderyn](https://github.com/Cyfrin/aderyn).

```bash
aderyn -x mocks --output doc/audits/tools/v0.2.0/aderyn-report.md
```

| Version | Report                                        | Assessment                                             |
| ------- | --------------------------------------------- | ------------------------------------------------------ |
| v0.2.0  | `doc/audits/tools/v0.2.0/aderyn-report.md`    | `doc/audits/tools/v0.2.0/aderyn-report-feedback.md`    |

Report scope: 902 nSLOC.

2 High · 8 Low

| ID  | Finding                                   | Instances | Assessment                                                                                          |
| --- | ----------------------------------------- | --------- | --------------------------------------------------------------------------------------------------- |
| H-1 | Arbitrary `from` passed to `transferFrom` | 1         | Accepted in context — policy-gated flow; not an unguarded arbitrary-transfer primitive.             |
| H-2 | Contract locks Ether without withdraw     | 3         | Accepted false positive — token deployments are not intended as ETH custody contracts.              |
| L-1 | Centralization Risk                       | 11        | Accepted by design — privileged governance/control is intentional (gate behind timelock/multisig).  |
| L-2 | Unsafe ERC20 Operation                    | 9         | Accepted false positive — primarily selector/module-flow usage, not unsafe token-transfer wrappers. |
| L-3 | Unspecific Solidity Pragma                | 17        | Accepted by design — version ranges are intentionally used in this codebase.                        |
| L-4 | PUSH0 Opcode                              | 17        | Environment-dependent informational finding for this EVM target.                                    |
| L-5 | Empty Block                               | 21        | Accepted by design — authorization-hook pattern (`_authorizeX() {}`).                                |
| L-6 | Loop Contains `require`/`revert`          | 4         | Accepted by design — atomic validation and explicit failure signaling.                              |
| L-7 | Unused State Variable                     | 1         | False positive — `STORAGE_LOCATION` is used via inline assembly in `_getStorage()` (ERC-7201).      |
| L-8 | Costly operations inside loop             | 2         | Accepted — expected tradeoff in policy/rule iteration paths.                                         |

## Delta from v0.1.0

- **"Unused Import" (9) and "Literal Instead of Constant" (2) are gone** — cleaned up.
- `H-2` instances 2 → 3, `Unsafe ERC20 Operation` 7 → 9, `Unspecific Pragma` 15 → 17,
  `PUSH0 Opcode` 15 → 17, `Empty Block` 22 → 21. nSLOC 959 → 902.

## Executive triage

- Total findings: **10** (2 High, 8 Low).
- No item is classified as a confirmed exploitable vulnerability.
- Status: **mostly false positives, intentional design choices, or environment/dependency noise.**

## Notes

- **H-1 / H-2**: `transferFrom` path is policy-gated; the contracts are not ETH custodians.
- **L-1 (Centralization)**: intentional; mitigate operationally (timelock + multisig on the
  owner / `DEFAULT_ADMIN_ROLE` / PolicyEngine owner).
- **L-3 / L-4 (pragma / PUSH0)**: deliberate version-range pragma and EVM-target choices.
- **L-5 (Empty Block)**: CMTAT/ACE authorization hooks are intentionally empty.
- **L-7 (Unused State Variable)**: false positive; `STORAGE_LOCATION` is referenced only inside the
  `assembly` block of `_getStorage()`, which static analysis does not trace.
