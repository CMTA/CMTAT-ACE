# AGENTS Guidelines

## Sync Policy (Mandatory)

- `AGENTS.md` and `CLAUDE.md` must always contain exactly the same content.
- Any edit to one file must be mirrored in the other file in the same change.

## Testing Policy (Mandatory)

- Always add or update automated tests for every new feature, behavior change, bug fix, or security hardening change.
- A code change is not complete unless tests validating the change are included in the same PR/commit series.
- At minimum, include:
  - positive-path test(s),
  - negative-path/revert test(s) when applicable,
  - event assertion(s) when state changes emit events.
- Run relevant tests locally before finalizing changes. If a full suite cannot be run, clearly state what was run and what was skipped.

## Commit Message Policy

- After each implemented feature or fix, provide a one-line GitHub commit message for all changes since the last commit.

## Codebase Summary

- This repository integrates **CMTA CMTAT** token modules with **Chainlink ACE PolicyEngine**.
- There are two deployment variants:
  - **Standard**: policy-authoritative access/compliance via ACE (`runPolicy`) with `OwnableUpgradeable`.
  - **Lite**: keeps CMTAT role-based module access control and uses ACE mainly for transfer validation.
- Core custom contracts are under:
  - `contracts/modules/standard/`
  - `contracts/modules/lite/`
  - `contracts/modules/chainlink-ace/custom/`
  - `contracts/modules/chainlink-ace/modified/`
- Tests are primarily under `test/`, with transfer-policy coverage in `test/custom/transferValidationPolicy.test.js`.
- External dependencies are vendored as git submodules in `submodules/` (notably `CMTAT`, `chainlink-ace`, and `RuleEngine`).
