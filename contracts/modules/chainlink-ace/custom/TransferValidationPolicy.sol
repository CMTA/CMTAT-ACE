// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {Policy} from "@chainlink/policy-management/core/Policy.sol";
import {IPolicyEngine} from "@chainlink/policy-management/interfaces/IPolicyEngine.sol";
import {IRule} from "../../../../submodules/RuleEngine/src/interfaces/IRule.sol";

/**
 * @title TransferValidationPolicy
 * @notice A policy that validates ERC-20 transfers by running an array of IRule
 *         contracts, mimicking CMTAT's _canTransferWithRuleEngine() behavior.
 * @dev Works with both ERC20TransferExtractor (3 params) and
 *      ERC20TransferFromExtractor (4 params):
 *
 *      3 parameters: [from, to, amount]
 *        → uses detectTransferRestriction(from, to, amount)
 *
 *      4 parameters: [spender, from, to, amount]
 *        → uses detectTransferRestrictionFrom(spender, from, to, amount)
 *
 *      Each IRule is checked in order. If any rule returns a non-zero code
 *      the policy reverts with PolicyRejected containing the rule's message.
 */
contract TransferValidationPolicy is Policy {
    error InvalidParametersLength(uint256 length);
    /// @notice Thrown when a zero address is supplied as a rule.
    error ZeroRuleAddress();

    string public constant override typeAndVersion = "TransferValidationPolicy 1.0.0";
    event RulesUpdated(uint256 previousCount, uint256 newCount);

    /// @custom:storage-location erc7201:cmta.TransferValidationPolicy
    struct TransferValidationStorage {
        IRule[] rules;
    }

    // keccak256(abi.encode(uint256(keccak256("cmta.TransferValidationPolicy")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant STORAGE_LOCATION = 0xd90ded5881f9295c61e86b2e3b551acbb5fe06f9f79d0cec87ddc5bb60d48e00;

    function _getStorage() private pure returns (TransferValidationStorage storage $) {
        assembly {
            $.slot := STORAGE_LOCATION
        }
    }

    /**
     * @inheritdoc Policy
     * @dev Decodes an array of IRule addresses to set as initial rules.
     *      Pass empty bytes if no initial rules are needed.
     */
    function configure(bytes calldata parameters) internal override onlyInitializing {
        if (parameters.length > 0) {
            address[] memory ruleAddrs = abi.decode(parameters, (address[]));
            TransferValidationStorage storage $ = _getStorage();
            for (uint256 i = 0; i < ruleAddrs.length; ++i) {
                require(ruleAddrs[i] != address(0), ZeroRuleAddress());
                $.rules.push(IRule(ruleAddrs[i]));
            }
        }
    }

    /**
     * @notice Replaces all rules with a new set.
     * @param rules_ The new array of IRule contracts.
     */
    function setRules(IRule[] calldata rules_) external onlyOwner {
        TransferValidationStorage storage $ = _getStorage();
        uint256 previousCount = $.rules.length;
        delete $.rules;
        for (uint256 i = 0; i < rules_.length; ++i) {
            require(address(rules_[i]) != address(0), ZeroRuleAddress());
            $.rules.push(rules_[i]);
        }
        emit RulesUpdated(previousCount, rules_.length);
    }

    /**
     * @notice Returns the current rules.
     */
    function rules() external view returns (IRule[] memory) {
        return _getStorage().rules;
    }

    /**
     * @notice Returns the number of rules.
     */
    function rulesCount() external view returns (uint256) {
        return _getStorage().rules.length;
    }

    /**
     * @inheritdoc Policy
     * @dev Supports both 3-param (transfer) and 4-param (transferFrom) layouts.
     *      With 4 parameters, uses detectTransferRestrictionFrom to also validate
     *      the spender.
     *
     *      `run` validates with the VIEW methods `detectTransferRestriction*` (it is `view`: the engine
     *      STATICCALLs it on both the `check()` preview and the state-flow pre-check). The state-mutating
     *      `IRule.transferred` enforcement hook — which stateful rules (rolling-window volume caps, per-period
     *      counters, ...) use to ADVANCE their internal state — is invoked in {postRun}, which the PolicyEngine
     *      calls only on the state path (after a successful `run`), never on the `check()` preview. Without this,
     *      stateful rules are never advanced and can be bypassed by repeated transfers (NM-2).
     *      `messageForTransferRestriction` only runs on the rejection branch (right before reverting), so it adds
     *      no gas to passing transfers.
     */
    function run(
        address /* caller */,
        address /* subject */,
        bytes4 /* selector */,
        bytes[] calldata parameters,
        bytes calldata /* context */
    ) public view override returns (IPolicyEngine.PolicyResult) {
        TransferValidationStorage storage $ = _getStorage();
        uint256 len = $.rules.length;

        if (parameters.length == 4) {
            // ERC20TransferFromExtractor layout: [spender, from, to, amount]
            address spender = abi.decode(parameters[0], (address));
            address from = abi.decode(parameters[1], (address));
            address to = abi.decode(parameters[2], (address));
            uint256 amount = abi.decode(parameters[3], (uint256));

            for (uint256 i = 0; i < len; ++i) {
                uint8 code = $.rules[i].detectTransferRestrictionFrom(spender, from, to, amount);
                if (code != 0) {
                    string memory message = $.rules[i].messageForTransferRestriction(code);
                    revert IPolicyEngine.PolicyRejected(message);
                }
            }
        } else if (parameters.length == 3) {
            // ERC20TransferExtractor layout: [from, to, amount]
            address from = abi.decode(parameters[0], (address));
            address to = abi.decode(parameters[1], (address));
            uint256 amount = abi.decode(parameters[2], (uint256));

            for (uint256 i = 0; i < len; ++i) {
                uint8 code = $.rules[i].detectTransferRestriction(from, to, amount);
                if (code != 0) {
                    string memory message = $.rules[i].messageForTransferRestriction(code);
                    revert IPolicyEngine.PolicyRejected(message);
                }
            }
        } else {
            // This should never happen due to the initial length check, but included for completeness
            revert InvalidParametersLength(parameters.length);
        }

        return IPolicyEngine.PolicyResult.Continue;
    }

    /**
     * @inheritdoc Policy
     * @notice State path enforcement: advances each rule's internal state via `IRule.transferred`.
     * @dev The PolicyEngine calls `postRun` only after a successful `run` on the STATE flow (`run(payload)`),
     *      never on the `check()` preview — so this is where the state-mutating `IRule.transferred` enforcement
     *      hook belongs. Mirrors {run}'s 3-param (transfer) vs 4-param (transferFrom) decode and calls the
     *      matching `transferred` overload on each rule, so stateful rules (rolling-window volume caps,
     *      per-period counters, ...) are advanced exactly once per executed transfer. `transferred` is also
     *      enforcing (it reverts if the rule now rejects); a revert here surfaces as `PolicyPostRunError` and
     *      reverts the transfer.
     */
    function postRun(
        address /* caller */,
        address /* subject */,
        bytes4 /* selector */,
        bytes[] calldata parameters,
        bytes calldata /* context */
    ) public override onlyPolicyEngine {
        TransferValidationStorage storage $ = _getStorage();
        uint256 len = $.rules.length;

        if (parameters.length == 4) {
            // ERC20TransferFromExtractor layout: [spender, from, to, amount]
            address spender = abi.decode(parameters[0], (address));
            address from = abi.decode(parameters[1], (address));
            address to = abi.decode(parameters[2], (address));
            uint256 amount = abi.decode(parameters[3], (uint256));

            for (uint256 i = 0; i < len; ++i) {
                $.rules[i].transferred(spender, from, to, amount);
            }
        } else if (parameters.length == 3) {
            // ERC20TransferExtractor layout: [from, to, amount]
            address from = abi.decode(parameters[0], (address));
            address to = abi.decode(parameters[1], (address));
            uint256 amount = abi.decode(parameters[2], (uint256));

            for (uint256 i = 0; i < len; ++i) {
                $.rules[i].transferred(from, to, amount);
            }
        } else {
            revert InvalidParametersLength(parameters.length);
        }
    }
}
