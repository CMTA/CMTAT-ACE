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

abstract contract CCTCommon is
    OwnableUpgradeable,
    ERC20CrossChainModule,
    PolicyProtectedBaseUpgradeable,
    CMTATBaseCommon,
    CMTATBaseDocument,
    CCIPModule
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

    /* ============ ERC-7943 (uRWA) check surface ============ */
    /**
     * @notice Account-level send eligibility (ERC-7943 `canSend`).
     * @dev In the Standard (policy-authoritative) variant there is no on-chain account allowlist or
     * account freeze on the token itself: send/receive eligibility is decided per-transfer by the
     * PolicyEngine inside {canTransfer}. This therefore reports no token-level account restriction.
     * MUST NOT revert and MUST NOT encode quantitative rules.
     */
    function canSend(address /*account*/) public view virtual returns (bool) {
        return true;
    }

    /**
     * @notice Account-level receive eligibility (ERC-7943 `canReceive`). See {canSend}.
     */
    function canReceive(address /*account*/) public view virtual returns (bool) {
        return true;
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
     * here we only need a boolean, so a revert is mapped to `false`. Returns `true` when no engine
     * is attached (no policy enforcement).
     */
    function _canTransferWithPolicyEngine(
        bytes4 selector,
        address sender,
        bytes memory data
    ) internal view virtual returns (bool) {
        IPolicyEngine policyEngine_ = IPolicyEngine(getPolicyEngine());
        if (address(policyEngine_) == address(0)) {
            return true;
        }
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
