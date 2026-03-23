// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.20;

import {IPolicyEngine} from "@chainlink/policy-management/interfaces/IPolicyEngine.sol";
import {Policy} from "@chainlink/policy-management/core/Policy.sol";

/**
 * @title TransferValidationPolicy
 * @notice A policy that validates ERC-20 transfers and mints against configurable amount limits.
 * @dev Mimics CMTAT's RuleEngine validation pattern as a Chainlink ACE policy.
 *
 * This policy expects to be registered with the ERC20TransferExtractor, receiving three parameters:
 *   - parameters[0]: abi.encode(from)   — sender address (address(0) for mints)
 *   - parameters[1]: abi.encode(to)     — recipient address
 *   - parameters[2]: abi.encode(amount) — transfer amount
 *
 * Validation rules:
 *   - Mints (from == address(0)): rejected if amount > maxMintAmount
 *   - Standard transfers (from != address(0)): rejected if amount > maxTransferAmount
 *   - A limit of 0 means no restriction for that transfer type
 */
contract TransferValidationPolicy is Policy {
    string public constant override typeAndVersion = "TransferValidationPolicy 1.0.0";

    /**
     * @notice Emitted when the maximum transfer amount is updated.
     * @param maxTransferAmount The new maximum transfer amount.
     */
    event MaxTransferAmountSet(uint256 maxTransferAmount);

    /**
     * @notice Emitted when the maximum mint amount is updated.
     * @param maxMintAmount The new maximum mint amount.
     */
    event MaxMintAmountSet(uint256 maxMintAmount);

    /// @custom:storage-location erc7201:chainlink.ace.TransferValidationPolicy
    struct TransferValidationPolicyStorage {
        /// @notice Maximum amount allowed for standard transfers. 0 = no limit.
        uint256 maxTransferAmount;
        /// @notice Maximum amount allowed for mints. 0 = no limit.
        uint256 maxMintAmount;
    }

    // keccak256(abi.encode(uint256(keccak256("chainlink.ace.TransferValidationPolicy")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant TransferValidationPolicyStorageLocation =
        0xb4a6e2aee0be9e9e88c3153d71ee13d7f1b7e08f72e6a7e0b4e454e7d42f3e00;

    function _getTransferValidationPolicyStorage()
        private
        pure
        returns (TransferValidationPolicyStorage storage $)
    {
        assembly {
            $.slot := TransferValidationPolicyStorageLocation
        }
    }

    /**
     * @notice Configures the policy with initial transfer and mint limits.
     * @dev Decoded parameters: (uint256 maxTransferAmount, uint256 maxMintAmount).
     *      A value of 0 means no restriction for that type.
     * @param parameters ABI-encoded (uint256, uint256).
     */
    function configure(bytes calldata parameters) internal override {
        (uint256 maxTransferAmount, uint256 maxMintAmount) =
            abi.decode(parameters, (uint256, uint256));

        TransferValidationPolicyStorage storage $ = _getTransferValidationPolicyStorage();
        $.maxTransferAmount = maxTransferAmount;
        $.maxMintAmount = maxMintAmount;

        emit MaxTransferAmountSet(maxTransferAmount);
        emit MaxMintAmountSet(maxMintAmount);
    }

    /**
     * @notice Updates the maximum transfer amount.
     * @param maxTransferAmount The new limit. 0 disables the restriction.
     */
    function setMaxTransferAmount(uint256 maxTransferAmount) external onlyOwner {
        TransferValidationPolicyStorage storage $ = _getTransferValidationPolicyStorage();
        require(maxTransferAmount != $.maxTransferAmount, "value same as current");
        $.maxTransferAmount = maxTransferAmount;
        emit MaxTransferAmountSet(maxTransferAmount);
    }

    /**
     * @notice Updates the maximum mint amount.
     * @param maxMintAmount The new limit. 0 disables the restriction.
     */
    function setMaxMintAmount(uint256 maxMintAmount) external onlyOwner {
        TransferValidationPolicyStorage storage $ = _getTransferValidationPolicyStorage();
        require(maxMintAmount != $.maxMintAmount, "value same as current");
        $.maxMintAmount = maxMintAmount;
        emit MaxMintAmountSet(maxMintAmount);
    }

    /// @notice Returns the current maximum transfer amount. 0 means no limit.
    function getMaxTransferAmount() external view returns (uint256) {
        return _getTransferValidationPolicyStorage().maxTransferAmount;
    }

    /// @notice Returns the current maximum mint amount. 0 means no limit.
    function getMaxMintAmount() external view returns (uint256) {
        return _getTransferValidationPolicyStorage().maxMintAmount;
    }

    /**
     * @notice Validates the transfer against configured limits.
     * @dev Expected parameters (mapped from ERC20TransferExtractor via policyParameterNames):
     *      parameters[0] = abi.encode(from)
     *      parameters[1] = abi.encode(to)
     *      parameters[2] = abi.encode(amount)
     * @return result PolicyResult.Continue if the transfer is valid; reverts otherwise.
     */
    function run(
        address, /*caller*/
        address, /*subject*/
        bytes4,  /*selector*/
        bytes[] calldata parameters,
        bytes calldata /*context*/
    )
        public
        view
        override
        returns (IPolicyEngine.PolicyResult)
    {
        if (parameters.length != 3) {
            revert InvalidParameters("expected 3 parameters: from, to, amount");
        }

        address from = abi.decode(parameters[0], (address));
        // to is not used for validation but is decoded for completeness
        // address to = abi.decode(parameters[1], (address));
        uint256 amount = abi.decode(parameters[2], (uint256));

        TransferValidationPolicyStorage storage $ = _getTransferValidationPolicyStorage();

        if (from == address(0)) {
            // Mint: check against mint limit
            if ($.maxMintAmount > 0 && amount > $.maxMintAmount) {
                revert IPolicyEngine.PolicyRejected("mint amount exceeds maximum");
            }
        } else {
            // Standard transfer or burn: check against transfer limit
            if ($.maxTransferAmount > 0 && amount > $.maxTransferAmount) {
                revert IPolicyEngine.PolicyRejected("transfer amount exceeds maximum");
            }
        }

        return IPolicyEngine.PolicyResult.Continue;
    }
}
