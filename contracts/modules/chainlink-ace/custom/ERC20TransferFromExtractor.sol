// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.20;

import {IExtractor} from "@chainlink/policy-management/interfaces/IExtractor.sol";
import {IPolicyEngine} from "@chainlink/policy-management/interfaces/IPolicyEngine.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ERC20TransferFromExtractor
 * @notice Extends the standard ERC20TransferExtractor by also extracting the
 *         spender address, enabling policies to validate transferFrom approvals.
 * @dev Handles:
 *      - transfer(address to, uint256 amount):
 *          spender = sender, from = sender, to = decoded, amount = decoded
 *      - transferFrom(address from, address to, uint256 amount):
 *          spender = sender, from = decoded, to = decoded, amount = decoded
 *
 *      Returns 4 parameters: [spender, from, to, amount]
 */
contract ERC20TransferFromExtractor is IExtractor {
    string public constant override typeAndVersion = "ERC20TransferFromExtractor 1.0.0";

    bytes32 public constant PARAM_SPENDER = keccak256("spender");
    bytes32 public constant PARAM_FROM = keccak256("from");
    bytes32 public constant PARAM_TO = keccak256("to");
    bytes32 public constant PARAM_AMOUNT = keccak256("amount");

    function extract(
        IPolicyEngine.Payload calldata payload
    ) external pure override returns (IPolicyEngine.Parameter[] memory) {
        address spender;
        address from;
        address to;
        uint256 amount;

        if (payload.selector == IERC20.transfer.selector) {
            spender = payload.sender;
            from = payload.sender;
            (to, amount) = abi.decode(payload.data, (address, uint256));
        } else if (payload.selector == IERC20.transferFrom.selector) {
            spender = payload.sender;
            (from, to, amount) = abi.decode(payload.data, (address, address, uint256));
        } else {
            revert IPolicyEngine.UnsupportedSelector(payload.selector);
        }

        IPolicyEngine.Parameter[] memory result = new IPolicyEngine.Parameter[](4);
        result[0] = IPolicyEngine.Parameter(PARAM_SPENDER, abi.encode(spender));
        result[1] = IPolicyEngine.Parameter(PARAM_FROM, abi.encode(from));
        result[2] = IPolicyEngine.Parameter(PARAM_TO, abi.encode(to));
        result[3] = IPolicyEngine.Parameter(PARAM_AMOUNT, abi.encode(amount));

        return result;
    }
}
