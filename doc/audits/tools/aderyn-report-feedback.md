# Aderyn Report Feedback

Here is the list of report performed with [Aderyn](https://github.com/Cyfrin/aderyn)

```bash
aderyn -x mocks --output doc/audits/tools/aderyn-report.md
```

| Version | Report | Assessment |
| --- | --- | --- |
| current | `doc/audits/tools/aderyn-report.md` | `doc/audits/tools/aderyn-report-feedback.md` |

Report scope: 17 Solidity files, 959 nSLOC.

2 High · 10 Low

| ID | Finding | Instances | Assessment |
| --- | --- | --- | --- |
| H-1 | Arbitrary `from` passed to `transferFrom` | 1 | Accepted in context — policy-gated flow; not treated as exploitable in this integration design. |
| H-2 | Contract locks Ether without withdraw | 2 | Accepted false positive — token deployments are not intended as ETH custody contracts. |
| L-1 | Centralization risk | 11 | Accepted by design — privileged governance/control is intentional. |
| L-2 | Costly operations inside loop | 2 | Accepted — expected tradeoff in policy/rule iteration paths. |
| L-3 | Empty block | 22 | Accepted by design — authorization hook pattern. |
| L-4 | Literal instead of constant | 2 | Informational — optional quality improvement. |
| L-5 | PUSH0 opcode | 15 | Environment-dependent informational; not a direct vulnerability finding in this deployment context. |
| L-6 | Loop contains `require`/`revert` | 4 | Accepted by design — atomic validation and explicit failure signaling. |
| L-7 | Unsafe ERC20 operation | 7 | Accepted false positive — primarily selector/module-flow usage, not unsafe token transfer wrappers. |
| L-8 | Unspecific Solidity pragma | 15 | Accepted by design — version ranges are intentionally used in this codebase. |
| L-9 | Unused state variable | 1 | False positive — `STORAGE_LOCATION` is used via inline assembly in `_getStorage()`. |


## Executive triage

- Total findings reported: **12** (2 High, 10 Low)
- Immediate action items in this repo: **none classified as confirmed exploitable vulnerabilities**
- Main status: **mostly false positives, design choices, or dependency-level noise**

## High findings

### H-1: Arbitrary `from` passed to `transferFrom`

- Location: `contracts/modules/lite/CCTCMTATBaseERC20CrossChain.sol`
- Status: **Accepted / not a vulnerability in this context**
- Rationale: this call path is policy-gated through ACE + CMTAT authorization flow; this is expected ERC20/CMTAT behavior and not an unguarded arbitrary transfer primitive.

### H-2: Contract locks Ether without withdraw

- Location: UUPS deployment contracts
- Status: **Accepted false positive**
- Rationale: these token deployments are not designed to custody native ETH; no payable business flow requires ETH withdrawal.

## Low findings (grouped)

### L-1 (centralization), L-8 (pragma), L-2/L-3/L-4/L-5/L-6

- Status: **Informational / accepted**
- Rationale: these are style/governance/design heuristics and do not by themselves indicate exploitable defects in this integration.

### L-7: Unsafe ERC20 operation

- Status: **Accepted false positive**
- Rationale: flagged sites are interface selectors/existing token-module flows, not unsafe raw token transfer integrations requiring `SafeERC20` wrappers.

### L-9: Unused state variable

- Status: **False positive**
- Rationale: flagged constant `STORAGE_LOCATION` is consumed in inline assembly (`_getStorage()`), which static analyzers may miss.


## Recommended follow-up

1. Document `L-8` as an inline-assembly false positive in audit triage notes.
2. Continue prioritizing repo-owned paths over dependency findings in audit triage.