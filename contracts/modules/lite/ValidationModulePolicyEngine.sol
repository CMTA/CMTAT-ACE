// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {ValidationModuleCore} from "CMTAT/modules/wrapper/core/ValidationModuleCore.sol";
import {PolicyProtectedBaseUpgradeable} from "@chainlink/policy-management/core/PolicyProtectedBaseUpgradeable.sol";
import {IPolicyEngine} from "@chainlink/policy-management/interfaces/IPolicyEngine.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

abstract contract ValidationModulePolicyEngine is ValidationModuleCore, PolicyProtectedBaseUpgradeable {
    /*//////////////////////////////////////////////////////////////
                            PUBLIC/EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /* ============ View functions ============ */
    /**
     * @inheritdoc ValidationModuleCore
     * @dev call the policy engine if set
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
     * @dev call the policy engine if set
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
    function _canTransfer(address from, address to, uint256 value) internal view virtual returns (bool) {
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

    function _canTransferFromWithPolicyEngine(
        address spender,
        address from,
        address to,
        uint256 value
    ) internal view virtual returns (bool) {
        return _tryCheckPolicies(IERC20.transferFrom.selector, spender, abi.encode(from, to, value));
    }

    function _canTransferWithPolicyEngine(
        address from,
        address to,
        uint256 value
    ) internal view virtual returns (bool) {
        return _tryCheckPolicies(IERC20.transfer.selector, from, abi.encode(to, value));
    }

    function _tryCheckPolicies(bytes4 selector, address sender, bytes memory data) internal view returns (bool) {
        IPolicyEngine policyEngine_ = IPolicyEngine(getPolicyEngine());
        if (address(policyEngine_) != address(0)) {
            bytes memory context = getContext();
            try
                policyEngine_.check(
                    IPolicyEngine.Payload({selector: selector, sender: sender, data: data, context: context})
                )
            {
                return true;
            } catch {
                return false;
            }
        } else {
            return true;
        }
    }

    /* ============ State functions ============ */
    function _transferred(
        address spender,
        address from,
        address to,
        uint256 /* value */
    ) internal virtual returns (bool) {
        _canTransferGenericByModuleAndRevert(spender, from, to);
        IPolicyEngine policyEngine_ = IPolicyEngine(getPolicyEngine());
        if (address(policyEngine_) != address(0)) {
            bytes memory context = getContext();
            policyEngine_.run(
                IPolicyEngine.Payload({selector: msg.sig, sender: _msgSender(), data: msg.data[4:], context: context})
            );
            if (context.length > 0) {
                clearContext();
            }
        }
        return true;
    }
}
