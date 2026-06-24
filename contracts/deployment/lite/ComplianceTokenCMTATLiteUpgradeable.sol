// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {CCTCMTATBaseERC20CrossChain} from "../../modules/lite/CCTCMTATBaseERC20CrossChain.sol";

/**
 * @title ComplianceTokenCMTATLite
 * @author Chainlink
 * @notice Standalone upgradeable lite Compliance Token contract with Chainlink ACE policy validation on CMTA transfers
 */
contract ComplianceTokenCMTATLiteUpgradeable is CCTCMTATBaseERC20CrossChain {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        // Disable the possibility to initialize the implementation
        _disableInitializers();
    }
}
