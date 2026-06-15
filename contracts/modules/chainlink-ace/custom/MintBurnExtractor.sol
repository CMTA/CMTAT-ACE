// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.20;

import {IExtractor} from "@chainlink/policy-management/interfaces/IExtractor.sol";
import {IPolicyEngine} from "@chainlink/policy-management/interfaces/IPolicyEngine.sol";

/**
 * @title MintBurnExtractor
 * @notice Extracts parameters from CMTAT mint and burn function calls.
 * @dev Handles:
 *        - mint(address account, uint256 amount)       → 0x40c10f19
 *        - burnFrom(address account, uint256 amount)   → 0x79cc6790
 *        - burn(uint256 amount)                        → 0x42966c68
 */
contract MintBurnExtractor is IExtractor {
    string public constant override typeAndVersion = "MintBurnExtractor 1.0.0";

    bytes32 public constant PARAM_ACCOUNT = keccak256("account");
    bytes32 public constant PARAM_AMOUNT = keccak256("amount");

    // mint(address,uint256)
    bytes4 private constant MINT_SELECTOR = bytes4(keccak256("mint(address,uint256)"));
    // burnFrom(address,uint256)
    bytes4 private constant BURN_FROM_SELECTOR = bytes4(keccak256("burnFrom(address,uint256)"));
    // burn(uint256)
    bytes4 private constant BURN_SELECTOR = bytes4(keccak256("burn(uint256)"));

    function extract(
        IPolicyEngine.Payload calldata payload
    ) external pure override returns (IPolicyEngine.Parameter[] memory) {
        address account;
        uint256 amount;

        if (payload.selector == MINT_SELECTOR || payload.selector == BURN_FROM_SELECTOR) {
            (account, amount) = abi.decode(payload.data, (address, uint256));
        } else if (payload.selector == BURN_SELECTOR) {
            account = payload.sender;
            (amount) = abi.decode(payload.data, (uint256));
        } else {
            revert IPolicyEngine.UnsupportedSelector(payload.selector);
        }

        IPolicyEngine.Parameter[] memory result = new IPolicyEngine.Parameter[](2);
        result[0] = IPolicyEngine.Parameter(PARAM_ACCOUNT, abi.encode(account));
        result[1] = IPolicyEngine.Parameter(PARAM_AMOUNT, abi.encode(amount));
        return result;
    }
}
