// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

/* ==== OpenZeppelin === */
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/* ==== CMTAT === */
import {CMTATBaseCommon} from "CMTAT/modules/0_CMTATBaseCommon.sol";
/* = Base = */
/* = Core = */
import {ERC20BurnModule, ERC20BurnModuleInternal} from "CMTAT/modules/wrapper/core/ERC20BurnModule.sol";
import {ERC20MintModule, ERC20MintModuleInternal} from "CMTAT/modules/wrapper/core/ERC20MintModule.sol";
import {ERC20BaseModule} from "CMTAT/modules/wrapper/core/ERC20BaseModule.sol";
/* = Option & Extension = */
import {ERC20CrossChainModule} from "CMTAT/modules/wrapper/options/ERC20CrossChainModule.sol";
import {CCIPModule} from "CMTAT/modules/wrapper/options/CCIPModule.sol";
import {ExtraInformationModule} from "CMTAT/modules/wrapper/extensions/ExtraInformationModule.sol";
import {
    ERC20EnforcementModule,
    ERC20EnforcementModuleInternal
} from "CMTAT/modules/wrapper/extensions/ERC20EnforcementModule.sol";
import {CMTATBaseDocument} from "CMTAT/modules/1_CMTATBaseDocument.sol";
import {DocumentERC1643Module} from "CMTAT/modules/wrapper/extensions/DocumentERC1643Module.sol";
/* = Interface = */
import {ICMTATConstructor} from "CMTAT/interfaces/technical/ICMTATConstructor.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC7943Fungible} from "../../interfaces/IERC7943Fungible.sol";
/* ==== Chainlink ACE === */
import {PolicyProtectedBaseUpgradeable} from "@chainlink/policy-management/core/PolicyProtectedBaseUpgradeable.sol";
import {IPolicyEngine} from "@chainlink/policy-management/interfaces/IPolicyEngine.sol";
import {CCTVersionModule} from "../CCTVersionModule.sol";
import {VersionModule} from "CMTAT/modules/wrapper/core/VersionModule.sol";

abstract contract CCTCommon is
    OwnableUpgradeable,
    ERC20CrossChainModule,
    PolicyProtectedBaseUpgradeable,
    CMTATBaseCommon,
    CMTATBaseDocument,
    CCIPModule,
    CCTVersionModule
{
    function initialize(
        address admin,
        ICMTATConstructor.ERC20Attributes memory ERC20Attributes_,
        ICMTATConstructor.ExtraInformationAttributes memory extraInformationAttributes_,
        address policyEngine
    ) public virtual initializer {
        _initialize(admin, ERC20Attributes_, extraInformationAttributes_, policyEngine);
    }

    function _initialize(
        address admin,
        ICMTATConstructor.ERC20Attributes memory ERC20Attributes_,
        ICMTATConstructor.ExtraInformationAttributes memory extraInformationAttributes_,
        address policyEngine
    ) internal virtual onlyInitializing {
        __CMTAT_init(admin, ERC20Attributes_, extraInformationAttributes_, policyEngine);
    }

    /**
     * @dev calls the different initialize functions from the different modules
     */
    function __CMTAT_init(
        address admin,
        ICMTATConstructor.ERC20Attributes memory ERC20Attributes_,
        ICMTATConstructor.ExtraInformationAttributes memory ExtraInformationAttributes_,
        address policyEngine
    ) internal virtual onlyInitializing {
        __Ownable_init_unchained(admin);
        /* OpenZeppelin library */
        // OZ init_unchained functions are called firstly due to inheritance
        __Context_init_unchained();

        // AccessControlUpgradeable inherits from ERC165Upgradeable
        __ERC165_init_unchained();

        // Openzeppelin
        __CMTAT_openzeppelin_init_unchained(ERC20Attributes_);

        __PolicyProtectedBase_init_unchained(policyEngine);

        /* Wrapper modules */
        __CMTAT_modules_init_unchained(ERC20Attributes_, ExtraInformationAttributes_);
    }

    /*
     * @dev OpenZeppelin
     */
    function __CMTAT_openzeppelin_init_unchained(
        ICMTATConstructor.ERC20Attributes memory ERC20Attributes_
    ) internal virtual onlyInitializing {
        // Note that the Openzeppelin functions name() and symbol() are overriden in ERC20BaseModule
        __ERC20_init_unchained(ERC20Attributes_.name, ERC20Attributes_.symbol);
    }

    /*
     * @dev CMTAT wrapper modules
     */
    function __CMTAT_modules_init_unchained(
        ICMTATConstructor.ERC20Attributes memory ERC20Attributes_,
        ICMTATConstructor.ExtraInformationAttributes memory extraInformationAttributes_
    ) internal virtual onlyInitializing {
        __CMTAT_commonModules_init_unchained(ERC20Attributes_, extraInformationAttributes_);
    }

    function __CMTAT_commonModules_init_unchained(
        ICMTATConstructor.ERC20Attributes memory ERC20Attributes_,
        ICMTATConstructor.ExtraInformationAttributes memory ExtraInformationModuleAttributes_
    ) internal virtual onlyInitializing {
        // Core
        __ERC20BaseModule_init_unchained(
            ERC20Attributes_.decimalsIrrevocable,
            ERC20Attributes_.name,
            ERC20Attributes_.symbol
        );
        /* Extensions */
        __ExtraInformationModule_init_unchained(
            ExtraInformationModuleAttributes_.tokenId,
            ExtraInformationModuleAttributes_.terms,
            ExtraInformationModuleAttributes_.information
        );
    }

    /*//////////////////////////////////////////////////////////////
                        PUBLIC/EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /* ============  State Functions ============ */
    function transfer(
        address to,
        uint256 value
    ) public virtual override(ERC20Upgradeable, CMTATBaseCommon) runPolicy returns (bool) {
        return CMTATBaseCommon.transfer(to, value);
    }
    /*
     * @inheritdoc ERC20BaseModule
     */
    function transferFrom(
        address from,
        address to,
        uint256 value
    ) public virtual override(ERC20Upgradeable, CMTATBaseCommon) runPolicy returns (bool) {
        return CMTATBaseCommon.transferFrom(from, to, value);
    }

    function _authorizeAttachPolicyEngine(address) internal virtual override onlyOwner {}

    /* ============ View functions ============ */

    /**
     * @inheritdoc CMTATBaseCommon
     */
    function decimals() public view virtual override(ERC20Upgradeable, CMTATBaseCommon) returns (uint8) {
        return CMTATBaseCommon.decimals();
    }

    /**
     * @inheritdoc CMTATBaseCommon
     */
    function name() public view virtual override(ERC20Upgradeable, CMTATBaseCommon) returns (string memory) {
        return CMTATBaseCommon.name();
    }

    /**
     * @inheritdoc CMTATBaseCommon
     */
    function symbol() public view virtual override(ERC20Upgradeable, CMTATBaseCommon) returns (string memory) {
        return CMTATBaseCommon.symbol();
    }

    function supportsInterface(
        bytes4 _interfaceId
    ) public view virtual override(IERC165, ERC20CrossChainModule, PolicyProtectedBaseUpgradeable) returns (bool) {
        return
            _interfaceId == type(IERC7943Fungible).interfaceId ||
            ERC20CrossChainModule.supportsInterface(_interfaceId) ||
            PolicyProtectedBaseUpgradeable.supportsInterface(_interfaceId);
    }

    /**
     * @inheritdoc CCTVersionModule
     * @dev Resolves the diamond between CMTAT's {VersionModule} and {CCTVersionModule}; reports the
     * CMTAT-ACE integration release version.
     */
    function version() public view virtual override(VersionModule, CCTVersionModule) returns (string memory version_) {
        return CCTVersionModule.version();
    }

    /* ============ ERC-7943 (uRWA) check surface ============ */
    /// @dev Selector under which account-level SEND eligibility is queried from the PolicyEngine.
    bytes4 internal constant CAN_SEND_SELECTOR = bytes4(keccak256("canSend(address)"));
    /// @dev Selector under which account-level RECEIVE eligibility is queried from the PolicyEngine.
    bytes4 internal constant CAN_RECEIVE_SELECTOR = bytes4(keccak256("canReceive(address)"));

    /**
     * @notice Account-level send eligibility (ERC-7943 `canSend`).
     * @dev In the Standard (policy-authoritative) variant there is no on-chain account allowlist/freeze on the
     * token itself; account eligibility lives in the PolicyEngine. This queries it via the read-only `check`
     * under the dedicated {CAN_SEND_SELECTOR} (the queried account is the payload `sender`), so an account-level
     * policy — e.g. an allowlist/KYC/identity policy such as ACE's `OnlyAuthorizedSenderPolicy` — is reflected.
     * Backward compatible: if no policy is wired for that selector the engine's `defaultPolicyAllow` decides
     * (allow-by-default ⇒ returns `true`, as before). MUST NOT revert (a rejection maps to `false`) and MUST NOT
     * encode quantitative rules (no amount is passed). The authoritative transfer gate remains {canTransfer}.
     */
    function canSend(address account) public view virtual returns (bool) {
        return _canAccountWithPolicyEngine(CAN_SEND_SELECTOR, account);
    }

    /**
     * @notice Account-level receive eligibility (ERC-7943 `canReceive`). See {canSend}; queried under
     * {CAN_RECEIVE_SELECTOR}.
     */
    function canReceive(address account) public view virtual returns (bool) {
        return _canAccountWithPolicyEngine(CAN_RECEIVE_SELECTOR, account);
    }

    /**
     * @dev Read-only account-eligibility query: runs the PolicyEngine `check` for `selector` with the account as
     * the payload `sender` and an empty context. Maps a rejection (revert) to `false` so the ERC-7943 view never
     * reverts. The engine is non-zero in the Standard variant (validated at init / on attach).
     */
    function _canAccountWithPolicyEngine(bytes4 selector, address account) internal view virtual returns (bool) {
        IPolicyEngine policyEngine_ = IPolicyEngine(getPolicyEngine());
        try
            policyEngine_.check(
                IPolicyEngine.Payload({selector: selector, sender: account, data: abi.encode(account), context: ""})
            )
        {
            return true;
        } catch {
            return false;
        }
    }

    /**
     * @notice Transfer-level authorization check (ERC-7943 `canTransfer`).
     * @dev Combines the unfrozen-balance check, the account-level {canSend}/{canReceive} checks, and
     * the PolicyEngine's permissioned rules (queried via the read-only `check`). MUST NOT revert.
     */
    function canTransfer(address from, address to, uint256 value) public view virtual returns (bool) {
        (bool unfrozenOk, ) = ERC20EnforcementModuleInternal._checkActiveBalance(from, value);
        if (!unfrozenOk || !canSend(from) || !canReceive(to)) {
            return false;
        }
        return _canTransferWithPolicyEngine(IERC20.transfer.selector, from, abi.encode(to, value));
    }

    /**
     * @notice Spender-aware transfer-level authorization check (mirrors {canTransfer} for `transferFrom`).
     */
    function canTransferFrom(
        address spender,
        address from,
        address to,
        uint256 value
    ) public view virtual returns (bool) {
        (bool unfrozenOk, ) = ERC20EnforcementModuleInternal._checkActiveBalance(from, value);
        if (!unfrozenOk || !canSend(from) || !canReceive(to)) {
            return false;
        }
        return _canTransferWithPolicyEngine(IERC20.transferFrom.selector, spender, abi.encode(from, to, value));
    }

    /**
     * @dev Read-only PolicyEngine evaluation. `check` reverts on rejection (preserving the reason);
     * here we only need a boolean, so a revert is mapped to `false`.
     * @dev The PolicyEngine is assumed to be set (non-zero): in the Standard variant it is validated
     * non-zero at initialization and on every `attachPolicyEngine` (via `_validatePolicyEngine`), and
     * detaching is not allowed, so any caller of this function always runs with an engine attached.
     * A variant that permits a zero engine must perform the zero-address check before calling this.
     */
    function _canTransferWithPolicyEngine(
        bytes4 selector,
        address sender,
        bytes memory data
    ) internal view virtual returns (bool) {
        IPolicyEngine policyEngine_ = IPolicyEngine(getPolicyEngine());
        try
            policyEngine_.check(
                IPolicyEngine.Payload({selector: selector, sender: sender, data: data, context: getContext()})
            )
        {
            return true;
        } catch {
            return false;
        }
    }

    /* ==== Mint and Burn Operations ==== */
    /**
     * @dev Check if the mint is valid
     */
    function _mintOverride(
        address account,
        uint256 value
    ) internal virtual override(CMTATBaseCommon, ERC20MintModuleInternal) {
        CMTATBaseCommon._mintOverride(account, value);
    }

    /**
     * @dev Check if the burn is valid
     */
    function _burnOverride(
        address account,
        uint256 value
    ) internal virtual override(CMTATBaseCommon, ERC20BurnModuleInternal) {
        CMTATBaseCommon._burnOverride(account, value);
    }

    /**
     * @dev Check if a minter transfer is valid
     */
    function _minterTransferOverride(
        address from,
        address to,
        uint256 value
    ) internal virtual override(CMTATBaseCommon, ERC20MintModuleInternal) {
        CMTATBaseCommon._minterTransferOverride(from, to, value);
    }

    /* ==== Access Control Functions ==== */

    /**
     * @custom:access-control
     * - the caller must have the `DEFAULT_ADMIN_ROLE`.
     */
    function _authorizeERC20AttributeManagement() internal virtual override(ERC20BaseModule) runPolicy {}

    /**
     * @custom:access-control
     * - the caller must have the `MINTER_ROLE`.
     */
    function _authorizeMint() internal virtual override(ERC20MintModule) runPolicy {}

    /**
     * @custom:access-control
     * - The caller must have the `BURNER_ROLE`.
     */
    function _authorizeBurn() internal virtual override(ERC20BurnModule) runPolicy {}

    /**
     * @custom:access-control
     * - the caller must have the `DOCUMENT_ROLE`.
     */
    function _authorizeDocumentManagement() internal virtual override(DocumentERC1643Module) runPolicy {}

    /**
     * @custom:access-control
     * - the caller must have the `EXTRA_INFORMATION_ROLE`.
     */
    function _authorizeExtraInfoManagement() internal virtual override(ExtraInformationModule) runPolicy {}

    /**
     * @custom:access-control
     * - the caller must have the `ERC20ENFORCER_ROLE`.
     */
    function _authorizeERC20Enforcer() internal virtual override(ERC20EnforcementModule) runPolicy {}

    /**
     * @custom:access-control
     * - the caller must have the `DEFAULT_ADMIN_ROLE`.
     */
    function _authorizeForcedTransfer() internal virtual override(ERC20EnforcementModule) runPolicy {}

    /**
     * @custom:access-control
     * - the caller must have the `DEFAULT_ADMIN_ROLE`.
     */
    function _authorizeCCIPSetAdmin() internal virtual override(CCIPModule) runPolicy {}

    /**
     * @dev
     * A cross-chain bridge could call the OpenZeppelin function `renounceRole` to lose their privileges (CROSS_CHAIN_ROLE)
     * While it is not intended,this has no other effect than depriving the bridge of burn/mint tokens
     * An attacker could use this to disrupt minting/burning if they can get the bridge to execute calls.
     * However, in this case, the bridge should still be considered compromised and not used again.
     * @custom:access-control
     * - the caller must have the `CROSS_CHAIN_ROLE`.
     */
    function _checkTokenBridge(address caller) internal virtual override(ERC20CrossChainModule) runPolicy {}

    /**
     * @custom:access-control
     * - the caller must have the `BURNER_FROM_ROLE`.
     * - We don't allow token holder to burn their own tokens if they don't have this role.
     */
    function _authorizeBurnFrom() internal virtual override(ERC20CrossChainModule) runPolicy {}

    /**
     * @custom:access-control
     * - the caller must have the `BURNER_ROLE`.
     * - We don't allow token holder to burn their own tokens if they don't have this role.
     */
    function _authorizeSelfBurn() internal virtual override(ERC20CrossChainModule) runPolicy {}
}
