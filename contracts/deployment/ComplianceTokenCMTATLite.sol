//SPDX-License-Identifier: MPL-2.0

pragma solidity 0.8.26;

import {CCTCMTATBaseERC2771} from "../modules/lite/CCTCMTATBaseERC2771.sol";
import {ICMTATConstructor} from "../../submodules/CMTAT/contracts/interfaces/technical/ICMTATConstructor.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {ISnapshotEngine} from "../../submodules/CMTAT/contracts/interfaces/engine/ISnapshotEngine.sol";
import {IERC1643} from "../../submodules/CMTAT/contracts/interfaces/tokenization/draft-IERC1643.sol";
import {ERC2771Module} from "../../submodules/CMTAT/contracts/modules/wrapper/options/ERC2771Module.sol";

/**
 * @title ComplianceTokenCMTATLite
 * @author Chainlink
 * @notice Compliance Token contract with Chainlink ACE policy validation on CMTA transfers
 */
contract ComplianceTokenCMTATLite is CCTCMTATBaseERC2771 {
    /**
     * @notice Contract version for standalone deployment
     * @param forwarderIrrevocable address of the forwarder, required for the gasless support
     * @param admin address of the admin of contract (Access Control)
     * @param ERC20Attributes_ ERC20 name, symbol and decimals
     * @param extraInformationAttributes_ tokenId, terms, information
     * @param snapshotEngine_ address of the snapshot engine
     * @param documentEngine_ address of the document engine
     * @param policyEngine_ address of the policy engine
     */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(
        address forwarderIrrevocable,
        address admin,
        ICMTATConstructor.ERC20Attributes memory ERC20Attributes_,
        ICMTATConstructor.ExtraInformationAttributes memory extraInformationAttributes_,
        ISnapshotEngine snapshotEngine_,
        IERC1643 documentEngine_,
        address policyEngine_
    ) ERC2771Module(forwarderIrrevocable) {
        // Initialize the contract to avoid front-running
        initialize(
            admin,
            ERC20Attributes_,
            extraInformationAttributes_,
            snapshotEngine_,
            documentEngine_,
            policyEngine_
        );
    }
}