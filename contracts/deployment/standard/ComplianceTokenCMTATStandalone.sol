//SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {CCTBaseERC2771} from "../../modules/standard/CCTBaseERC2771.sol";
import {ICMTATConstructor} from "../../../submodules/CMTAT/contracts/interfaces/technical/ICMTATConstructor.sol";
import {ERC2771Module} from "../../../submodules/CMTAT/contracts/modules/wrapper/options/ERC2771Module.sol";
import {ISnapshotEngine} from "../../../submodules/CMTAT/contracts/interfaces/engine/ISnapshotEngine.sol";
import {IERC1643} from "../../../submodules/CMTAT/contracts/interfaces/engine/IDocumentEngine.sol";

/**
 * @title ComplianceTokenCMTATStandalone
 * @author Chainlink
 * @notice Standalone ComplianceToken contract with Chainlink ACE policy validation on all public functions
 */
contract ComplianceTokenCMTATStandalone is CCTBaseERC2771 {
    /**
     * @notice Contract version for standalone deployment
     * @param forwarderIrrevocable address of the forwarder, required for the gasless support
     * @param ERC20Attributes_ ERC20 name, symbol and decimals
     * @param extraInformationAttributes_ tokenId, terms, information
     * @param snapshotEngine_ address of the snapshot engine
     * @param documentEngine_ address of the document engine
     * @param policyEngine_ address of the policy engine
     */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(
        address forwarderIrrevocable_,
        address admin_,
        ICMTATConstructor.ERC20Attributes memory ERC20Attributes_,
        ICMTATConstructor.ExtraInformationAttributes memory extraInformationAttributes_,
        address policyEngine_,
        ISnapshotEngine snapshotEngine_,
        IERC1643 documentEngine_
    ) ERC2771Module(forwarderIrrevocable_) {
        // Initialize the contract to avoid front-running
        initialize(
            admin_,
            ERC20Attributes_,
            extraInformationAttributes_,
            policyEngine_,
            snapshotEngine_,
            documentEngine_
        );
    }
}
