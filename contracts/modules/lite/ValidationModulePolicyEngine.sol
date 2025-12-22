// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {ValidationModuleCore} from "../../../submodules/CMTAT/contracts/modules/wrapper/core/ValidationModuleCore.sol";
import {PolicyProtected} from "../../../submodules/chainlink-ace/packages/policy-management/src/core/PolicyProtected.sol";
import {IPolicyEngine} from "../../../submodules/chainlink-ace/packages/policy-management/src/interfaces/IPolicyEngine.sol";


abstract contract ValidationModulePolicyEngine is ValidationModuleCore, PolicyProtected {


    /*//////////////////////////////////////////////////////////////
                            PUBLIC/EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /* ============ View functions ============ */
    /**
    * @inheritdoc ValidationModuleCore
    * @dev call the ruleEngine if set
    */
    function canTransfer(
        address from,
        address to,
        uint256 value
    ) public view virtual override(ValidationModuleCore) returns (bool) {
       return _canTransfer(from, to, value);
    }

    /**
    * @inheritdoc ValidationModuleCore
    * @dev call the ruleEngine if set
    */
    function canTransferFrom(
        address spender,
        address from,
        address to,
        uint256 value
    ) public view virtual override(ValidationModuleCore) returns (bool) {
        return _canTransferFrom(spender, from, to, value);
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL/PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /* ============ View functions ============ */
    function _canTransfer(
        address from,
        address to,
        uint256 value)
    internal view virtual returns (bool) {
       if (!ValidationModuleCore.canTransfer(from, to, value)) {
            return false;
        } else {
            return _canTransferWithPolicyEngine(from, to, value);
        }
    }

    function _canTransferFrom(
        address spender,
        address from,
        address to,
        uint256 value
    ) internal view virtual returns (bool) {
        if (!ValidationModuleCore.canTransferFrom(spender, from, to, value)) {
            return false;
        } else {
            return _canTransferFromWithPolicyEngine(spender, from, to, value);
        }
    }

    // Note: parameters are kept to retain the interface, even if not used
    function _canTransferFromWithPolicyEngine(
        address spender,
        address from,
        address to,
        uint256 value
    ) internal view virtual returns (bool) {
        return _tryRunPolicies();
    }

    // Note: parameters are kept to retain the interface, even if not used
    function _canTransferWithPolicyEngine(
        address from,
        address to,
        uint256 value
    ) internal view virtual returns (bool) {
        return _tryRunPolicies();
    }

    function _tryRunPolicies() internal view returns(bool) {
        IPolicyEngine policyEngine_ = IPolicyEngine(getPolicyEngine());
        if (address(policyEngine_) != address(0)) {
            bytes memory context = getContext();
            try policyEngine_.check(
                IPolicyEngine.Payload({selector: msg.sig, sender: msg.sender, data: msg.data[4:], context: context})
            ) 
            {
                return true;
            }
            catch {
                return false;
            }
        } else {
            return true;
        }
    }


    /* ============ State functions ============ */
    function _transferred(address spender, address from, address to, uint256 value) internal virtual returns (bool) {
        if(!_canTransferGenericByModule(spender, from, to)) {
            return false;
        } else {
             IPolicyEngine policyEngine_ = IPolicyEngine(getPolicyEngine());
             if (address(policyEngine_) != address(0)){
                bytes memory context = getContext();
                policyEngine_.run(
                    IPolicyEngine.Payload({selector: msg.sig, sender: msg.sender, data: msg.data[4:], context: context}));
            }
        }
        return true;
    }
    
}