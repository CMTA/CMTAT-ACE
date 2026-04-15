// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {IRule} from "../../../../submodules/CMTAT/contracts/mocks/RuleEngine/interfaces/IRule.sol";

/**
 * @title MaxAmountRule
 * @notice Rejects transfers where the amount exceeds a configurable maximum.
 */
contract MaxAmountRule is IRule {
    uint256 public immutable maxAmount;
    uint8 constant AMOUNT_TOO_HIGH = 13;

    constructor(uint256 maxAmount_) {
        maxAmount = maxAmount_;
    }

    function detectTransferRestriction(
        address /* from */,
        address /* to */,
        uint256 amount
    ) public view override returns (uint8) {
        return amount > maxAmount ? AMOUNT_TOO_HIGH : uint8(REJECTED_CODE_BASE.TRANSFER_OK);
    }

    function detectTransferRestrictionFrom(
        address /* spender */,
        address from,
        address to,
        uint256 amount
    ) public view override returns (uint8) {
        return detectTransferRestriction(from, to, amount);
    }

    function canTransfer(address from, address to, uint256 amount) public view override returns (bool) {
        return detectTransferRestriction(from, to, amount) == 0;
    }

    function canReturnTransferRestrictionCode(uint8 code) public pure override returns (bool) {
        return code == AMOUNT_TOO_HIGH;
    }

    function messageForTransferRestriction(uint8 code) external pure override returns (string memory) {
        return code == AMOUNT_TOO_HIGH ? "Amount exceeds maximum" : "Unknown code";
    }
}

/**
 * @title RestrictedAddressRule
 * @notice Rejects transfers involving addresses on a restricted list.
 */
contract RestrictedAddressRule is IRule {
    uint8 constant FROM_RESTRICTED = 14;
    uint8 constant TO_RESTRICTED = 15;

    mapping(address => bool) public restricted;
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    constructor(address[] memory restricted_) {
        owner = msg.sender;
        for (uint256 i = 0; i < restricted_.length; ++i) {
            restricted[restricted_[i]] = true;
        }
    }

    function setRestricted(address account, bool status) external onlyOwner {
        restricted[account] = status;
    }

    function detectTransferRestriction(
        address from,
        address to,
        uint256 /* amount */
    ) public view override returns (uint8) {
        if (restricted[from]) return FROM_RESTRICTED;
        if (restricted[to]) return TO_RESTRICTED;
        return uint8(REJECTED_CODE_BASE.TRANSFER_OK);
    }

    function detectTransferRestrictionFrom(
        address /* spender */,
        address from,
        address to,
        uint256 amount
    ) public view override returns (uint8) {
        return detectTransferRestriction(from, to, amount);
    }

    function canTransfer(address from, address to, uint256 amount) public view override returns (bool) {
        return detectTransferRestriction(from, to, amount) == 0;
    }

    function canReturnTransferRestrictionCode(uint8 code) public pure override returns (bool) {
        return code == FROM_RESTRICTED || code == TO_RESTRICTED;
    }

    function messageForTransferRestriction(uint8 code) external pure override returns (string memory) {
        if (code == FROM_RESTRICTED) return "Sender is restricted";
        if (code == TO_RESTRICTED) return "Recipient is restricted";
        return "Unknown code";
    }
}
