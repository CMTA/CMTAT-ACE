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

## [0.1.0] -

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
