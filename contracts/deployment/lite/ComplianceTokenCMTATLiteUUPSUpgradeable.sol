//SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {CCTCMTATBaseERC2771} from "../../modules/lite/CCTCMTATBaseERC2771.sol";
import {ERC2771Module} from "../../../submodules/CMTAT/contracts/modules/wrapper/options/ERC2771Module.sol";

/**
 * @title ComplianceTokenCMTATLiteUUPSUpgradeable
 * @author Chainlink
 * @notice UUPS upgradeable lite ComplianceToken contract with Chainlink ACE policy validation on CMTA transfers
 */
contract ComplianceTokenCMTATLiteUUPSUpgradeable is CCTCMTATBaseERC2771, UUPSUpgradeable {
    bytes32 public constant PROXY_UPGRADE_ROLE = keccak256("PROXY_UPGRADE_ROLE");

    /**
     * @notice Contract version for UUPS proxy deployment
     * @param forwarderIrrevocable address of the forwarder, required for the gasless support
     */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address forwarderIrrevocable) ERC2771Module(forwarderIrrevocable) {
        // Disable the possibility to initialize the implementation
        _disableInitializers();
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL/PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function _authorizeUpgrade(
        address newImplementation
    ) internal virtual override(UUPSUpgradeable) onlyRole(PROXY_UPGRADE_ROLE) {}
}
