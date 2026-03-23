//SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {CCTBaseERC2771} from "../modules/standard/CCTBaseERC2771.sol";
import {ERC2771Module} from "../../submodules/CMTAT/contracts/modules/wrapper/options/ERC2771Module.sol";


/**
 * @title ComplianceTokenCMTATUUPSUpgradeable
 * @author Chainlink
 * @notice UUPS upgradeable ComplianceToken contract with Chainlink ACE policy validation on all public functions
 */
contract ComplianceTokenCMTATUUPSUpgradeable is CCTBaseERC2771, UUPSUpgradeable {
    /**
     * @notice Contract version for UUPS proxy deployment
     * @param forwarderIrrevocable address of the forwarder, required for the gasless support
     */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(
        address forwarderIrrevocable
    ) ERC2771Module(forwarderIrrevocable) {
        // Disable the possibility to initialize the implementation
        _disableInitializers();
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL/PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function _authorizeUpgrade(address newImplementation) internal virtual override(UUPSUpgradeable) onlyOwner {}
}
