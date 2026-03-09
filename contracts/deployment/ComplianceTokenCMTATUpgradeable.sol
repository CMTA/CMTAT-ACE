//SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {CCTBaseERC2771} from "../modules/standard/CCTBaseERC2771.sol";
import {ERC2771Module} from "../../submodules/CMTAT/contracts/modules/wrapper/options/ERC2771Module.sol";


/**
 * @title ComplianceTokenCMTATUpgradeable
 * @author Chainlink
 * @notice Upgradeable ComplianceToken contract with Chainlink ACE policy validation on all public functions
 */
contract ComplianceTokenCMTATUpgradeable is CCTBaseERC2771 {
    /**
     * @notice Contract version for upgradeable deployment
     * @param forwarderIrrevocable address of the forwarder, required for the gasless support
     */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(
        address forwarderIrrevocable
    ) ERC2771Module(forwarderIrrevocable) {}
}