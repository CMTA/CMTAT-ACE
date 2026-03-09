# CMTAT ACE integration project

## Deployment versions
Two versions are available; *lite* version which substitutes RuleEngine with Chainlink ACE PolicyEngine, and *standard* version, which uses PolicyEngine to protect all external functions instead of OpenZeppelin role-based AccessControl.

### Standard

Replaces CMTAT's `AccessControlUpgradeable` (role-based) with `OwnableUpgradeable` (single owner) and integrates Chainlink ACE `PolicyProtectedUpgradeable` for all access control and compliance validation.

| Contract | Proxy type |
|----------|------------|
| `ComplianceTokenCMTATStandalone` | None |
| `ComplianceTokenCMTATUpgradeable` | Transparent |
| `ComplianceTokenCMTATUUPSUpgradeable` | UUPS (`onlyOwner`) |

### Lite

Keeps CMTAT's `AccessControlUpgradeable` (role-based) for module authorization and adds Chainlink ACE PolicyEngine for transfer validation only, replacing CMTAT's RuleEngine.

| Contract | Proxy type |
|----------|------------|
| `ComplianceTokenCMTATLiteStandalone` | None |
| `ComplianceTokenCMTATLiteUpgradeable` | Transparent |
| `ComplianceTokenCMTATLiteUUPSUpgradeable` | UUPS (`onlyRole(PROXY_UPGRADE_ROLE)`) |

## Changes from CMTAT

### Access Control

| Aspect | CMTAT | Standard | Lite |
|--------|-------|----------|------|
| Base model | `AccessControlUpgradeable` with 9+ roles | `OwnableUpgradeable` (single owner) | `AccessControlUpgradeable` (unchanged) |
| Authorization | `onlyRole(MINTER_ROLE)`, etc. | `runPolicy` modifier via PolicyEngine | `onlyRole()` for modules, PolicyEngine for transfers |
| Role management | `grantRole()` / `revokeRole()` | Managed externally via `RoleBasedAccessControlPolicy` | CMTAT roles preserved |

### Validation & Compliance

| Aspect | CMTAT | Standard | Lite |
|--------|-------|----------|------|
| Validation layer | `CMTATBaseRuleEngine` → `ValidationModuleRuleEngine` | `PolicyProtectedUpgradeable` → `IPolicyEngine` | `ValidationModulePolicyEngine` → `IPolicyEngine` |
| Engine type | RuleEngine (custom interface) | Chainlink ACE PolicyEngine | Chainlink ACE PolicyEngine |
| Transfer check | `_canTransferGenericByModuleAndRevert()` + RuleEngine | PolicyEngine `run()` via `runPolicy` modifier | `_canTransferGenericByModuleAndRevert()` + PolicyEngine `run()` |
| ERC-1404 support | Via `ValidationModuleERC1404` | Not applicable (no module-level checks) | Via `PolicyValidationModuleERC1404` |

### Initialization

The `Engine` struct parameter is replaced with a direct `address policyEngine_`:

```solidity
// CMTAT
constructor(..., ICMTATConstructor.Engine memory engines_)

// ComplianceTokenCMTAT (Standard & Lite)
constructor(..., address policyEngine_)
```

### Modules

All CMTAT functional modules are preserved in both variants:

- ERC20MintModule, ERC20BurnModule
- ERC20EnforcementModule (freeze/enforcement)
- PauseModule (Standard: via PausePolicy; Lite: native)
- SnapshotEngineModule, DocumentEngineModule
- ExtraInformationModule
- ERC20CrossChainModule, CCIPModule
- ERC2771Module (gasless transactions)

### Removed from Standard

- `CMTATBaseAccessControl` — replaced by `OwnableUpgradeable`
- `AccessControlModule` — role management removed from contract
- `CMTATBaseRuleEngine` — replaced by `PolicyProtectedUpgradeable`
- `ValidationModuleRuleEngine` — replaced by direct PolicyEngine calls
- All `onlyRole()` authorization functions — replaced by `runPolicy` modifier

### Added

- `PolicyProtectedUpgradeable` — Chainlink ACE integration with ERC-7201 storage, `runPolicy` modifier, and policy engine lifecycle management
- `ValidationModulePolicyEngine` (Lite) — hybrid validation combining CMTAT module checks with PolicyEngine
- `PolicyValidationModuleERC1404` (Lite) — ERC-1404 transfer restriction codes with PolicyEngine awareness

## Library

- CMTAT [v3.2.0-rc0](https://github.com/CMTA/CMTAT/releases/tag/v3.2.0-rc0)
- Chainlink ACE ^1.0.0

## Initialize submodules
```shell
git submodule update
```

## Install dependencies
You can use any package manager either npm, yarn or pnpm. For example you can type:

```shell
npm install
```

## Compile contracts
To compile

```shell
npx hardhat compile
```

# Testing

To run tests:

```shell
npx hardhat test
```

# Scripts
You can use example scripts to deploy, e.g. for local Hardhat Network deployment:

```shell
npx hardhat run scripts/{script_name}
```