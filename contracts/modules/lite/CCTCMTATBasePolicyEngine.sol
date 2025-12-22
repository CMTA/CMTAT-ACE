// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {CMTATBaseCommon} from "../../../submodules/CMTAT/contracts/modules/0_CMTATBaseCommon.sol";
import {PolicyProtected} from "../../../submodules/chainlink-ace/packages/policy-management/src/core/PolicyProtected.sol";
import {ValidationModuleCore} from "../../../submodules/CMTAT/contracts/modules/wrapper/core/ValidationModuleCore.sol";
import {ICMTATConstructor} from "../../../submodules/CMTAT/contracts/interfaces/technical/ICMTATConstructor.sol";
import {IPolicyEngine} from "../../../submodules/chainlink-ace/packages/policy-management/src/interfaces/IPolicyEngine.sol";
import {ISnapshotEngine} from "../../../submodules/CMTAT/contracts/interfaces/engine/ISnapshotEngine.sol";
import {IERC1643} from "../../../submodules/CMTAT/contracts/interfaces/tokenization/draft-IERC1643.sol";
import {ValidationModulePolicyEngine} from "./ValidationModulePolicyEngine.sol";
import {PauseModule}  from "../../../submodules/CMTAT/contracts/modules/wrapper/core/PauseModule.sol";
import {EnforcementModule} from "../../../submodules/CMTAT/contracts/modules/wrapper/core/EnforcementModule.sol";
// Extensions
import {ERC20EnforcementModule, ERC20EnforcementModuleInternal} from "../../../submodules/CMTAT/contracts/modules/wrapper/extensions/ERC20EnforcementModule.sol";
import {Errors} from "../../../submodules/CMTAT/contracts/libraries/Errors.sol";


abstract contract CCTCMTATBasePolicyEngine is CMTATBaseCommon, ValidationModulePolicyEngine {

       /*//////////////////////////////////////////////////////////////
                         INITIALIZER FUNCTION
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice
     * initialize the proxy contract
     * The calls to this function will revert if the contract was deployed without a proxy
     * @param admin address of the admin of contract (Access Control)
     * @param ERC20Attributes_ ERC20 name, symbol and decimals
     * @param extraInformationAttributes_ tokenId, terms, information
     * @param policyEngine_ address of the policy engine
     * @param snapshotEngine_ address of the snapshot engine
     * @param documentEngine_ address of the document engine
     * @dev
     * If you override the public function initialize,
     * call inside directly the internal function, not the public one which is protected by the initializer modifier
     */
    function initialize(
        address admin,
        ICMTATConstructor.ERC20Attributes memory ERC20Attributes_,
        ICMTATConstructor.ExtraInformationAttributes memory extraInformationAttributes_,
        ISnapshotEngine snapshotEngine_,
        IERC1643 documentEngine_,
        address policyEngine_
    ) public virtual initializer {
        _initialize(
            admin,
            ERC20Attributes_,
            extraInformationAttributes_,
            snapshotEngine_,
            documentEngine_,
            policyEngine_
        );
    }

    /**
    * @dev don't call the initializer modifer
    */
    function _initialize(
        address admin,
        ICMTATConstructor.ERC20Attributes memory ERC20Attributes_,
        ICMTATConstructor.ExtraInformationAttributes memory extraInformationAttributes_,
        ISnapshotEngine snapshotEngine_,
        IERC1643 documentEngine_,
        address policyEngine_
    ) internal virtual onlyInitializing{
        __CMTAT_init(
            admin,
            ERC20Attributes_,
            extraInformationAttributes_,
            snapshotEngine_,
            documentEngine_,
            policyEngine_
        );
    }

        /**
     * @dev calls the different initialize functions from the different modules
     */
    function __CMTAT_init(
        address admin,
        ICMTATConstructor.ERC20Attributes memory ERC20Attributes_,
        ICMTATConstructor.ExtraInformationAttributes memory extraInformationAttributes_,
        ISnapshotEngine snapshotEngine_,
        IERC1643 documentEngine_,
        address policyEngine_
    ) internal virtual onlyInitializing {
        /* OpenZeppelin library */
        // OZ init_unchained functions are called firstly due to inheritance
        __Context_init_unchained();

        // AccessControlUpgradeable inherits from ERC165Upgradeable
        __ERC165_init_unchained();

        // Openzeppelin
        __CMTAT_openzeppelin_init_unchained(ERC20Attributes_);
       
        /* Wrapper modules */
        __CMTAT_commonModules_init_unchained(admin, ERC20Attributes_, extraInformationAttributes_, snapshotEngine_, documentEngine_);

         /* Chainlink-ACE policy module */
       __PolicyProtected_init(admin, policyEngine_);
    }

    /*
    * @dev OpenZeppelin
    */
    function __CMTAT_openzeppelin_init_unchained(ICMTATConstructor.ERC20Attributes memory ERC20Attributes_) internal virtual onlyInitializing {
        // Note that the Openzeppelin functions name() and symbol() are overriden in ERC20BaseModule
        __ERC20_init_unchained(ERC20Attributes_.name, ERC20Attributes_.symbol);
    }

    /*
    * @dev CMTAT wrapper modules
    */
    function __CMTAT_modules_init_unchained(address admin, ICMTATConstructor.ERC20Attributes memory ERC20Attributes_, ICMTATConstructor.ExtraInformationAttributes memory extraInformationAttributes_, ICMTATConstructor.Engine memory engines_) internal virtual onlyInitializing {
        __CMTAT_commonModules_init_unchained(admin,ERC20Attributes_, extraInformationAttributes_, engines_.snapshotEngine, engines_.documentEngine);
    }

    /*//////////////////////////////////////////////////////////////
                            PUBLIC/EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
    * @inheritdoc ValidationModulePolicyEngine
    */
    function canTransfer(
        address from,
        address to,
        uint256 value
    ) public virtual override (ValidationModulePolicyEngine) view returns (bool) {
        if(!ERC20EnforcementModuleInternal._checkActiveBalance(from, value)){
            return false;
        } else {
            return ValidationModulePolicyEngine.canTransfer(from, to, value);
        }
    }

    /**
    * @inheritdoc ValidationModulePolicyEngine
    */
   function canTransferFrom(
        address spender,
        address from,
        address to,
        uint256 value
    ) public virtual override (ValidationModulePolicyEngine) view returns (bool) {
        if(!ERC20EnforcementModuleInternal._checkActiveBalance(from, value)){
            return false;
        } else {
            return ValidationModulePolicyEngine.canTransferFrom(spender, from, to, value);
        }
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL/PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /* ==== Access Control ==== */
    function _authorizePause() internal virtual override(PauseModule) onlyRole(PAUSER_ROLE){}
    function _authorizeDeactivate() internal virtual override(PauseModule) onlyRole(DEFAULT_ADMIN_ROLE){}

    function _authorizeFreeze() internal virtual override(EnforcementModule) onlyRole(ENFORCER_ROLE){}

    /* ==== Transfer/mint/burn restriction ==== */
    function _checkTransferred(address spender, address from, address to, uint256 value) internal virtual override(CMTATBaseCommon) {
        CMTATBaseCommon._checkTransferred(spender, from, to, value);
        require(ValidationModulePolicyEngine._transferred(spender, from, to, value), Errors.CMTAT_InvalidTransfer(from, to, value));
    }


    function supportsInterface(bytes4 interfaceId) public view virtual override(CMTATBaseCommon, PolicyProtected) returns (bool) {
        return CMTATBaseCommon.supportsInterface(interfaceId) || PolicyProtected.supportsInterface(interfaceId);
    }
}