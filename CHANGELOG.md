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

## [0.2.0] - 2026/06/24

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
