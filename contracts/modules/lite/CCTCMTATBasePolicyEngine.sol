// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {CMTATBaseCommon, CMTATBaseAccessControl} from "CMTAT/modules/2_CMTATBaseAccessControl.sol";
import {PolicyProtectedBaseUpgradeable} from "@chainlink/policy-management/core/PolicyProtectedBaseUpgradeable.sol";
import {ICMTATConstructor} from "CMTAT/interfaces/technical/ICMTATConstructor.sol";
import {ValidationModulePolicyEngine} from "./ValidationModulePolicyEngine.sol";
import {PauseModule} from "CMTAT/modules/wrapper/core/PauseModule.sol";
import {EnforcementModule} from "CMTAT/modules/wrapper/core/EnforcementModule.sol";
import {IERC7943FungibleTransferError} from "CMTAT/interfaces/tokenization/draft-IERC7943.sol";
import {IERC7943Fungible} from "../../interfaces/IERC7943Fungible.sol";
import {CCTVersionModule} from "../CCTVersionModule.sol";
import {VersionModule} from "CMTAT/modules/wrapper/core/VersionModule.sol";
// Extensions
import {
    ERC20EnforcementModule,
    ERC20EnforcementModuleInternal
} from "CMTAT/modules/wrapper/extensions/ERC20EnforcementModule.sol";

abstract contract CCTCMTATBasePolicyEngine is
    CMTATBaseAccessControl,
    ValidationModulePolicyEngine,
    IERC7943FungibleTransferError,
    CCTVersionModule
{
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
     * @dev
     * If you override the public function initialize,
     * call inside directly the internal function, not the public one which is protected by the initializer modifier
     */
    function initialize(
        address admin,
        ICMTATConstructor.ERC20Attributes memory ERC20Attributes_,
        ICMTATConstructor.ExtraInformationAttributes memory extraInformationAttributes_,
        address policyEngine_
    ) public virtual initializer {
        _initialize(admin, ERC20Attributes_, extraInformationAttributes_, policyEngine_);
    }

    /**
     * @dev don't call the initializer modifer
     */
    function _initialize(
        address admin,
        ICMTATConstructor.ERC20Attributes memory ERC20Attributes_,
        ICMTATConstructor.ExtraInformationAttributes memory extraInformationAttributes_,
        address policyEngine_
    ) internal virtual onlyInitializing {
        __CMTAT_init(admin, ERC20Attributes_, extraInformationAttributes_, policyEngine_);
    }

    /**
     * @dev calls the different initialize functions from the different modules
     */
    function __CMTAT_init(
        address admin,
        ICMTATConstructor.ERC20Attributes memory ERC20Attributes_,
        ICMTATConstructor.ExtraInformationAttributes memory extraInformationAttributes_,
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
        __CMTAT_commonModules_init_unchained(admin, ERC20Attributes_, extraInformationAttributes_);

        /* Chainlink-ACE policy module */
        __PolicyProtectedBase_init_unchained(policyEngine_);
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
    ) public view virtual override(ValidationModulePolicyEngine) returns (bool) {
        (bool isValid, ) = ERC20EnforcementModuleInternal._checkActiveBalance(from, value);
        if (!isValid) {
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
    ) public view virtual override(ValidationModulePolicyEngine) returns (bool) {
        (bool isValid, ) = ERC20EnforcementModuleInternal._checkActiveBalance(from, value);
        if (!isValid) {
            return false;
        } else {
            return ValidationModulePolicyEngine.canTransferFrom(spender, from, to, value);
        }
    }

    function _authorizeAttachPolicyEngine(address) internal virtual override onlyRole(DEFAULT_ADMIN_ROLE) {}

    /**
     * @notice Permit detaching the PolicyEngine (setting it to the zero address).
     * @dev The Lite variant keeps CMTAT role-based access control and uses the PolicyEngine only for
     * transfer validation, so the engine is optional. Relaxing the base non-zero requirement lets an
     * admin detach it: ACE policy validation is then disabled while CMTAT's native validation (pause,
     * enforcement, allowlist, ...) stays in force, and the transfer path already treats a zero engine
     * as "no policy enforcement" (see {ValidationModulePolicyEngine}).
     *
     * The Standard variant deliberately does NOT override this: its access control is
     * policy-authoritative (every privileged operation is `runPolicy`-gated), so a zero engine would
     * brick the token, and the base non-zero requirement must hold.
     */
    // Empty on purpose: overriding the base with no body drops its `require(engine != 0)` check,
    // which is what allows the engine to be detached (set to the zero address) on Lite.
    function _validatePolicyEngine(address) internal virtual override(PolicyProtectedBaseUpgradeable) {}

    /*//////////////////////////////////////////////////////////////
                            INTERNAL/PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /* ==== Access Control ==== */
    function _authorizePause() internal virtual override(PauseModule) onlyRole(PAUSER_ROLE) {}
    function _authorizeDeactivate() internal virtual override(PauseModule) onlyRole(DEFAULT_ADMIN_ROLE) {}

    function _authorizeFreeze() internal virtual override(EnforcementModule) onlyRole(ENFORCER_ROLE) {}

    /* ==== Transfer/mint/burn restriction ==== */
    function _checkTransferred(
        address spender,
        address from,
        address to,
        uint256 value
    ) internal virtual override(CMTATBaseCommon) {
        CMTATBaseCommon._checkTransferred(spender, from, to, value);
        require(
            ValidationModulePolicyEngine._transferred(spender, from, to, value),
            ERC7943CannotTransfer(from, to, value)
        );
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(CMTATBaseAccessControl, PolicyProtectedBaseUpgradeable) returns (bool) {
        return
            interfaceId == type(IERC7943Fungible).interfaceId ||
            CMTATBaseAccessControl.supportsInterface(interfaceId) ||
            PolicyProtectedBaseUpgradeable.supportsInterface(interfaceId);
    }

    /**
     * @inheritdoc CCTVersionModule
     * @dev Resolves the diamond between CMTAT's {VersionModule} and {CCTVersionModule}; reports the
     * CMTAT-ACE integration release version.
     */
    function version() public view virtual override(VersionModule, CCTVersionModule) returns (string memory version_) {
        return CCTVersionModule.version();
    }
}
