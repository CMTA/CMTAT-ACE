// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {CCTCommon} from "../../modules/standard/CCTCommon.sol";
import {ICMTATConstructor} from "CMTAT/interfaces/technical/ICMTATConstructor.sol";

/**
 * @title ComplianceTokenCMTATStandalone
 * @author Chainlink
 * @notice Standalone ComplianceToken contract with Chainlink ACE policy validation on state-changing operations
 */
contract ComplianceTokenCMTATStandalone is CCTCommon {
    /**
     * @notice Contract version for standalone deployment
     * @param admin_ address of the admin/owner
     * @param ERC20Attributes_ ERC20 name, symbol and decimals
     * @param extraInformationAttributes_ tokenId, terms, information
     * @param policyEngine_ address of the policy engine
     */
    constructor(
        address admin_,
        ICMTATConstructor.ERC20Attributes memory ERC20Attributes_,
        ICMTATConstructor.ExtraInformationAttributes memory extraInformationAttributes_,
        address policyEngine_
    ) {
        // Initialize the contract to avoid front-running
        initialize(admin_, ERC20Attributes_, extraInformationAttributes_, policyEngine_);
    }
}
