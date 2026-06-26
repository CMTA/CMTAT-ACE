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

## Findings that WERE fixed (AI review + internal audit) — v0.3.0

The substantive findings came from the Nethermind AuditAgent review and the internal audit, and are addressed in
the v0.3.0 release (see `CHANGELOG.md` and the feedback files):

- **NM-2** — `TransferValidationPolicy` now enforces stateful `IRule.transferred()` via `postRun` (was bypassable). *Fixed.*
- **NM-7** — Lite `burnAndMint` screens each leg under its canonical `mint`/`burn` selector. *Fixed.*
- **NM-4** — `MintBurnExtractor` supports the primary `burn(address,uint256)` selector. *Fixed.*
- **NM-5** — ERC-1404 `detectTransferRestriction*` no longer reverts when frozen > balance. *Fixed.*
- **NM-6** — batch operations screen each item with empty PolicyEngine context. *Fixed.*
- **NM-8** — Standard `canSend`/`canReceive` query the PolicyEngine (account-level signal). *Fixed.*
- **NM-3 / VULN-1** — Standard variant is policy-authoritative *by design* (contract unchanged); the canonical
  reference wiring now gates every privileged overload/multiplexer, and the **ABI-derived preflight (VULN-3)**
  flags any unwired privileged selector. *Remediated at the deployment layer.*
- **NM-9** — confirmed **false positive** (the Standard variant enforces a non-zero PolicyEngine).

## Operating guidance

The Standard variant's safety is a property of the **deployment configuration** (it delegates authorization to
the PolicyEngine). Always run the [policy preflight check](../../README.md#policy-preflight-check) — which derives
the privileged-selector set from the token ABI — and follow the [Deployment Guide](../DEPLOYMENT.md) before going
live. See also the README [Security Considerations](../../README.md#security-considerations).
