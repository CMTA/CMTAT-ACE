// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.20;

/**
 * @title IERC7943Fungible (uRWA — ERC-20 profile)
 * @notice Canonical combined interface for the ERC-7943 (uRWA) fungible profile.
 * @dev The ERC-165 interface id of this exact function set is `0x3edbb4c4`, as pinned by the
 *      ERC-7943 specification for the fungible interface. It is used by the ComplianceToken
 *      variants to advertise uRWA support via `supportsInterface`.
 */
interface IERC7943Fungible {
    /// @notice Force-moves `amount` from `from` to `to` (regulatory/recovery). Restricted.
    function forcedTransfer(address from, address to, uint256 amount) external returns (bool result);

    /// @notice Overwrites the frozen amount for `account` (may exceed balance). Restricted.
    function setFrozenTokens(address account, uint256 amount) external returns (bool result);

    /// @notice Returns the currently frozen amount for `account`.
    function getFrozenTokens(address account) external view returns (uint256 amount);

    /// @notice Transfer-level authorization check (unfrozen amount + permissioned rules). MUST NOT revert.
    function canTransfer(address from, address to, uint256 amount) external view returns (bool allowed);

    /// @notice Account-level send eligibility (allowlist/KYC). MUST NOT revert, MUST NOT be quantitative.
    function canSend(address account) external view returns (bool allowed);

    /// @notice Account-level receive eligibility (allowlist/KYC). MUST NOT revert, MUST NOT be quantitative.
    function canReceive(address account) external view returns (bool allowed);
}
