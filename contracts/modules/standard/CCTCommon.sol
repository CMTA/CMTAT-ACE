// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

/* ==== OpenZeppelin === */
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/* ==== CMTAT === */
import {CMTATBaseCommon} from "../../../submodules/CMTAT/contracts/modules/0_CMTATBaseCommon.sol";
/* = Base = */
/* = Core = */
import {
    ERC20BurnModule,
    ERC20BurnModuleInternal
} from "../../../submodules/CMTAT/contracts/modules/wrapper/core/ERC20BurnModule.sol";
import {
    ERC20MintModule,
    ERC20MintModuleInternal
} from "../../../submodules/CMTAT/contracts/modules/wrapper/core/ERC20MintModule.sol";
import {VersionModule} from "../../../submodules/CMTAT/contracts/modules/wrapper/core/VersionModule.sol";
import {ERC20BaseModule} from "../../../submodules/CMTAT/contracts/modules/wrapper/core/ERC20BaseModule.sol";
/* = Option & Extension = */
import {ERC20CrossChainModule} from "../../../submodules/CMTAT/contracts/modules/wrapper/options/ERC20CrossChainModule.sol";
import {CCIPModule} from "../../../submodules/CMTAT/contracts/modules/wrapper/options/CCIPModule.sol";
import {ExtraInformationModule} from "../../../submodules/CMTAT/contracts/modules/wrapper/extensions/ExtraInformationModule.sol";
import {
    ERC20EnforcementModule,
    ERC20EnforcementModuleInternal
} from "../../../submodules/CMTAT/contracts/modules/wrapper/extensions/ERC20EnforcementModule.sol";
import {
    DocumentEngineModule,
    IERC1643
} from "../../../submodules/CMTAT/contracts/modules/wrapper/extensions/DocumentEngineModule.sol";
import {SnapshotEngineModule} from "../../../submodules/CMTAT/contracts/modules/wrapper/extensions/SnapshotEngineModule.sol";
/* = Interface = */
import {IERC5679} from "../../../submodules/CMTAT/contracts/interfaces/technical/IERC5679.sol";
import {IBurnMintERC20} from "../../../submodules/CMTAT/contracts/interfaces/technical/IMintBurnToken.sol";
import {ICMTATConstructor} from "../../../submodules/CMTAT/contracts/interfaces/technical/ICMTATConstructor.sol";
import {ISnapshotEngine} from "../../../submodules/CMTAT/contracts/interfaces/engine/ISnapshotEngine.sol";
/* ==== Chainlink ACE === */
import {PolicyProtectedUpgradeable} from "../chainlink-ace/modified/PolicyProtectedUpgradeable.sol";

abstract contract CCTCommon is
    OwnableUpgradeable,
    ERC20CrossChainModule,
    PolicyProtectedUpgradeable,
    CMTATBaseCommon,
    CCIPModule
{
    function initialize(
        address admin,
        ICMTATConstructor.ERC20Attributes memory ERC20Attributes_,
        ICMTATConstructor.ExtraInformationAttributes memory extraInformationAttributes_,
        address policyEngine,
        ISnapshotEngine snapshotEngine_,
        IERC1643 documentEngine_
    ) public virtual initializer {
        _initialize(
            admin,
            ERC20Attributes_,
            extraInformationAttributes_,
            policyEngine,
            snapshotEngine_,
            documentEngine_
        );
    }

    function _initialize(
        address admin,
        ICMTATConstructor.ERC20Attributes memory ERC20Attributes_,
        ICMTATConstructor.ExtraInformationAttributes memory extraInformationAttributes_,
        address policyEngine,
        ISnapshotEngine snapshotEngine_,
        IERC1643 documentEngine_
    ) internal virtual onlyInitializing {
        __CMTAT_init(
            admin,
            ERC20Attributes_,
            extraInformationAttributes_,
            policyEngine,
            snapshotEngine_,
            documentEngine_
        );
    }

    /**
     * @dev calls the different initialize functions from the different modules
     */
    function __CMTAT_init(
        address admin,
        ICMTATConstructor.ERC20Attributes memory ERC20Attributes_,
        ICMTATConstructor.ExtraInformationAttributes memory ExtraInformationAttributes_,
        address policyEngine,
        ISnapshotEngine snapshotEngine_,
        IERC1643 documentEngine_
    ) internal virtual onlyInitializing {
        __Ownable_init_unchained(admin);
        /* OpenZeppelin library */
        // OZ init_unchained functions are called firstly due to inheritance
        __Context_init_unchained();

        // AccessControlUpgradeable inherits from ERC165Upgradeable
        __ERC165_init_unchained();

        // Openzeppelin
        __CMTAT_openzeppelin_init_unchained(ERC20Attributes_);

        __PolicyProtected_init_unchained(policyEngine);

        /* Wrapper modules */
        __CMTAT_modules_init_unchained(ERC20Attributes_, ExtraInformationAttributes_);

        /* Engine modules */
        __SnapshotEngineModule_init_unchained(snapshotEngine_);
        __DocumentEngineModule_init_unchained(documentEngine_);
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

    // Add onlyOwner modifier
    function attachPolicyEngine(address policyEngine) external virtual override onlyOwner {
        _attachPolicyEngine(policyEngine);
    }

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
    ) public view virtual override(IERC165, ERC20CrossChainModule, PolicyProtectedUpgradeable) returns (bool) {
        return
            ERC20CrossChainModule.supportsInterface(_interfaceId) ||
            PolicyProtectedUpgradeable.supportsInterface(_interfaceId);
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
    function _authorizeDocumentManagement() internal virtual override(DocumentEngineModule) runPolicy {}

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
     * - the caller must have the `SNAPSHOOTER_ROLE`.
     */
    function _authorizeSnapshots() internal virtual override(SnapshotEngineModule) runPolicy {}

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

    /* ==== ERC-20 OpenZeppelin ==== */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(ERC20Upgradeable, CMTATBaseCommon) {
        return CMTATBaseCommon._update(from, to, amount);
    }
}
