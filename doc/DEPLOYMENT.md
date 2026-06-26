# Deployment Guide — CMTAT × Chainlink ACE

This guide explains how the deployment scripts in `scripts/` work, the risks to be aware of, and the points you
**must** get right when you use them — or write your own — to deploy a compliant, non-bricked token.

> ⚠️ The scripts in `scripts/standard/`, `scripts/lite/` and `scripts/demo.js` are **examples**. They are not
> production-hardened. Read this whole guide, and always run the [preflight check](#7-verify-with-the-preflight-check)
> against your final configuration before going live.

## 1. What gets deployed

A working deployment is **two layers**: the contracts, and the **PolicyEngine configuration** that gates them.
Deploying the contracts is the easy 10%; wiring the policies/selectors correctly is the 90% that determines
whether your token is secure and whether it even works.

| Component | Role |
|-----------|------|
| **PolicyEngine** (ACE) | Central gate. Holds, per `(token, selector)`, the list of policies to run, and a `defaultPolicyAllow` flag. |
| **ComplianceToken** (Standard or Lite) | The token. Routes privileged ops to the engine. |
| **Policies** | `PausePolicy`, `RoleBasedAccessControlPolicy` (RBAC), `TransferValidationPolicy` (wraps CMTA `IRule`s), `SecureMintPolicy`, … |
| **Extractors** | Decode a function's calldata into the named parameters a policy expects (`MintBurnExtractor`, `ERC20TransferFromExtractor`, `CrossChainMintBurnExtractor`, …). |

## 2. The scripts in this repo

- **`scripts/standard/deploy-standard-{standalone,upgradeable,uups}.js`** and
  **`scripts/lite/deploy-lite-{standalone,upgradeable,uups}.js`** — deploy **only** the PolicyEngine and the token
  (no policy wiring). Use them as a starting point; they are intentionally minimal.
- **`scripts/demo.js`** — the **full reference flow**: deploys the engine + token, then deploys and wires every
  policy/extractor, maps selectors to roles, and grants roles. This is the script to read to understand a
  *complete* deployment.
- **`scripts/preflight.js`** — a verification tool (CLI + programmatic). Run it against any deployment to confirm
  the configuration is coherent and not bricked. See §7.

### The full flow (as in `demo.js`)

1. Deploy the **PolicyEngine** (`defaultPolicyAllow = true` — see §3-B).
2. Deploy the **token** (the token attaches itself to the engine during `initialize`).
3. Deploy the **policies** (Pause, RBAC, TransferValidation, SecureMint, …).
4. Deploy the **extractors**.
5. `setExtractor(selector, extractor)` for every selector whose policy needs parameters.
6. `addPolicy(token, selector, policy, paramNames)` for every privileged selector (see §3-A).
7. RBAC: `grantOperationAllowanceToRole(selector, role)` to map each selector to the role allowed to call it.
8. RBAC: `grantRole(role, operator)` to grant operators their roles.
9. **Run the preflight** and fix every error/warning before funding the token.

## 3. Critical points & risks

### A. Selector coverage must be COMPLETE — including overloads and multiplexers

The engine gates by **selector**. The *same* privileged logic is reachable through several entrypoints with
**different selectors**, and **each one must be wired**:

- **overloads** — `mint(address,uint256)` **and** `mint(address,uint256,bytes)`; `burn(address,uint256)` **and**
  `burn(address,uint256,bytes)` **and** `burn(uint256)`;
- **batch** — `batchMint`, `batchBurn` (two overloads), `batchTransfer`;
- **multiplexers** — `burnAndMint(...)`, whose inner burn/mint run under the **`burnAndMint`** selector;
- **cross-chain** — `crosschainMint`, `crosschainBurn`, `burnFrom`.

**Why it matters (Standard variant especially):** the Standard variant is *policy-authoritative* — there is no
on-token role check; authorization lives **entirely** in the per-selector policy map. With
`defaultPolicyAllow = true`, a privileged selector you **forgot to wire** is callable **by anyone** → unprivileged
mint / burn-from-any-holder. A hand-maintained selector list will miss the overloads (this is exactly what the
canonical wiring in `test/deploymentUtils.js` / `scripts/demo.js` now covers).

> ✅ **Do:** derive the selector set from the **token ABI** (every state-changing function whose name is a
> privileged operation), not from a hand-written list, and wire all of them. The preflight (§7) does exactly this
> and will flag any privileged selector left unwired.

### B. `defaultPolicyAllow` — pick the failure mode on purpose

The engine's `defaultPolicyAllow` decides what happens for a selector with **no** policy wired:

| Setting | Unwired selector | Trade-off |
|---------|------------------|-----------|
| `true` (allow-by-default) | **allowed** | The integration's intended mode. **You must wire a policy for every privileged selector** (§A) — a miss is an open door. |
| `false` (fail-closed) | **reverts** | Safer default, but the shipped policies (`PausePolicy`, `RBACPolicy`, `TransferValidationPolicy`) return `Continue`, **never** `Allowed`. So under fail-closed you must also attach a **terminal allow** policy (e.g. `BypassPolicy`, or a policy returning `Allowed`) on **every** selector you want to permit — otherwise even correctly-wired operations revert and the token is **bricked**. |

Choose one consciously, and let the preflight confirm the result.

### C. Proxy deployments must initialize ATOMICALLY

For the **upgradeable** / **UUPS** variants, deploy with `upgrades.deployProxy(Factory, [args], { initializer:
'initialize' })` so deployment **and** `initialize` happen in **one transaction**. Never deploy a bare proxy and
send `initialize` as a separate transaction (front-running risk). The **standalone** variant initializes in its
constructor and the implementation contracts call `_disableInitializers()`, so they are safe by construction.

### D. Extractor ↔ policy parameter names must match

The engine maps an extractor's **named** outputs to a policy's configured parameter names. If `addPolicy(token,
selector, policy, names)` lists a name the extractor for that selector does not emit, the engine reverts
`"Missing policy parameters"` at run time. And if the extractor handles the *wrong* selector set, it reverts
`UnsupportedSelector`. So:
- set the **right extractor** for each selector (e.g. `MintBurnExtractor` handles `mint(address,uint256)`,
  `burn(address,uint256)`, `burnFrom`, `burn(uint256)`; `ERC20TransferFromExtractor` handles
  `transfer`/`transferFrom`);
- pass `addPolicy` parameter names that the extractor actually emits;
- RBAC and Pause need **no** parameters (pass `[]` and no extractor).

### E. Standard vs Lite — different responsibilities

| | **Standard** (`CCTCommon`) | **Lite** (`CCTCMTATBase…`) |
|--|----------------------------|----------------------------|
| Authorization | **All** privileged ops via the engine (`runPolicy`). You must wire RBAC on every privileged selector. | CMTAT-native `onlyRole` on the token. The engine is used for **transfer validation/screening** only. |
| Engine required? | **Yes**, mandatory non-zero (a zero engine bricks the token). | Optional/detachable (zero engine ⇒ no screening, native checks still apply). |
| Pause | **No native `pause()`** — pausing relies on a `PausePolicy` wired on the selectors you want pausable. | CMTAT-native pause. |
| Account views | `canSend`/`canReceive` query the engine (wire an account-level policy if you want a signal). | Reflect CMTAT freeze. |

### F. Screening (compliance) is separate from authorization

RBAC answers *“may this caller do this?”*; `TransferValidationPolicy` (CMTA `IRule`s) answers *“is this
transfer/issuance/redemption allowed by the rules (KYC/sanctions/limits)?”*. To screen **issuance/redemption**,
wire `MintBurnExtractor` + `TransferValidationPolicy` (or `CrossChainMintBurnExtractor` for cross-chain) on the
`mint`/`burn`/`crosschain*` selectors — **and** on `burnAndMint` if you expose it (it routes under its own
selector; in the Lite variant the token screens each leg under the canonical `mint`/`burn` selectors). Stateful
rules (rolling-window caps, per-period counters) are enforced via the policy's `postRun`/`IRule.transferred` hook
on executed transfers — a read-only `canTransfer` preview does not advance their state.

### G. Roles live where the access control lives

- **Standard:** roles are held by the **RBAC policy** (`rbacPolicy.grantRole(role, operator)`), and selectors are
  mapped to roles with `rbacPolicy.grantOperationAllowanceToRole(selector, role)`. The token itself has no roles.
- **Lite:** roles are held by the **token** (`token.grantRole(role, operator)`), CMTAT-style.

Grant the **minimum** roles needed; treat `DEFAULT_ADMIN_ROLE`, `MINTER_ROLE`, `BURNER_ROLE`, the policy-engine
admin, and the upgrade authority (`onlyOwner` / `PROXY_UPGRADE_ROLE`) as high-value keys (timelock / multisig).

> Note: `burnAndMint` is a burn+mint multiplexer. The reference wiring gates it to `MINTER_ROLE`, which means a
> minter can move a holder's balance via that path; if that is broader than you want, gate it to a dedicated
> reissuance role.

## 4. Standalone vs Upgradeable vs UUPS

- **Standalone** — non-upgradeable; initializes in the constructor. Simplest; use when you don't need upgrades.
- **Upgradeable (Transparent)** — proxy + `ProxyAdmin`; upgrade authority is the proxy admin (use a timelock/
  multisig).
- **UUPS** — upgrade logic in the implementation; `_authorizeUpgrade` is gated (`onlyOwner` on Standard,
  `PROXY_UPGRADE_ROLE` on Lite). Upgrading to a non-UUPS implementation permanently removes upgradeability.

For proxy variants, deploy with the OpenZeppelin Upgrades plugin (`deployProxy`/`upgradeProxy`) so storage-layout
and upgrade-safety are validated.

## 5. Writing your own deployment script — checklist

- [ ] Deploy the PolicyEngine; **decide `defaultPolicyAllow`** (§B) on purpose.
- [ ] Deploy the token; for proxies use `deployProxy` (**atomic init**, §C). Confirm the engine is **attached**.
- [ ] **Enumerate privileged selectors from the token ABI** (not a hand list) — include overloads, batch,
      multiplexers, cross-chain (§A).
- [ ] Wire `PausePolicy` (Standard: on every selector you want pausable, incl. transfers) and `RBAC` on every
      privileged selector; map each selector to its role (`grantOperationAllowanceToRole`).
- [ ] Wire screening (`MintBurnExtractor`/`CrossChainMintBurnExtractor`/`ERC20TransferFromExtractor` +
      `TransferValidationPolicy`) on the value-moving selectors you want compliance-checked, with **matching
      parameter names** (§D).
- [ ] Grant roles to operators in the right place (Standard: RBAC policy; Lite: token) (§G), minimally.
- [ ] **Run the preflight** (§7); resolve every error and review every warning.
- [ ] Post-deploy assertion in the script: read back `owner()`/admin and `getPolicyEngine()` and fail if not the
      intended values.

## 6. Common failure modes (and what the preflight reports)

| Symptom | Cause |
|---------|-------|
| Anyone can mint/burn an unwired overload | Privileged selector not wired (§A) under `defaultAllow=true` → preflight `DEFAULT_ALLOW` warning |
| Every op reverts (`TargetNotAttached`) | Token detached / never attached → preflight error |
| Every op reverts though policies are wired | `defaultAllow=false` with only `Continue` policies → preflight error |
| A wired op reverts at `run()` | Extractor missing / wrong, or parameter-name mismatch (§D) → preflight warning |
| Token can't be paused (Standard) | No `PausePolicy` on the movement selectors → preflight warning |

## 7. Verify with the preflight check

```bash
POLICY_ENGINE=0x... TOKEN=0x... \
  [TOKEN_CONTRACT=ComplianceTokenCMTATLiteStandalone] \
  npx hardhat run scripts/preflight.js
```

The preflight **derives the privileged selector set from the token ABI** (so overloads/multiplexers can't be
silently missed), reports per-selector coverage (`GUARDED` / `DEFAULT_ALLOW` / `WILL_REVERT` / `NOT_ROUTED`),
checks attachment and the effective `defaultPolicyAllow`, and exits non-zero if the configuration would brick the
token. Wire it into CI as a deployment gate, and treat any unwired privileged selector as a release blocker.

## 8. See also

- [README → Security Considerations](../README.md#security-considerations) — the policy-authoritative model and
  `defaultPolicyAllow`.
- [README → Policy preflight check](../README.md#policy-preflight-check).
- [README → TransferValidationPolicy → run vs postRun](../README.md#transfervalidationpolicy) — view validation vs
  stateful enforcement.
