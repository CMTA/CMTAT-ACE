// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {IRule} from "../../../../submodules/RuleEngine/src/interfaces/IRule.sol";

/**
 * @dev WARNING: Mock rule contracts for tests/examples only.
 *      Not designed, reviewed, or hardened for production deployments.
 */

/**
 * @title MaxAmountRule
 * @notice Rejects transfers where the amount exceeds a configurable maximum.
 */
contract MaxAmountRule is IRule {
    uint256 public immutable maxAmount;
    uint8 constant AMOUNT_TOO_HIGH = 13;

    /// @notice Thrown by the `transferred` enforcement hook when the rule rejects a transfer.
    error MaxAmountRule_InvalidTransfer(address from, address to, uint256 value, uint8 code);

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

    function canTransferFrom(
        address /* spender */,
        address from,
        address to,
        uint256 amount
    ) external view override returns (bool) {
        return canTransfer(from, to, amount);
    }

    /**
     * @notice Enforcement hook invoked by the token during a transfer.
     * @dev Reverts when the rule rejects the transfer, mirroring CMTAT RuleEngine semantics.
     */
    function transferred(address from, address to, uint256 value) external view override {
        uint8 code = detectTransferRestriction(from, to, value);
        require(code == uint8(REJECTED_CODE_BASE.TRANSFER_OK), MaxAmountRule_InvalidTransfer(from, to, value, code));
    }

    function transferred(address spender, address from, address to, uint256 value) external view override {
        uint8 code = detectTransferRestrictionFrom(spender, from, to, value);
        require(code == uint8(REJECTED_CODE_BASE.TRANSFER_OK), MaxAmountRule_InvalidTransfer(from, to, value, code));
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IRule).interfaceId;
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

    /// @notice Emitted whenever an account's restricted status is set (incl. initial list at deploy).
    event RestrictionUpdated(address indexed account, bool restricted);

    /// @notice Thrown when a non-owner calls an owner-restricted function.
    error OnlyOwner();

    /// @notice Thrown by the `transferred` enforcement hook when the rule rejects a transfer.
    error RestrictedAddressRule_InvalidTransfer(address from, address to, uint256 value, uint8 code);

    mapping(address => bool) public restricted;
    address public immutable owner;

    modifier onlyOwner() {
        require(msg.sender == owner, OnlyOwner());
        _;
    }

    constructor(address[] memory restricted_) {
        owner = msg.sender;
        for (uint256 i = 0; i < restricted_.length; ++i) {
            restricted[restricted_[i]] = true;
            emit RestrictionUpdated(restricted_[i], true);
        }
    }

    function setRestricted(address account, bool status) external onlyOwner {
        restricted[account] = status;
        emit RestrictionUpdated(account, status);
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

    function canTransferFrom(
        address /* spender */,
        address from,
        address to,
        uint256 amount
    ) external view override returns (bool) {
        return canTransfer(from, to, amount);
    }

    /**
     * @notice Enforcement hook invoked by the token during a transfer.
     * @dev Reverts when either party is restricted, mirroring CMTAT RuleEngine semantics.
     */
    function transferred(address from, address to, uint256 value) external view override {
        uint8 code = detectTransferRestriction(from, to, value);
        require(
            code == uint8(REJECTED_CODE_BASE.TRANSFER_OK),
            RestrictedAddressRule_InvalidTransfer(from, to, value, code)
        );
    }

    function transferred(address spender, address from, address to, uint256 value) external view override {
        uint8 code = detectTransferRestrictionFrom(spender, from, to, value);
        require(
            code == uint8(REJECTED_CODE_BASE.TRANSFER_OK),
            RestrictedAddressRule_InvalidTransfer(from, to, value, code)
        );
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IRule).interfaceId;
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

/**
 * @title CumulativeCapRule
 * @notice STATEFUL rule: caps the cumulative amount each `from` may send. State (`sent`) is advanced ONLY by the
 *         `transferred` enforcement hook, so it is enforced only if that hook is actually invoked on executed
 *         transfers — the exact behavior NM-2 is about. `detect*` is a pure view of the current state.
 */
contract CumulativeCapRule is IRule {
    uint8 constant CAP_EXCEEDED = 20;
    uint256 public immutable cap;
    mapping(address account => uint256 sentSoFar) public sent;

    constructor(uint256 cap_) {
        cap = cap_;
    }

    function detectTransferRestriction(
        address from,
        address /* to */,
        uint256 amount
    ) public view override returns (uint8) {
        return sent[from] + amount > cap ? CAP_EXCEEDED : uint8(REJECTED_CODE_BASE.TRANSFER_OK);
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

    function canTransferFrom(
        address /* spender */,
        address from,
        address to,
        uint256 amount
    ) external view override returns (bool) {
        return canTransfer(from, to, amount);
    }

    /// @notice Enforcement hook: advances `sent[from]` (state-mutating — NOT a view).
    function transferred(address from, address /* to */, uint256 value) external override {
        sent[from] += value;
    }

    function transferred(address /* spender */, address from, address /* to */, uint256 value) external override {
        sent[from] += value;
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IRule).interfaceId;
    }

    function canReturnTransferRestrictionCode(uint8 code) public pure override returns (bool) {
        return code == CAP_EXCEEDED;
    }

    function messageForTransferRestriction(uint8 code) external pure override returns (string memory) {
        return code == CAP_EXCEEDED ? "Cumulative cap exceeded" : "Unknown code";
    }
}

/**
 * @title TransferredEnforcedCapRule
 * @notice STATEFUL rule that enforces SOLELY in `transferred` (the CMTAT RuleEngine pattern: the write path
 *         calls `transferred` per rule, never `detect*`). `detectTransferRestriction*` always returns OK, so the
 *         policy's `run`/veto cannot catch the violation — only `postRun` calling `transferred` enforces it.
 *         Proves the integration replicates CMTAT's transferred-based enforcement.
 */
contract TransferredEnforcedCapRule is IRule {
    error CumulativeCapExceeded(address from, uint256 sent, uint256 cap);
    uint256 public immutable cap;
    mapping(address account => uint256 sentSoFar) public sent;

    constructor(uint256 cap_) {
        cap = cap_;
    }

    function detectTransferRestriction(address, address, uint256) public pure override returns (uint8) {
        return uint8(REJECTED_CODE_BASE.TRANSFER_OK); // intentionally permissive: enforcement is in transferred
    }

    function detectTransferRestrictionFrom(address, address, address, uint256) public pure override returns (uint8) {
        return uint8(REJECTED_CODE_BASE.TRANSFER_OK);
    }

    function canTransfer(address from, address to, uint256 amount) public view override returns (bool) {
        return sent[from] + amount <= cap;
    }

    function canTransferFrom(
        address /* spender */,
        address from,
        address to,
        uint256 amount
    ) external view override returns (bool) {
        return canTransfer(from, to, amount);
    }

    function transferred(address from, address /* to */, uint256 value) external override {
        _apply(from, value);
    }

    function transferred(address /* spender */, address from, address /* to */, uint256 value) external override {
        _apply(from, value);
    }

    function _apply(address from, uint256 value) internal {
        sent[from] += value;
        require(sent[from] <= cap, CumulativeCapExceeded(from, sent[from], cap)); // enforce on the state path
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IRule).interfaceId;
    }

    function canReturnTransferRestrictionCode(uint8) public pure override returns (bool) {
        return false;
    }

    function messageForTransferRestriction(uint8) external pure override returns (string memory) {
        return "Unknown code";
    }
}
