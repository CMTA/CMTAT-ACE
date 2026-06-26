# CHANGELOG

All notable changes to this project will be documented in this file.

Please follow [https://changelog.md](https://changelog.md) conventions and the other conventions below

## Semantic Version 2.0.0

Given a version number MAJOR.MINOR.PATCH, increment the:

1. MAJOR version when the new version makes:
   - Incompatible proxy **storage** change internally or through the upgrade of an external library (OpenZeppelin)
   - A significant change in external APIs (public/external functions) or in the internal architecture
2. MINOR version when the new version adds functionality in a backward compatible manner
3. PATCH version when the new version makes backward compatible bug fixes

See [https://semver.org](https://semver.org)

## Type of changes

- `Added` for new features.
- `Changed` for changes in existing functionality.
- `Deprecated` for soon-to-be removed features.
- `Removed` for now removed features.
- `Fixed` for any bug fixes.
- `Security` in case of vulnerabilities.

Reference: [keepachangelog.com/en/1.1.0/](https://keepachangelog.com/en/1.1.0/)

Custom changelog tag: `Dependencies`, `Documentation`, `Testing`

## [0.3.0] - 2026/06/26

Branch: `audit`

Security-hardening release addressing the **Nethermind AuditAgent** review (`doc/audits/tools/v0.2.0/nethermind-audit-agent/`)
and the **Claude security audit** ([`doc/audits/tools/v0.2.0/claude-audit/CLAUDE_AUDIT.md`](doc/audits/tools/v0.2.0/claude-audit/CLAUDE_AUDIT.md)).
All changes are backward compatible (no storage/API break). `version()` now reports `0.3.0`.

### Security

- **Stateful transfer rules are now enforced (NM-2).** `TransferValidationPolicy` previously validated only with the view `detectTransferRestriction*` and never invoked the state-mutating `IRule.transferred()` hook, so stateful rules (rolling-window caps, per-period counters) were never advanced and could be bypassed by repeated transfers. A new `postRun` now calls `transferred()` per rule on the state path (never on the read-only `check()` preview), mirroring CMTAT's `RuleEngine.transferred`.
- **`burnAndMint` is screened in the Lite variant (NM-7).** The multiplexer ran the engine under its own (unwired) selector, skipping `IRule` screening under `defaultAllow=true`. The Lite token now screens each leg under its canonical selector (`burn(address,uint256)` / `mint(address,uint256)`) with empty context, before delegating.
- **Primary burn selector is screenable (NM-4).** `MintBurnExtractor` (`1.2.0`) now handles `burn(address,uint256)` (`0x9dc29fac`), the BURNER_ROLE operator burn — closing a screening gap and a DoS-if-wired.
- **Standard `canSend`/`canReceive` carry a compliance signal (NM-8).** They now query the PolicyEngine (read-only `check`, revert→`false`) under dedicated `canSend(address)`/`canReceive(address)` selectors, so a wired account-level policy (e.g. ACE `OnlyAuthorizedSenderPolicy`) is reflected. Opt-in and backward compatible (unwired ⇒ `defaultAllow` decides).
- **Privileged overloads/multiplexers are gated in the canonical wiring (NM-3 / VULN-1 deployment remediation).** The Standard variant is policy-authoritative *by design* (contract unchanged); the reference wiring in `test/deploymentUtils.js` and `scripts/demo.js` now gates `mint(address,uint256,bytes)`, `burn(address,uint256,bytes)`, `batchMint`, `batchTransfer`, `batchBurn`, and `burnAndMint` (same role as the base op), closing the unprivileged-mint/theft footgun on the as-shipped deployment.
- **Preflight derives selectors from the token ABI (VULN-3).** `scripts/preflight.js` no longer relies on a hand-maintained catalogue; `deriveOperations()` enumerates every privileged selector (incl. overloads/multiplexers) so an unwired one is flagged before launch.
- NM-9 (zero PolicyEngine on Standard) was verified as a **false positive** — the base `_validatePolicyEngine` enforces a non-zero engine; no change.

### Changed

- `TransferValidationPolicy`: added `postRun` (state-path `transferred` enforcement); `run` stays the `view` veto required for the `check()`/`canTransfer` preview.
- `CCTCommon.canSend`/`canReceive` query the PolicyEngine; `canTransfer`/`canTransferFrom` therefore reflect account-level eligibility too.
- Lite ERC-1404 `_detectTransferRestriction` delegates to CMTAT's clamped `ERC20EnforcementModuleInternal._checkActiveBalance` (NM-5).
- Lite batch operations (`batchMint`/`batchBurn`/`batchTransfer`) screen each item with **empty** PolicyEngine context, matching ACE's reference tokens (NM-6).
- Lite `_mintOverride`/`_burnOverride`/`_minterTransferOverride` delegate to `CMTATBaseCommon` instead of re-implementing it (removes duplicated logic; `_minterTransferOverride` now uses `_msgSender()` as CMTAT does).
- `scripts/preflight.js`: coverage loop driven by the ABI-derived selector set.

### Added

- `deriveOperations()` in `scripts/preflight.js` (ABI-derived privileged-selector enumeration).
- Stateful mock rules `CumulativeCapRule` and `TransferredEnforcedCapRule` (the latter enforces solely in `transferred`, the CMTAT pattern) in `TransferRuleMocks.sol`.
- `MintBurnExtractor` `burn(address,uint256)` branch.

### Fixed

- **ERC-1404 `detectTransferRestriction*` no longer reverts** when frozen tokens exceed balance (NM-5): the hand-rolled `balanceOf − frozenTokens` underflow-panicked; replaced by the clamped CMTAT helper, restoring the "MUST NOT revert" contract.

### Documentation

- **`doc/DEPLOYMENT.md`** — new deployment guide (how the scripts work, risks, selector-coverage checklist, preflight), linked from the README.
- README: **Security Considerations** (policy-authoritative model, `defaultPolicyAllow`) and **TransferValidationPolicy → run vs postRun** sections.
- Developer feedback for the Nethermind AuditAgent report (`doc/audits/tools/v0.2.0/nethermind-audit-agent/audit_agent_report-feedback.md`).

### Testing

- New suites: `statefulRuleTransferred`, `batchContext`, `burnAndMintScreening`, `canSendReceivePolicy`, `mintBurnExtractor`, `erc1404FrozenUnderflow`, `liteMintBurnDelegation`, `preflightAbiCompleteness`, and `auditAccessControlBypass` (converted to a regression that the unprivileged bypass is now blocked). Full suite green.

## [0.2.0] - 2026/06/24

Commit: `e4717f3ae0a240e6c584f833f35cb57b8eb0d8f3`

Branch: `update-v3.3.0` (CMTAT v3.3.0 integration)

### Dependencies

- Migrated to **CMTAT v3.3.0**: adopted the re-architected base modules (renumbered `*_CMTATBase*`), replaced the external Snapshot/Document engines with in-contract **ERC-1643 documents** (`DocumentERC1643Module`).
- Integrated **Chainlink ACE v1.1.1**.

### Added

- **ERC-7943 (uRWA) conformance** on both variants: advertises the fungible interface id `0x3edbb4c4` and implements `canTransfer` / `canSend` / `canReceive` plus the enforcement surface (`forcedTransfer`, `setFrozenTokens`, `getFrozenTokens`).
- **Cross-chain and mint/burn screening (FEEDBACK H-1)**: new `CrossChainMintBurnExtractor` maps `crosschainMint` / `crosschainBurn` into the `[from, to, amount]` layout so the same `IRule` sanctions/KYC rules that guard transfers also screen cross-chain issuance/redemption and `mint` / `burnFrom`; wired into the demo.
- **PolicyEngine-aware ERC-1404 view (Lite)**: `detectTransferRestriction` / `detectTransferRestrictionFrom` return code **`7`** (`"PolicyEngine:transferRejected"`) when the engine would reject; module-level codes take precedence and the view never reverts.
- **Policy preflight check** (`scripts/preflight.js`, FEEDBACK H-2): reconstructs the effective `defaultAllow` and attachment state from on-chain events and exits non-zero if the token would be bricked, with a CLI and a PausePolicy-coverage warning.
- **Compliance policy integration tests** for `SecureMintPolicy`, `VolumePolicy`, `MaxPolicy`, `VolumeRatePolicy`, `OnlyOwnerPolicy`, `IntervalPolicy`.
- `RestrictedAddressRule` now emits `RestrictionUpdated` (deploy + `setRestricted`); `ZeroRuleAddress` custom error on `TransferValidationPolicy`.
- `CCTVersionModule`: exposes the CMTAT-ACE integration release via `version()` (overrides CMTAT's `VersionModule`), reporting `0.2.0` on both variants.
- Commit Message Policy added to `AGENTS.md` / `CLAUDE.md`.

### Changed

- **PolicyEngine is now detachable on Lite only**: an admin (`DEFAULT_ADMIN_ROLE`) may set the engine to `address(0)` (disabling ACE validation while CMTAT-native validation stays in force). Standard keeps the non-zero requirement because its access control is policy-authoritative.
- `TransferValidationPolicy` now uses the **RuleEngine `IRule`** interface (dropping the CMTAT mock `IRule`), so policy and rules share one interface.
- Mock `IRule` `transferred()` hooks now **enforce** (revert on rejection) instead of being no-ops.
- Mock contracts use custom errors with `require` instead of revert strings.

### Removed

- SnapshotEngine integration (superseded by in-contract ERC-1643 documents).
- Unreachable zero-engine branch in `CCTCommon._canTransferWithPolicyEngine` (documented the non-zero invariant).
- Dead `__CMTAT_modules_init_unchained` wrapper in the Lite base.

### Fixed

- Input-parameter validation on the transfer policy.

### Security

- Addressed issuer-review findings **H-1** (screen cross-chain mint/burn and `mint` / `burnFrom` with the configured transfer rules) and **H-2** (deployment preflight that fails closed on a bricked configuration).

### Documentation

- Expanded README: introduction, Compliance Policies section, ERC-7943 support, License section (MPL-2.0 plus BUSL-1.1 files), per-role permissions table (Lite), PolicyEngine detach behavior, and how to reuse CMTA `Rules` via `TransferValidationPolicy` or a RuleEngine-as-`IPolicy` wrapper.
- Updated static-analysis reports and feedback to **v0.2.0** (Slither, Aderyn).

### Testing

- Raised coverage with extractor unit tests (`ERC20TransferFromExtractor`, `CrossChainMintBurnExtractor` — both selectors plus `UnsupportedSelector`), 100% on `TransferRuleMocks`, the `canSend` / `canReceive` short-circuit branches, the `IPolicyProtected` `supportsInterface` operand, and `CCTCommon.canTransferFrom` / `_minterTransferOverride`.

## [0.1.0] - 2026/05/24

Commit: `99c9e2441e6dec00d47ccf50bc8f0092e5b163c9`

### Added

- Initial release of **CMTAT-ACE**, integrating CMTAT modules with Chainlink ACE PolicyEngine.
- Two deployment variants:
  - **Standard**: policy-authoritative access and compliance through ACE `runPolicy`.
  - **Lite**: CMTAT role-based module access control with ACE-based transfer validation.
- Core tokenization and compliance modules under:
  - `contracts/modules/standard/`
  - `contracts/modules/lite/`
  - `contracts/modules/chainlink-ace/custom/`
  - `contracts/modules/chainlink-ace/modified/`
- Deployment flows for standalone, upgradeable, and UUPS variants.
- Automated test suite covering deployment, policy integration, and transfer validation behavior.
