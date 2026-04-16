// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {CCTCMTATBaseERC20CrossChain} from "../../modules/lite/CCTCMTATBaseERC20CrossChain.sol";
import {ICMTATConstructor} from "../../../submodules/CMTAT/contracts/interfaces/technical/ICMTATConstructor.sol";
import {ISnapshotEngine} from "../../../submodules/CMTAT/contracts/interfaces/engine/ISnapshotEngine.sol";
import {IERC1643} from "../../../submodules/CMTAT/contracts/interfaces/tokenization/draft-IERC1643.sol";

/**
 * @title ComplianceTokenCMTATLite
 * @author Chainlink
 * @notice Standalone Compliance Token contract with Chainlink ACE policy validation on CMTA transfers
 */
contract ComplianceTokenCMTATLiteStandalone is CCTCMTATBaseERC20CrossChain {
    /**
     * @notice Contract version for standalone deployment
     * @param admin address of the admin of contract (Access Control)
     * @param ERC20Attributes_ ERC20 name, symbol and decimals
     * @param extraInformationAttributes_ tokenId, terms, information
     * @param policyEngine_ address of the policy engine
     * @param snapshotEngine_ address of the snapshot engine
     * @param documentEngine_ address of the document engine
     */
    constructor(
        address admin,
        ICMTATConstructor.ERC20Attributes memory ERC20Attributes_,
        ICMTATConstructor.ExtraInformationAttributes memory extraInformationAttributes_,
        address policyEngine_,
        ISnapshotEngine snapshotEngine_,
        IERC1643 documentEngine_
    ) {
        // Initialize the contract to avoid front-running
        initialize(
            admin,
            ERC20Attributes_,
            extraInformationAttributes_,
            policyEngine_,
            snapshotEngine_,
            documentEngine_
        );
    }
}
