// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.26;

// Import PolicyEngine to make it available for Hardhat compilation and testing
import {PolicyEngine} from "@chainlink/ace/packages/policy-management/src/core/PolicyEngine.sol";
// Use local modified copies with Hardhat-compatible import paths
import {PausePolicy} from "../modules/chainlink-ace-modified/PausePolicy.sol";
import {RoleBasedAccessControlPolicy} from "../modules/chainlink-ace-modified/RoleBasedAccessControlPolicy.sol";
