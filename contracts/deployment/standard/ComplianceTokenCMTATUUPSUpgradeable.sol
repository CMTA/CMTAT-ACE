// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {CCTCommon} from "../../modules/standard/CCTCommon.sol";

/**
 * @title ComplianceTokenCMTATUUPSUpgradeable
 * @author Chainlink
 * @notice UUPS upgradeable ComplianceToken contract with Chainlink ACE policy validation on state-changing operations
 */
contract ComplianceTokenCMTATUUPSUpgradeable is CCTCommon, UUPSUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        // Disable the possibility to initialize the implementation
        _disableInitializers();
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL/PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function _authorizeUpgrade(address newImplementation) internal virtual override(UUPSUpgradeable) onlyOwner {}
}
