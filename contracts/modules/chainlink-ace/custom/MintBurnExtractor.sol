// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.20;

import {IExtractor} from "@chainlink/policy-management/interfaces/IExtractor.sol";
import {IPolicyEngine} from "@chainlink/policy-management/interfaces/IPolicyEngine.sol";

/**
 * @title MintBurnExtractor
 * @notice Extracts parameters from CMTAT mint and burn function calls.
 * @dev Emits both `account`/`amount` (used e.g. by SecureMintPolicy on mint) AND the transfer
 *      layout `from`/`to`/`amount`, so the same IRule transfer-restriction rules used by
 *      TransferValidationPolicy can also screen issuance/redemption (FEEDBACK.md H-1). A mint is
 *      modelled as a transfer from address(0); a burn as a transfer to address(0):
 *        - mint(address account, uint256 amount)     → from = 0,       to = account, amount  (0x40c10f19)
 *        - burnFrom(address account, uint256 amount) → from = account, to = 0,       amount  (0x79cc6790)
 *        - burn(uint256 amount)                       → from = sender,  to = 0,       amount  (0x42966c68)
 */
contract MintBurnExtractor is IExtractor {
    string public constant override typeAndVersion = "MintBurnExtractor 1.1.0";

    bytes32 public constant PARAM_ACCOUNT = keccak256("account");
    bytes32 public constant PARAM_AMOUNT = keccak256("amount");
    bytes32 public constant PARAM_FROM = keccak256("from");
    bytes32 public constant PARAM_TO = keccak256("to");

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
        address from;
        address to;

        if (payload.selector == MINT_SELECTOR) {
            (account, amount) = abi.decode(payload.data, (address, uint256));
            // mint: tokens flow to `account`; screen it as the recipient.
            to = account;
        } else if (payload.selector == BURN_FROM_SELECTOR) {
            (account, amount) = abi.decode(payload.data, (address, uint256));
            // burnFrom: tokens leave `account`; screen it as the holder.
            from = account;
        } else if (payload.selector == BURN_SELECTOR) {
            account = payload.sender;
            (amount) = abi.decode(payload.data, (uint256));
            // self-burn: tokens leave the caller.
            from = account;
        } else {
            revert IPolicyEngine.UnsupportedSelector(payload.selector);
        }

        IPolicyEngine.Parameter[] memory result = new IPolicyEngine.Parameter[](4);
        result[0] = IPolicyEngine.Parameter(PARAM_ACCOUNT, abi.encode(account));
        result[1] = IPolicyEngine.Parameter(PARAM_AMOUNT, abi.encode(amount));
        result[2] = IPolicyEngine.Parameter(PARAM_FROM, abi.encode(from));
        result[3] = IPolicyEngine.Parameter(PARAM_TO, abi.encode(to));
        return result;
    }
}
