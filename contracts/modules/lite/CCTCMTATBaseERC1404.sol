// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {CCTCMTATBasePolicyEngine} from "./CCTCMTATBasePolicyEngine.sol";
import {PolicyValidationModuleERC1404, IERC1404, IERC1404Extend} from "./PolicyValidationModuleERC1404.sol";
import {ValidationModuleCore} from "CMTAT/modules/wrapper/core/ValidationModuleCore.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {
    ERC20EnforcementModule,
    ERC20EnforcementModuleInternal
} from "CMTAT/modules/wrapper/extensions/ERC20EnforcementModule.sol";

abstract contract CCTCMTATBaseERC1404 is CCTCMTATBasePolicyEngine, PolicyValidationModuleERC1404 {
    /**
     * @dev ERC20EnforcementModule error text
     */
    string internal constant TEXT_TRANSFER_REJECTED_FROM_INSUFFICIENT_ACTIVE_BALANCE =
        "AddrFrom:insufficientActiveBalance";

    /**
     * @notice ERC-1404 restriction code returned when the ACE PolicyEngine rejects the transfer.
     * @dev Chosen outside the CMTAT `REJECTED_CODE_BASE` enum range so it never collides with the
     * module-level codes. Returned by {detectTransferRestriction} / {detectTransferRestrictionFrom}
     * when the module checks pass but the PolicyEngine (KYC/sanctions/limits/...) would reject.
     */
    uint8 public constant TRANSFER_REJECTED_BY_POLICY_ENGINE_CODE = 200;
    string internal constant TEXT_TRANSFER_REJECTED_BY_POLICY_ENGINE = "PolicyEngine:transferRejected";
    /*//////////////////////////////////////////////////////////////
                            PUBLIC/EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @inheritdoc PolicyValidationModuleERC1404
     */
    function messageForTransferRestriction(
        uint8 restrictionCode
    ) public view virtual override(PolicyValidationModuleERC1404) returns (string memory message) {
        if (
            restrictionCode ==
            uint8(IERC1404Extend.REJECTED_CODE_BASE.TRANSFER_REJECTED_FROM_INSUFFICIENT_ACTIVE_BALANCE)
        ) {
            return TEXT_TRANSFER_REJECTED_FROM_INSUFFICIENT_ACTIVE_BALANCE;
        } else if (restrictionCode == TRANSFER_REJECTED_BY_POLICY_ENGINE_CODE) {
            return TEXT_TRANSFER_REJECTED_BY_POLICY_ENGINE;
        } else {
            return PolicyValidationModuleERC1404.messageForTransferRestriction(restrictionCode);
        }
    }

    /**
     * @notice ERC-1404 transfer-restriction code, made PolicyEngine-aware.
     * @dev Runs the CMTAT module checks first (pause/deactivate/freeze/active-balance); if those
     * pass, consults the ACE PolicyEngine and returns {TRANSFER_REJECTED_BY_POLICY_ENGINE_CODE}
     * (200) when the engine would reject. Never reverts: the engine `check` is wrapped in
     * try/catch, so this stays a valid (non-reverting) ERC-1404 view.
     */
    function detectTransferRestriction(
        address from,
        address to,
        uint256 value
    ) public view virtual override(PolicyValidationModuleERC1404) returns (uint8 code) {
        code = PolicyValidationModuleERC1404.detectTransferRestriction(from, to, value);
        if (code != uint8(IERC1404Extend.REJECTED_CODE_BASE.TRANSFER_OK)) {
            return code;
        }
        if (!_canTransferWithPolicyEngine(from, to, value)) {
            return TRANSFER_REJECTED_BY_POLICY_ENGINE_CODE;
        }
        return code;
    }

    /**
     * @notice ERC-1404 transferFrom restriction code, made PolicyEngine-aware (spender included).
     * @dev See {detectTransferRestriction}; uses the `transferFrom` policy path with `spender`.
     */
    function detectTransferRestrictionFrom(
        address spender,
        address from,
        address to,
        uint256 value
    ) public view virtual override(PolicyValidationModuleERC1404) returns (uint8 code) {
        code = PolicyValidationModuleERC1404.detectTransferRestrictionFrom(spender, from, to, value);
        if (code != uint8(IERC1404Extend.REJECTED_CODE_BASE.TRANSFER_OK)) {
            return code;
        }
        if (!_canTransferFromWithPolicyEngine(spender, from, to, value)) {
            return TRANSFER_REJECTED_BY_POLICY_ENGINE_CODE;
        }
        return code;
    }

    /**
     * @inheritdoc CCTCMTATBasePolicyEngine
     */
    function canTransfer(
        address from,
        address to,
        uint256 value
    ) public view virtual override(CCTCMTATBasePolicyEngine, ValidationModuleCore) returns (bool) {
        return CCTCMTATBasePolicyEngine.canTransfer(from, to, value);
    }

    /**
     * @inheritdoc CCTCMTATBasePolicyEngine
     */
    function canTransferFrom(
        address spender,
        address from,
        address to,
        uint256 value
    ) public view virtual override(CCTCMTATBasePolicyEngine, ValidationModuleCore) returns (bool) {
        return CCTCMTATBasePolicyEngine.canTransferFrom(spender, from, to, value);
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL/PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function _detectTransferRestriction(
        address from,
        address to,
        uint256 value
    ) internal view virtual override(PolicyValidationModuleERC1404) returns (uint8 code) {
        uint256 frozenTokensLocal = ERC20EnforcementModule.getFrozenTokens(from);
        if (frozenTokensLocal > 0) {
            uint256 activeBalance = ERC20Upgradeable.balanceOf(from) - frozenTokensLocal;
            if (value > activeBalance) {
                return uint8(IERC1404Extend.REJECTED_CODE_BASE.TRANSFER_REJECTED_FROM_INSUFFICIENT_ACTIVE_BALANCE);
            }
        }
        return PolicyValidationModuleERC1404._detectTransferRestriction(from, to, value);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(CCTCMTATBasePolicyEngine) returns (bool) {
        return CCTCMTATBasePolicyEngine.supportsInterface(interfaceId);
    }
}
