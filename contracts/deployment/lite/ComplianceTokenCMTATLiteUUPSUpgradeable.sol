// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {CCTCMTATBaseERC20CrossChain} from "../../modules/lite/CCTCMTATBaseERC20CrossChain.sol";

/**
 * @title ComplianceTokenCMTATLiteUUPSUpgradeable
 * @author Chainlink
 * @notice UUPS upgradeable lite ComplianceToken contract with Chainlink ACE policy validation on CMTA transfers
 */
contract ComplianceTokenCMTATLiteUUPSUpgradeable is CCTCMTATBaseERC20CrossChain, UUPSUpgradeable {
    bytes32 public constant PROXY_UPGRADE_ROLE = keccak256("PROXY_UPGRADE_ROLE");

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
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
