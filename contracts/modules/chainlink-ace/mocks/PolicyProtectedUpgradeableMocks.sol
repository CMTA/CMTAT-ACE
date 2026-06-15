// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.20;

import {IPolicyEngine} from "@chainlink/policy-management/interfaces/IPolicyEngine.sol";
import {ValidationModulePolicyEngine} from "../../lite/ValidationModulePolicyEngine.sol";

contract MockPolicyEngine is IPolicyEngine {
    Payload public lastPayload;
    uint256 public attachCalls;
    uint256 public detachCalls;
    bool public detachShouldRevert;

    function setDetachShouldRevert(bool value) external {
        detachShouldRevert = value;
    }

    function typeAndVersion() external pure override returns (string memory) {
        return "MockPolicyEngine 1.0.0";
    }

    function attach() external override {
        attachCalls++;
    }

    function detach() external override {
        detachCalls++;
        if (detachShouldRevert) {
            revert("MockPolicyEngine: detach failed");
        }
    }

    function run(Payload calldata payload) external override {
        lastPayload = payload;
    }

    function check(Payload calldata) external pure override {}

    function setExtractor(bytes4, address) external pure override {}

    function setExtractors(bytes4[] calldata, address) external pure override {}

    function getExtractor(bytes4) external pure override returns (address) {
        return address(0);
    }

    function setPolicyMapper(address, address) external pure override {}

    function getPolicyMapper(address) external pure override returns (address) {
        return address(0);
    }

    function addPolicy(address, bytes4, address, bytes32[] calldata) external pure override {}

    function addPolicyAt(address, bytes4, address, bytes32[] calldata, uint256) external pure override {}

    function removePolicy(address, bytes4, address) external pure override {}

    function getPolicies(address, bytes4) external pure override returns (address[] memory) {
        return new address[](0);
    }

    function setPolicyConfiguration(address, uint256, bytes4, bytes calldata) external pure override {}

    function getPolicyConfigVersion(address) external pure override returns (uint256) {
        return 0;
    }

    function upgradePolicy(address, address, bytes calldata) external pure override {}

    function setDefaultPolicyAllow(bool) external pure override {}

    function setTargetDefaultPolicyAllow(address, bool) external pure override {}
}

contract ValidationModulePolicyEngineHarness is ValidationModulePolicyEngine {
    function initializeWithPolicyEngine(address policyEngine) external initializer {
        __PolicyProtectedBase_init(policyEngine);
    }

    function _authorizeAttachPolicyEngine(address) internal pure override {}

    function _authorizePause() internal pure override {}

    function _authorizeDeactivate() internal pure override {}

    function _authorizeFreeze() internal pure override {}

    function exposedTryCheckPolicies(
        bytes4 selector,
        address sender,
        bytes calldata data
    ) external view returns (bool) {
        return _tryCheckPolicies(selector, sender, data);
    }

    function exposedTransferred(address spender, address from, address to, uint256 value) external returns (bool) {
        return _transferred(spender, from, to, value);
    }
}
