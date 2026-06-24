// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.20;

import {IExtractor} from "@chainlink/policy-management/interfaces/IExtractor.sol";
import {IPolicyEngine} from "@chainlink/policy-management/interfaces/IPolicyEngine.sol";

/**
 * @title CrossChainMintBurnExtractor
 * @notice Exposes the screened address of CMTAT cross-chain mint/burn calls in the
 *         `(from, to, amount)` parameter layout used by `TransferValidationPolicy` and the
 *         `IRule` transfer-restriction rules, so the SAME sanctions/KYC rules that guard
 *         `transfer`/`transferFrom` can also screen cross-chain issuance and redemption.
 *
 *         Addresses FEEDBACK.md H-1 for the cross-chain selectors: without screening on these
 *         selectors, a bridge could `crosschainMint` to a sanctioned recipient even though the
 *         token "has a sanctions policy".
 *
 * @dev Mapping (mirrors a transfer for screening purposes):
 *      - crosschainMint(address to,   uint256 value) → from = address(0), to = to,           amount = value
 *          (a mint; screen the RECIPIENT `to`, exactly as the `to` of a transfer)
 *      - crosschainBurn(address from, uint256 value) → from = from,        to = address(0),   amount = value
 *          (a burn; screen the HOLDER `from`, exactly as the `from` of a transfer)
 *
 *      Wire it up with:
 *        policyEngine.setExtractor(crosschainMintSelector, address(this));
 *        policyEngine.setExtractor(crosschainBurnSelector, address(this));
 *        policyEngine.addPolicy(token, crosschainMintSelector, transferValidationPolicy, [from, to, amount]);
 *        policyEngine.addPolicy(token, crosschainBurnSelector, transferValidationPolicy, [from, to, amount]);
 *
 *      The 3-parameter layout makes `TransferValidationPolicy` call
 *      `detectTransferRestriction(from, to, amount)` on each rule.
 */
contract CrossChainMintBurnExtractor is IExtractor {
    string public constant override typeAndVersion = "CrossChainMintBurnExtractor 1.0.0";

    bytes32 public constant PARAM_FROM = keccak256("from");
    bytes32 public constant PARAM_TO = keccak256("to");
    bytes32 public constant PARAM_AMOUNT = keccak256("amount");

    // crosschainMint(address,uint256)
    bytes4 private constant CROSSCHAIN_MINT_SELECTOR = bytes4(keccak256("crosschainMint(address,uint256)"));
    // crosschainBurn(address,uint256)
    bytes4 private constant CROSSCHAIN_BURN_SELECTOR = bytes4(keccak256("crosschainBurn(address,uint256)"));

    function extract(
        IPolicyEngine.Payload calldata payload
    ) external pure override returns (IPolicyEngine.Parameter[] memory) {
        address from;
        address to;
        uint256 amount;

        if (payload.selector == CROSSCHAIN_MINT_SELECTOR) {
            // crosschainMint(to, value): a mint — screen the recipient as `to`, `from` is zero.
            (to, amount) = abi.decode(payload.data, (address, uint256));
        } else if (payload.selector == CROSSCHAIN_BURN_SELECTOR) {
            // crosschainBurn(from, value): a burn — screen the holder as `from`, `to` is zero.
            (from, amount) = abi.decode(payload.data, (address, uint256));
        } else {
            revert IPolicyEngine.UnsupportedSelector(payload.selector);
        }

        IPolicyEngine.Parameter[] memory result = new IPolicyEngine.Parameter[](3);
        result[0] = IPolicyEngine.Parameter(PARAM_FROM, abi.encode(from));
        result[1] = IPolicyEngine.Parameter(PARAM_TO, abi.encode(to));
        result[2] = IPolicyEngine.Parameter(PARAM_AMOUNT, abi.encode(amount));
        return result;
    }
}
