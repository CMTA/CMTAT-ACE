# Slither Report Feedback (v0.2.0)

Here is the list of report performed with [Slither](https://github.com/crytic/slither).

```bash
slither . --checklist --filter-paths "openzeppelin-contracts|test|forge-std|mocks" > doc/audits/tools/v0.2.0/slither-report.md
```

| Version | Report                                          | Assessment                                               |
| ------- | ----------------------------------------------- | -------------------------------------------------------- |
| v0.2.0  | `doc/audits/tools/v0.2.0/slither-report.md`     | `doc/audits/tools/v0.2.0/slither-report-feedback.md`     |

Report scope: repo-focused filtered checklist run.

0 High · 11 Medium · 8 Low · 22 Informational

| ID  | Finding               | Instances | Assessment                                                                                                                |
| --- | --------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------- |
| M-1 | `uninitialized-local` | 11        | False positive. The extractors declare locals (`from`/`to`/`amount`/…) then assign them per selector branch; every branch either assigns or reverts, and where a value is intentionally `0` (e.g. `from` for a mint, `to` for a burn) the zero-default is the intended value. |
| L-1 | `calls-loop`          | 8         | Accepted by design — policy/rule chains iterate over external calls (`TransferValidationPolicy` over `IRule`s, the engine over policies). Monitor gas/complexity. |
| I-1 | `assembly`            | 1         | Expected — ERC-7201 namespaced-storage slot pointer (`$.slot := STORAGE_LOCATION`). Informational. |
| I-2 | `dead-code`           | 1         | False positive. |
| I-3 | `naming-convention`   | 20        | Style-only informational findings. |

## Delta from v0.1.0

- **`reentrancy-no-eth` (Medium, 3) and `reentrancy-events` (Low, 2) are gone** — no longer reported.
- `uninitialized-local` rose 6 → 11: same false-positive pattern, now covering the added
  `CrossChainMintBurnExtractor` and the extended `MintBurnExtractor` (it now also emits `from`/`to`).
- `assembly` 2 → 1, `dead-code` 2 → 1, `naming-convention` 23 → 20.

## Executive triage

- Scan is focused on repo-owned contracts (OpenZeppelin/test/forge-std/mocks filtered out).
- No confirmed exploitable vulnerability is established from the checklist output.
- The only Medium (`uninitialized-local`) is a known analyzer limitation on the extractor
  decode pattern (intentional zero-defaults for mint/burn).

## Notes

### `uninitialized-local` in the extractors

- Status: **False positive (intended zero-default values).**
- Optional cleanup: explicitly initialize the locals (`address from = address(0);` etc.) in
  `MintBurnExtractor`, `CrossChainMintBurnExtractor`, and `ERC20TransferFromExtractor`. This is
  cosmetic — it silences the detector and documents the intent — but is not required and would
  require regenerating this report.

### Informational categories

- `assembly`, `dead-code`, `naming-convention` — non-blocking quality signals.
