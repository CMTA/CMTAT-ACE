# CMTAT ACE integration project

## Deployment versions

Two versions are available; _lite_ version which substitutes RuleEngine with Chainlink ACE PolicyEngine, and _standard_ version, which uses PolicyEngine to protect state-changing operations instead of OpenZeppelin role-based AccessControl.

### Standard

Replaces CMTAT's `AccessControlUpgradeable` (role-based) with `OwnableUpgradeable` (single owner) and integrates Chainlink ACE `PolicyProtectedUpgradeable` for access control and compliance validation on state-changing operations (mint, burn, transfer, enforcement, admin functions).

| Contract                              | Proxy type         |
| ------------------------------------- | ------------------ |
| `ComplianceTokenCMTATStandalone`      | None               |
| `ComplianceTokenCMTATUpgradeable`     | Transparent        |
| `ComplianceTokenCMTATUUPSUpgradeable` | UUPS (`onlyOwner`) |

### Lite

Keeps CMTAT's `AccessControlUpgradeable` (role-based) for module authorization and adds Chainlink ACE PolicyEngine for transfer validation only, replacing CMTAT's RuleEngine.

| Contract                                  | Proxy type                            |
| ----------------------------------------- | ------------------------------------- |
| `ComplianceTokenCMTATLiteStandalone`      | None                                  |
| `ComplianceTokenCMTATLiteUpgradeable`     | Transparent                           |
| `ComplianceTokenCMTATLiteUUPSUpgradeable` | UUPS (`onlyRole(PROXY_UPGRADE_ROLE)`) |

## Changes from CMTAT

### Access Control

| Aspect          | CMTAT                                    | Standard                                              | Lite                                                 |
| --------------- | ---------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------- |
| Base model      | `AccessControlUpgradeable` with 9+ roles | `OwnableUpgradeable` (single owner)                   | `AccessControlUpgradeable` (unchanged)               |
| Authorization   | `onlyRole(MINTER_ROLE)`, etc.            | `runPolicy` modifier via PolicyEngine                 | `onlyRole()` for modules, PolicyEngine for transfers |
| Role management | `grantRole()` / `revokeRole()`           | Managed externally via `RoleBasedAccessControlPolicy` | CMTAT roles preserved                                |

### Validation & Compliance

| Aspect           | CMTAT                                                 | Standard                                       | Lite                                                            |
| ---------------- | ----------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| Validation layer | `CMTATBaseRuleEngine` → `ValidationModuleRuleEngine`  | `PolicyProtectedUpgradeable` → `IPolicyEngine` | `ValidationModulePolicyEngine` → `IPolicyEngine`                |
| Engine type      | RuleEngine (custom interface)                         | Chainlink ACE PolicyEngine                     | Chainlink ACE PolicyEngine                                      |
| Transfer check   | `_canTransferGenericByModuleAndRevert()` + RuleEngine | PolicyEngine `run()` via `runPolicy` modifier  | `_canTransferGenericByModuleAndRevert()` + PolicyEngine `run()` |
| ERC-1404 support | Via `ValidationModuleERC1404`                         | Not applicable (no module-level checks)        | Via `PolicyValidationModuleERC1404`                             |

### Initialization

The `Engine` struct parameter is replaced with `address policyEngine_`, `ISnapshotEngine snapshotEngine_`, and `IERC1643 documentEngine_`:

```solidity
// CMTAT
constructor(forwarder, admin, ..., ICMTATConstructor.Engine memory engines_)

// ComplianceTokenCMTAT (Standard & Lite)
constructor(admin, ..., address policyEngine_, ISnapshotEngine snapshotEngine_, IERC1643 documentEngine_)
```

ERC-2771 (gasless transaction forwarding) has been removed from all deployment contracts. The standalone contracts no longer take a `forwarderIrrevocable` parameter, and the upgradeable contracts have parameterless constructors.

### Modules

All CMTAT functional modules are preserved in both variants:

- ERC20MintModule, ERC20BurnModule
- ERC20EnforcementModule (freeze/enforcement)
- PauseModule (Standard: `pause()`/`unpause()`/`deactivateContract()` are not exposed on the token — pausing is enforced externally via a PausePolicy on the PolicyEngine which rejects operations when paused; Lite: native `onlyRole(PAUSER_ROLE)`)
- SnapshotEngineModule, DocumentEngineModule
- ExtraInformationModule
- ERC20CrossChainModule, CCIPModule

### Removed from Standard

- `CMTATBaseAccessControl` — replaced by `OwnableUpgradeable`
- `AccessControlModule` — role management removed from contract
- `CMTATBaseRuleEngine` — replaced by `PolicyProtectedUpgradeable`
- `ValidationModuleRuleEngine` — replaced by direct PolicyEngine calls
- All `onlyRole()` authorization functions — replaced by `runPolicy` modifier
- `pause()`, `unpause()`, `deactivateContract()` — not exposed on the token contract; the `_authorizePause` and `_authorizeDeactivate` hooks are intentionally left unimplemented so these functions remain abstract and are excluded from the compiled contract. Pausing is enforced externally via a PausePolicy attached to the PolicyEngine, which rejects protected operations when paused

### Design notes

#### Why `approve()` is not policy-protected

`approve()` is intentionally not gated by `runPolicy` in either variant. An approval by itself does not move tokens — it only sets an allowance. The actual token movement happens via `transferFrom()`, which **is** policy-protected. Protecting `approve()` would add gas overhead without security benefit, since:

1. A malicious or excessive approval has no effect until `transferFrom()` is called, at which point the PolicyEngine validates the transfer.
2. The `ERC20TransferFromExtractor` extracts the `spender` address from `transferFrom()` calls, so policies can restrict which spenders are allowed to move tokens regardless of existing approvals.
3. In the Lite variant, `approve()` is gated by `whenNotPaused` as a convenience (matching upstream CMTAT behavior), but this is not a security-critical check.

### Removed from both variants

- `ERC2771Module` — gasless transaction forwarding is not supported (ACE does not currently support ERC-2771)

### Added

- `PolicyProtectedUpgradeable` — Chainlink ACE integration with ERC-7201 storage, `runPolicy` modifier, and policy engine lifecycle management
- `ValidationModulePolicyEngine` (Lite) — hybrid validation combining CMTAT module checks with PolicyEngine
- `PolicyValidationModuleERC1404` (Lite) — ERC-1404 transfer restriction codes with PolicyEngine awareness
- `TransferValidationPolicy` — Chainlink ACE policy that validates transfers using CMTAT's `IRule` interface (see [TransferValidationPolicy](#transfervalidationpolicy) below)
- `ERC20TransferFromExtractor` — Extractor that produces 4 parameters (`spender`, `from`, `to`, `amount`) for `transfer()` and `transferFrom()`

## TransferValidationPolicy

`TransferValidationPolicy` is a Chainlink ACE policy that bridges CMTAT's `IRule` interface with the PolicyEngine, enabling reuse of existing transfer restriction rules as ACE policies.

### How it works

The policy accepts an array of `IRule` contracts. When the PolicyEngine invokes the policy during a `transfer()` or `transferFrom()`, each rule is evaluated in order. If any rule returns a non-zero restriction code, the policy reverts with `PolicyRejected` containing the rule's human-readable message.

It supports two extractor layouts:

| Extractor                    | Parameters                    | Used by                                                          |
| ---------------------------- | ----------------------------- | ---------------------------------------------------------------- |
| `ERC20TransferExtractor`     | `[from, to, amount]`          | Calls `detectTransferRestriction(from, to, amount)`              |
| `ERC20TransferFromExtractor` | `[spender, from, to, amount]` | Calls `detectTransferRestrictionFrom(spender, from, to, amount)` |

### Mock rules

Two mock `IRule` implementations are provided in `contracts/modules/chainlink-ace/mocks/TransferRuleMocks.sol` for testing and demonstration:

- **`MaxAmountRule`** — Rejects transfers where the amount exceeds a configurable maximum (restriction code `13`)
- **`RestrictedAddressRule`** — Rejects transfers involving addresses on a configurable restricted list (codes `14`/`15` for sender/recipient)

### Setup

1. Deploy the extractor and set it on the PolicyEngine:

```javascript
const extractor = await ethers.deployContract('ERC20TransferFromExtractor');
const transferSelector = cmtat.interface.getFunction('transfer(address,uint256)').selector;
const transferFromSelector = cmtat.interface.getFunction(
  'transferFrom(address,address,uint256)',
).selector;

await policyEngine.setExtractor(transferSelector, await extractor.getAddress());
await policyEngine.setExtractor(transferFromSelector, await extractor.getAddress());
```

2. Deploy rule contracts and the policy:

```javascript
const maxAmountRule = await ethers.deployContract('MaxAmountRule', [1000n]);
const restrictedRule = await ethers.deployContract('RestrictedAddressRule', [[]]);

const configParams = abiCoder.encode(
  ['address[]'],
  [[await maxAmountRule.getAddress(), await restrictedRule.getAddress()]],
);

const policy = await upgrades.deployProxy(
  await ethers.getContractFactory('TransferValidationPolicy'),
  [policyEngineAddress, adminAddress, configParams],
  {
    initializer: 'initialize',
    unsafeAllow: ['constructor', 'missing-initializer', 'missing-initializer-call'],
  },
);
```

3. Register the policy for transfer selectors with parameter names:

```javascript
const PARAM_SPENDER = keccak256(toUtf8Bytes('spender'));
const PARAM_FROM = keccak256(toUtf8Bytes('from'));
const PARAM_TO = keccak256(toUtf8Bytes('to'));
const PARAM_AMOUNT = keccak256(toUtf8Bytes('amount'));

await policyEngine.addPolicy(cmtatAddress, transferSelector, policyAddress, [
  PARAM_SPENDER,
  PARAM_FROM,
  PARAM_TO,
  PARAM_AMOUNT,
]);
await policyEngine.addPolicy(cmtatAddress, transferFromSelector, policyAddress, [
  PARAM_SPENDER,
  PARAM_FROM,
  PARAM_TO,
  PARAM_AMOUNT,
]);
```

4. Rules can be updated at any time by the policy owner:

```javascript
await policy.setRules([newRuleAddress1, newRuleAddress2]);
```

### Writing custom rules

Implement the `IRule` interface to create custom transfer restriction logic:

```solidity
contract MyCustomRule is IRule {
  function detectTransferRestriction(
    address from,
    address to,
    uint256 amount
  ) public view override returns (uint8) {
    // Return 0 for allowed, non-zero for rejected
  }

  function detectTransferRestrictionFrom(
    address spender,
    address from,
    address to,
    uint256 amount
  ) public view override returns (uint8) {
    // Validate spender + transfer params
  }

  function messageForTransferRestriction(
    uint8 code
  ) external pure override returns (string memory) {
    // Return human-readable rejection reason
  }

  // ... canTransfer(), canReturnTransferRestrictionCode()
}
```

## Library

- CMTAT [v3.2.0-rc0](https://github.com/CMTA/CMTAT/releases/tag/v3.2.0-rc0)
- Chainlink ACE ^1.0.0

## Initialize submodules

```shell
git submodule update. --init
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

# Linting & Formatting

## ESLint

Lint JavaScript files (tests, scripts, config):

```shell
npm run lint
```

Auto-fix fixable issues:

```shell
npm run lint:fix
```

## Prettier

Check formatting for JS, JSON, Markdown, and Solidity:

```shell
npm run format:check
```

Auto-format all files:

```shell
npm run format
```

Solidity formatting uses [prettier-plugin-solidity](https://github.com/prettier-solidity/prettier-plugin-solidity) and is scoped to `contracts/**/*.sol` only (submodules and dependencies are excluded).

# Scripts

## Deployment scripts

Individual deployment scripts are available for each contract variant:

| Script                                            | Description                    |
| ------------------------------------------------- | ------------------------------ |
| `scripts/lite/deploy-lite-standalone.js`          | Lite standalone (no proxy)     |
| `scripts/lite/deploy-lite-upgradeable.js`         | Lite transparent proxy         |
| `scripts/lite/deploy-lite-uups.js`                | Lite UUPS proxy                |
| `scripts/standard/deploy-standard-standalone.js`  | Standard standalone (no proxy) |
| `scripts/standard/deploy-standard-upgradeable.js` | Standard transparent proxy     |
| `scripts/standard/deploy-standard-uups.js`        | Standard UUPS proxy            |

Run any script with:

```shell
npx hardhat run scripts/lite/deploy-lite-standalone.js
```

## Demo script

`scripts/demo.js` provides a complete end-to-end deployment of the Standard variant with the full Chainlink ACE policy stack. It deploys and wires together all contracts in the correct order:

1. **PolicyEngine** (proxy) — central policy orchestrator with `defaultAllow = true`
2. **DocumentEngineMock** + **SnapshotEngineMock** — mock engine contracts for document/snapshot support
3. **ComplianceTokenCMTATStandalone** — the token contract, attached to the PolicyEngine and engines
4. **PausePolicy** (proxy) — added to all state-changing selectors (mint, burn, transfer, enforcement, admin)
5. **RoleBasedAccessControlPolicy** (proxy) — added to admin selectors with role-to-selector mappings
6. **MockV3Aggregator** — mock Chainlink reserve price feed (Hardhat network only)
7. **SecureMintPolicy** (proxy) — added to `mint()`, enforces reserve-backed minting via price feed
8. **MintBurnExtractor** — set for `mint()` selector, extracts `account` and `amount` parameters
9. **ERC20TransferExtractor** — set for `transfer()` selector
10. **ERC20TransferFromExtractor** — set for `transferFrom()` selector
11. **MaxAmountRule** + **RestrictedAddressRule** — mock IRule contracts for transfer validation
12. **TransferValidationPolicy** (proxy) — added to `transfer()` and `transferFrom()` with both rules

The script also configures RBAC operation allowances and grants roles (`MINTER_ROLE`, `BURNER_ROLE`, `BURNER_FROM_ROLE`, `ENFORCER_ROLE`, `ERC20ENFORCER_ROLE`, `DOCUMENT_ROLE`, `SNAPSHOOTER_ROLE`) to the admin account.

Policy execution order per function:

- `mint()` → PausePolicy → RBAC → SecureMintPolicy
- `transfer()` / `transferFrom()` → PausePolicy → TransferValidationPolicy
- All other state-changing functions → PausePolicy → RBAC

Run the demo on a local Hardhat network:

```shell
npx hardhat run scripts/demo.js
```

# Static Analysis (Slither)

[Slither](https://github.com/crytic/slither) is a Solidity static analysis framework used to find vulnerabilities and code quality issues.

## Setup

Create and activate a Python virtual environment called `cct`:

```shell
python3 -m venv cct
chmod +x cct/bin/activate
source cct/bin/activate
```

Install Slither inside the virtual environment:

```shell
pip install slither-analyzer
```

Verify the installation:

```shell
slither --version
```

## Running

Slither uses Foundry for compilation. Make sure `forge` is installed and the virtual environment is active:

```shell
source cct/bin/activate
npm run slither
```

This generates timestamped reports in the `reports/` directory:

- **JSON** — `reports/slither-report-<timestamp>.json`
- **Markdown** — `reports/slither-report-<timestamp>.md`

## Deactivating the virtual environment

When done, deactivate the virtual environment:

```shell
deactivate
```
