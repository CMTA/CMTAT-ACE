# Security Overview

This document summarizes the security analysis performed on the CMTAT × Chainlink ACE integration and points to
the detailed reports. It is referenced from the README (Audit Reports Summary).

## Scope

In-scope: the custom integration contracts under `contracts/modules/` (standard / lite / chainlink-ace custom)
and `contracts/deployment/`. Vendored dependencies (`submodules/CMTAT`, `node_modules/@chainlink/ace`, `RuleEngine`)
are trusted dependencies, not re-audited here. The static-analysis runs below for **v0.3.0 deliberately include the
test mock contracts** (`contracts/**/mocks/**`) for completeness; mock-driven findings are called out as such and
do not apply to the production contracts.

## Analyses performed

| Analysis | Type | Report | Assessment |
| -------- | ---- | ------ | ---------- |
| **Slither** v0.3.0 | Static analysis | [`tools/v0.3.0/slither/slither-report.md`](./tools/v0.3.0/slither/slither-report.md) | [feedback](./tools/v0.3.0/slither/slither-report-feedback.md) |
| **Aderyn** v0.3.0 | Static analysis | [`tools/v0.3.0/aderyn/aderyn-report.md`](./tools/v0.3.0/aderyn/aderyn-report.md) | [feedback](./tools/v0.3.0/aderyn/aderyn-report-feedback.md) |
| **Nethermind AuditAgent** (v0.2.0) | AI review | `tools/v0.2.0/nethermind-audit-agent/audit_agent_report_v0.2.0.pdf` | [feedback](./tools/v0.2.0/nethermind-audit-agent/audit_agent_report-feedback.md) |
| **Claude security audit** (v0.2.0) | Claude + custom skills | [`tools/v0.2.0/claude-audit/CLAUDE_AUDIT.md`](./tools/v0.2.0/claude-audit/CLAUDE_AUDIT.md) | — |

Earlier static-analysis runs: `tools/v0.1.0/`, `tools/v0.2.0/`.

## Static analysis result (v0.3.0)

| Tool | High | Medium | Low | Info | Relevant to fix? |
| ---- | ---- | ------ | --- | ---- | ---------------- |
| Slither | 0 | 11 | 10 | 21 | **No** |
| Aderyn | 2 | — | 11 | — | **No** |

**No tool finding requires a code fix.** Every item resolves to one of: a known false positive (extractor
zero-defaults / `uninitialized-local`; `STORAGE_LOCATION` read via ERC-7201 assembly; the `CAN_SEND/RECEIVE`
selector constants flagged only because the override mock is in scope), an intentional design choice
(centralization, `runPolicy` empty auth hooks, policy/rule loops, version-range pragmas), environment noise
(`PUSH0`), mock-only scaffolding (`State Change Without Event`, part of `Empty Block`), or cosmetic style
(naming, literal-vs-constant). The Aderyn "High" items (`arbitrary from`, `Ether lock`) are the long-standing
accepted-context / false-positive findings. See each tool's feedback file for the per-finding disposition.

## Claude security audit (v0.2.0) — findings summary

Performed by Claude with custom audit skills on the v0.2.0 codebase. Full report:
[`tools/v0.2.0/claude-audit/CLAUDE_AUDIT.md`](./tools/v0.2.0/claude-audit/CLAUDE_AUDIT.md).

| ID | Severity | Finding | Status |
| -- | -------- | ------- | ------ |
| VULN-1 | High | Standard variant: unwired privileged overloads/multiplexers (`mint(…,bytes)`, `burnAndMint`, batch*) callable by anyone under `defaultAllow=true` → unlimited mint / theft | Accepted as design (contract policy-authoritative); **deployment remediated** — canonical wiring now gates every privileged selector; ABI-derived preflight + regression test |
| VULN-2 | Medium | `MintBurnExtractor` omits the primary `burn(address,uint256)` (`0x9dc29fac`) selector → screening gap / conditional DoS | **Fixed** |
| VULN-3 | Low | Preflight coverage list omitted overloads/multiplexers → false "fully covered" assurance | **Fixed** — preflight derives the selector set from the token ABI |

## AI review findings & remediation (v0.3.0)

The substantive findings came from the Nethermind AuditAgent review and the Claude security audit, and are
addressed in the v0.3.0 release. Outcome of the AI review: **6 fixed in code, 2 accepted as documented design,
1 informational, 1 false positive**. Full triage:
[`tools/v0.2.0/nethermind-audit-agent/audit_agent_report-feedback.md`](./tools/v0.2.0/nethermind-audit-agent/audit_agent_report-feedback.md).

### Nethermind AuditAgent (v0.2.0) — triage summary

| ID | Finding | Tool sev | Our verdict | Status |
| -- | ------- | -------- | ----------- | ------ |
| NM-1 | Uninitialized proxy hijack via public `initialize()` | High | Informational (not exploitable as deployed) | No code change (docs) |
| NM-2 | `TransferValidationPolicy` never calls stateful `IRule.transferred()` | High | Accepted (High) | **Fixed** |
| NM-3 | Unmapped inherited privileged selectors bypass policy auth (Standard) | Medium | Accepted as design (High; Lite already safe) | No code change; deployment remediated |
| NM-4 | `MintBurnExtractor` lacks `burn(address,uint256)` | Low | Accepted (Medium) | **Fixed** |
| NM-5 | `detectTransferRestriction*` reverts when frozen > balance | Low | Accepted | **Fixed** |
| NM-6 | Context cleared mid-batch breaks batch ops | Low | Accepted | **Fixed** |
| NM-7 | `burnAndMint` bypasses screening in Lite | Low | Accepted (Medium) | **Fixed** |
| NM-8 | Standard `canSend`/`canReceive` always `true` | Info | Fixed (account-level signal added) | **Fixed** |
| NM-9 | `initialize()` accepts zero PolicyEngine (Standard) | Info | **False positive** | Rejected |
| NM-10 | Lite flows only screened if exact selectors wired | Info | Accepted by design | No code change; deployment + preflight |

## Operating guidance

The Standard variant's safety is a property of the **deployment configuration** (it delegates authorization to
the PolicyEngine). Always run the [policy preflight check](../../README.md#policy-preflight-check) — which derives
the privileged-selector set from the token ABI — and follow the [Deployment Guide](../DEPLOYMENT.md) before going
live. See also the README [Security Considerations](../../README.md#security-considerations).
