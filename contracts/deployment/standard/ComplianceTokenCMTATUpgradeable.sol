//SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {CCTCommon} from "../../modules/standard/CCTCommon.sol";

/**
 * @title ComplianceTokenCMTATUpgradeable
 * @author Chainlink
 * @notice Upgradeable ComplianceToken contract with Chainlink ACE policy validation on all public functions
 */
contract ComplianceTokenCMTATUpgradeable is CCTCommon {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        // Disable the possibility to initialize the implementation
        _disableInitializers();
    }
}
