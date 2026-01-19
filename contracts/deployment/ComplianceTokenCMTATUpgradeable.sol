//SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {CCTBaseERC2771} from "../modules/standard/CCTBaseERC2771.sol";
import {ICMTATConstructor} from "../../submodules/CMTAT/contracts/interfaces/technical/ICMTATConstructor.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {ISnapshotEngine} from "../../submodules/CMTAT/contracts/interfaces/engine/ISnapshotEngine.sol";
import {IERC1643} from "../../submodules/CMTAT/contracts/interfaces/tokenization/draft-IERC1643.sol";
import {ERC2771Module} from "../../submodules/CMTAT/contracts/modules/wrapper/options/ERC2771Module.sol";


/**
 * @title ComplianceTokenCMTATStandalone
 * @author Chainlink
 * @notice Standalone ComplianceToken contract with Chainlink ACE policy validation on all public functions
 */
contract ComplianceTokenCMTATUpgradeable is CCTBaseERC2771 {
    /**
     * @notice Contract version for standalone deployment
     * @param forwarderIrrevocable address of the forwarder, required for the gasless support
     */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(
        address forwarderIrrevocable
    ) ERC2771Module(forwarderIrrevocable) {}
}