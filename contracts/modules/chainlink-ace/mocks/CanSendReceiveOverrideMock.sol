// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {ComplianceTokenCMTATStandalone} from "../../../deployment/standard/ComplianceTokenCMTATStandalone.sol";
import {ICMTATConstructor} from "CMTAT/interfaces/technical/ICMTATConstructor.sol";

/**
 * @dev WARNING: test-only mock. Not designed, reviewed, or hardened for production.
 *
 * The Standard variant's ERC-7943 account-eligibility hooks (`canSend`/`canReceive`) always
 * return `true` in {CCTCommon} (eligibility is decided per-transfer by the PolicyEngine). They are
 * `virtual` extension points, so their effect on {canTransfer}/{canTransferFrom} is only observable
 * once overridden. This mock makes them toggleable so the `!canSend(from)` / `!canReceive(to)`
 * branches can be exercised by tests.
 */
contract CanSendReceiveOverrideMock is ComplianceTokenCMTATStandalone {
    bool private _sendAllowed = true;
    bool private _receiveAllowed = true;

    constructor(
        address admin_,
        ICMTATConstructor.ERC20Attributes memory ERC20Attributes_,
        ICMTATConstructor.ExtraInformationAttributes memory extraInformationAttributes_,
        address policyEngine_
    ) ComplianceTokenCMTATStandalone(admin_, ERC20Attributes_, extraInformationAttributes_, policyEngine_) {}

    function setSendAllowed(bool allowed) external {
        _sendAllowed = allowed;
    }

    function setReceiveAllowed(bool allowed) external {
        _receiveAllowed = allowed;
    }

    function canSend(address) public view override returns (bool) {
        return _sendAllowed;
    }

    function canReceive(address) public view override returns (bool) {
        return _receiveAllowed;
    }
}
