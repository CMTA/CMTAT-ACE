// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {CCTCMTATBasePolicyEngine} from "./CCTCMTATBasePolicyEngine.sol";
import {PolicyValidationModuleERC1404, IERC1404, IERC1404Extend} from "./PolicyValidationModuleERC1404.sol";
import {ValidationModulePolicyEngine} from "./ValidationModulePolicyEngine.sol";
import {PolicyProtected} from "../../../submodules/chainlink-ace/packages/policy-management/src/core/PolicyProtected.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20EnforcementModule, ERC20EnforcementModuleInternal} from "../../../submodules/CMTAT/contracts/modules/wrapper/extensions/ERC20EnforcementModule.sol";


abstract contract CCTCMTATBaseERC1404 is
    CCTCMTATBasePolicyEngine,
    PolicyValidationModuleERC1404
{
    /**
    * @dev ERC20EnforcementModule error text
    */
    string internal constant TEXT_TRANSFER_REJECTED_FROM_INSUFFICIENT_ACTIVE_BALANCE =
        "AddrFrom:insufficientActiveBalance";
    /*//////////////////////////////////////////////////////////////
                            PUBLIC/EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
    * @inheritdoc PolicyValidationModuleERC1404
    */
    function messageForTransferRestriction(
        uint8 restrictionCode
    )  public view virtual override(PolicyValidationModuleERC1404)  returns (string memory message) {
        if (restrictionCode == uint8(IERC1404Extend.REJECTED_CODE_BASE.TRANSFER_REJECTED_FROM_INSUFFICIENT_ACTIVE_BALANCE)) {
            return TEXT_TRANSFER_REJECTED_FROM_INSUFFICIENT_ACTIVE_BALANCE;
        } else {
            return PolicyValidationModuleERC1404.messageForTransferRestriction(restrictionCode);
        }

    }

    /**
    * @inheritdoc ValidationModulePolicyEngine
    */
    function canTransfer(
        address from,
        address to,
        uint256 value
    ) public virtual override (CCTCMTATBasePolicyEngine, ValidationModulePolicyEngine) view returns (bool) {
        return CCTCMTATBasePolicyEngine.canTransfer(from, to, value);
    }

    /**
    * @inheritdoc ValidationModulePolicyEngine
    */
    function canTransferFrom(
        address spender,
        address from,
        address to,
        uint256 value
    ) public virtual override (CCTCMTATBasePolicyEngine, ValidationModulePolicyEngine) view returns (bool) {
        return CCTCMTATBasePolicyEngine.canTransferFrom(spender, from, to, value);
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL/PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function _detectTransferRestriction(
        address from,
        address to,
        uint256 value
    ) internal virtual override(PolicyValidationModuleERC1404) view  returns (uint8 code) {
        uint256 frozenTokensLocal = ERC20EnforcementModule.getFrozenTokens(from);
        if (frozenTokensLocal > 0) {
            uint256 activeBalance = ERC20Upgradeable.balanceOf(from) - frozenTokensLocal;
            if(value > activeBalance) {
                return uint8(IERC1404Extend.REJECTED_CODE_BASE.TRANSFER_REJECTED_FROM_INSUFFICIENT_ACTIVE_BALANCE);
            }
        } 
        return PolicyValidationModuleERC1404._detectTransferRestriction(from, to, value);
    }

    // Note: CCTCMTATBasePolicyEngine implements PolicyProtected
    function supportsInterface(bytes4 interfaceId) public view virtual override(CCTCMTATBasePolicyEngine, PolicyProtected) returns (bool) {
        return CCTCMTATBasePolicyEngine.supportsInterface(interfaceId);
    }
}