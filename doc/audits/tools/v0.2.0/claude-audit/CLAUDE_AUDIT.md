# Claude Security Audit — CMTAT × Chainlink ACE (v0.2.0)

**Tool:** [Claude](https://www.anthropic.com/claude) (Anthropic), driven by a set of **custom smart-contract
security-audit skills**. The audit was performed on the **v0.2.0** codebase. The workflow was: build a threat
model of the integration, enumerate the privileged attack surface, review the custom integration contracts,
write executable proofs-of-concept for candidate findings, and run an adversarial self-review pass to dismiss or
downgrade weak findings before finalizing. (The specific internal skills used are intentionally not enumerated
here.)

Severity framework: **Code4rena**. Scope: the custom integration contracts
(`contracts/modules/standard`, `contracts/modules/lite`, `contracts/modules/chainlink-ace/custom`,
`contracts/deployment`). Vendored dependencies (CMTAT, Chainlink ACE, RuleEngine) are trusted, not re-audited.
The "already-discovered" baseline is the shipped static-analysis reports under `doc/audits/tools/`.

## Findings Table

> Resolution status updated after remediation (the v0.3.0 release). For the corresponding AI-review IDs, see
> `doc/audits/tools/v0.2.0/nethermind-audit-agent/audit_agent_report-feedback.md` (VULN-1 = NM-3, VULN-2 = NM-4,
> VULN-3 = NM-10 / independent).

| ID | Severity | Title | File | Resolution |
|----|----------|-------|------|------------|
| VULN-1 | **High** | Standard variant: access control bypassed via unwired privileged overloads/multiplexers (unlimited mint + theft) | `contracts/modules/standard/CCTCommon.sol` | **Accepted as design (contract unchanged) + deployment remediated.** Lite is unaffected (real `onlyRole`); the Standard variant is intentionally policy-authoritative. The **canonical reference wiring now gates the overloads/multiplexers** — `mint(address,uint256,bytes)`, `burn(address,uint256,bytes)`, `batchMint/Burn/Transfer`, `burnAndMint` — in `test/deploymentUtils.js` and `scripts/demo.js`; the ABI-derived preflight (VULN-3) flags any still-unwired privileged selector. Regression: `test/custom/auditAccessControlBypass.test.js` asserts the attacker is **blocked** on every privileged selector. |
| VULN-2 | **Medium** | `MintBurnExtractor` omits primary `burn(address,uint256)` (`0x9dc29fac`): screening gap / conditional DoS | `contracts/modules/chainlink-ace/custom/MintBurnExtractor.sol` | **Fixed** — added the `burn(address,uint256)` branch; unit test `test/custom/mintBurnExtractor.test.js`. |
| VULN-3 | **Low** | Preflight `OPERATIONS` list incomplete → false coverage assurance for VULN-1 selectors | `scripts/preflight.js` | **Fixed** — coverage now **derived from the token ABI** (`deriveOperations`) so overloads/multiplexers can't be silently omitted; meta-test `test/deployment/preflightAbiCompleteness.test.js`. The mitigating control for VULN-1's by-design acceptance. |

## VULN-1 — Standard variant: selector-scoped authorization is incomplete ⇒ unprivileged mint & theft

**Severity: High** · **File:** `contracts/modules/standard/CCTCommon.sol:309` (`_authorizeMint`), `:315`
(`_authorizeBurn`) — and the `runPolicy` model they rely on.

### Description
In the Standard (policy-authoritative) variant, `CCTCommon` overrides every CMTAT authorization hook to
`runPolicy` (empty body, no role check):

```solidity
function _authorizeMint() internal virtual override(ERC20MintModule) runPolicy {}
function _authorizeBurn() internal virtual override(ERC20BurnModule) runPolicy {}
```

`runPolicy` evaluates the PolicyEngine for **`msg.sig`** — the selector of the *outer* call
(`PolicyProtectedBaseUpgradeable._runPolicyBefore`: `selector: msg.sig`). Authorization is therefore entirely a
function of *which selector* was wired to an RBAC policy. The canonical deployment
(`test/deploymentUtils.js`, `scripts/demo.js`) and the shipped preflight (`scripts/preflight.js`) wire/enumerate
only a subset of mint/burn selectors:
`mint(address,uint256)`, `burn(address,uint256)`, `burn(uint256)`, `burnFrom(address,uint256)`.

But the **same** `onlyMinter`/`onlyBurner`-protected logic is reachable through CMTAT overloads and multiplexers
inherited by `CCTCommon`, each with a **different, unwired** selector:

- `mint(address,uint256,bytes)`  (ERC-5679)
- `burn(address,uint256,bytes)`  (ERC-5679)
- `batchMint(...)`, `batchBurn(...)`
- `burnAndMint(address,address,uint256,uint256,bytes)` — no modifier of its own; its inner `burn()`/`mint()`
  run the policy for the **`burnAndMint`** selector.

`onlyMinter`/`onlyBurner` delegate **solely** to `_authorizeMint`/`_authorizeBurn`
(`submodules/CMTAT/.../ERC20MintModule.sol:27`), so in the Standard variant there is **no token-level role check
at all** — the only gate is the per-selector policy. The integration is explicitly designed for
`defaultPolicyAllow = true` (the fixture uses `deployPolicyEngine(true, …)`), so for any selector with **no**
policy the engine returns *Allowed by default*.

**Result:** any unprivileged account can mint unlimited tokens and burn from any holder.

### Impact
- Unlimited inflation / arbitrary mint to attacker (`mint(address,uint256,bytes)`).
- Theft of any holder's balance: `burnAndMint(victim, attacker, X, X, "0x")` burns the victim and mints `X` to
  the attacker — a role- and policy-bypassing transfer that also sidesteps `TransferValidationPolicy`
  sanctions/KYC screening and `PausePolicy`.
- The failure mode is silent: a careful operator who wires every selector in the README table **and runs the
  shipped preflight** still ships a vulnerable token, because neither enumerates the overloads (see VULN-3).

### PoC
`test/custom/auditAccessControlBypass.test.js` (originally demonstrated the bypass against the standard RBAC
fixture; now a regression asserting the attacker is **blocked** after the deployment remediation):

```
✔ the attacker holds neither MINTER_ROLE nor BURNER_ROLE in the authoritative RBAC policy
✔ canonical mint(address,uint256) is gated for the attacker
✔ the mint(address,uint256,bytes) overload is now gated for the attacker (bypass closed)
✔ the burnAndMint multiplexer is now gated for the attacker (theft closed)
```

### Affected scope
Standard variant only: `ComplianceTokenCMTATStandalone/Upgradeable/UUPSUpgradeable` via `CCTCommon`.
**Lite is NOT affected** — it inherits CMTAT's real `onlyRole(MINTER_ROLE/BURNER_ROLE)` (verified at
`submodules/CMTAT/.../2_CMTATBaseAccessControl.sol:72,78`); mint/burn are not overridden to `runPolicy` there.

### Recommendation / disposition
The Standard variant is intentionally policy-authoritative, so the contract was **not** changed; the risk is a
deployment-configuration property and was remediated at the deployment layer (combine for defense in depth):
1. Gate **every** privileged selector — including overloads/multiplexers — in the canonical wiring (done in
   `test/deploymentUtils.js` and `scripts/demo.js`).
2. Optionally neutralize the alternate entrypoints in `CCTCommon`, or keep CMTAT role checks under `runPolicy`.
3. Optionally deploy with `defaultPolicyAllow = false` + explicit terminal allow policies (fail-closed).
4. Derive the deployment/preflight selector set from the token ABI (done — see VULN-3).

## VULN-2 — `MintBurnExtractor` omits the primary `burn(address,uint256)` selector

**Severity: Medium** · **File:** `contracts/modules/chainlink-ace/custom/MintBurnExtractor.sol:27-31,45-56`.

### Description
`MintBurnExtractor` recognizes `mint(address,uint256)` (`0x40c10f19`), `burnFrom(address,uint256)`
(`0x79cc6790`) and `burn(uint256)` (`0x42966c68`), reverting `UnsupportedSelector` for anything else. CMTAT's
**primary** burn — the `BURNER_ROLE` operator burn (`burn(address,uint256)` = `0x9dc29fac`) — is **not** handled.
Its calldata layout (`abi.encode(account, value)`) is identical to the `burnFrom` branch the extractor already
decodes; only the selector guard rejects it.

### Impact
- **Screening gap:** issuance/redemption screening (the same `IRule` set via `TransferValidationPolicy` +
  `MintBurnExtractor`) cannot be applied to the main burn path; operators believing burns are screened are
  mistaken for `burn(address,uint256)`.
- **Conditional DoS:** if an operator wires `MintBurnExtractor` to the documented burn selector `0x9dc29fac`,
  `_extractParameters` reverts `ExtractorError` and **every burn reverts** (redemption bricked).

### Recommendation
Add a `burn(address,uint256)` (`0x9dc29fac`) branch mapping `from = account, to = 0, amount = value`, mirroring
`burnFrom`, with a direct `extract()` unit test. **(Done.)**

## VULN-3 — Preflight coverage tool omits overloaded/multiplexer selectors

**Severity: Low** · **File:** `scripts/preflight.js` (`OPERATIONS`).

The `OPERATIONS` catalogue used to assert per-selector policy coverage listed only the canonical selectors and
omitted `mint(address,uint256,bytes)`, `burn(address,uint256,bytes)`, `batchMint`, `batchBurn`, and
`burnAndMint(...)`. The tool consequently reported a token as fully covered while these privileged selectors
remained open — the assurance gap that lets VULN-1 ship unnoticed. **Fixed** by deriving `OPERATIONS` from the
token ABI (all functions carrying a role/`runPolicy` gate) instead of a hand-maintained list.

## Verified selectors

`mint(address,uint256)`=`0x40c10f19` (wired); `mint(address,uint256,bytes)`=`0x94d008ef`,
`burn(address,uint256,bytes)`=`0x44d17187`, `batchMint`=`0x68573107`, `batchBurn`=`0x4a6cc677`,
`burnAndMint`=`0x18796d44` (overloads/multiplexers); `burn(address,uint256)`=`0x9dc29fac`.

## Invariant Verification (at v0.2.0, before remediation)

| Invariant | Held at v0.2.0? | Evidence |
|-----------|-----------------|----------|
| INV-1 only minter can increase supply | **NO (Standard)** | VULN-1 PoC |
| INV-2 only burner can reduce others' balance | **NO (Standard)** | VULN-1 PoC (`burnAndMint`) |
| INV-3 every privileged selector is gated | **NO (Standard)** | VULN-1 / VULN-3 |
| INV-4 documented protected selector is extractor-decodable | **NO** (`0x9dc29fac`) | VULN-2 |
| Lite mint/burn role enforcement | YES | inherits `onlyRole`; verified |
| UUPS `_authorizeUpgrade` gated | YES | `onlyOwner` / `PROXY_UPGRADE_ROLE` |

(INV-1/2/3 are restored at deployment time by the v0.3.0 canonical-wiring remediation; INV-4 fixed by VULN-2.)

## Access-Control Verification

| Operation | Standard gate (v0.2.0) | Lite gate | Note |
|-----------|------------------------|-----------|------|
| `mint(address,uint256)` | RBAC policy (wired) | `onlyRole(MINTER_ROLE)` | OK |
| `mint(address,uint256,bytes)` | **none (default-allow)** | `onlyRole(MINTER_ROLE)` | **VULN-1 (Standard)** — now wired |
| `burnAndMint(...)` | **none (default-allow)** | `onlyRole` on inner burn/mint | **VULN-1 (Standard)** — now wired |
| `burn(address,uint256)` | RBAC policy (wired) | `onlyRole(BURNER_ROLE)` | extractor gap → VULN-2 |
| `attachPolicyEngine` | `onlyOwner` | `onlyRole(DEFAULT_ADMIN_ROLE)` | OK |
| UUPS upgrade | `onlyOwner` | `PROXY_UPGRADE_ROLE` | OK |

## Recommendations Summary — with resolution status

1. **[High] VULN-1 — Accepted as design (contract unchanged) + deployment remediated.** Canonical wiring now
   gates every privileged overload/multiplexer; ABI-derived preflight (VULN-3) flags omissions;
   `auditAccessControlBypass.test.js` asserts the attacker is blocked. Residual deployment guidance (wire every
   selector, or `defaultPolicyAllow=false`) in README → Security Considerations.
2. **[Medium] VULN-2 — Fixed:** added `burn(address,uint256)` to `MintBurnExtractor` + unit test.
3. **[Low] VULN-3 — Fixed:** preflight coverage derived from the token ABI; completeness meta-test added.

## Scope / Duplicate Check

- VULN-1, VULN-2, VULN-3 are **NOT** present in the shipped Slither/Aderyn baseline. The static-analysis Highs
  (arbitrary `from`, ETH lock) are different issues.
- All findings are within audit scope (`contracts/modules/standard`, `chainlink-ace/custom`; `scripts/preflight.js`
  is integration tooling supporting VULN-1).
