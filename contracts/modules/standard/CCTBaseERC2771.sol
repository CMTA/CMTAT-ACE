// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;


import {CCTCommon} from "./CCTCommon.sol";
import {ERC2771Module, ERC2771ContextUpgradeable} from "../../../submodules/CMTAT/contracts/modules/wrapper/options/ERC2771Module.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {ICMTATConstructor} from "../../../submodules/CMTAT/contracts/interfaces/technical/ICMTATConstructor.sol";
import {ISnapshotEngine} from "../../../submodules/CMTAT/contracts/interfaces/engine/ISnapshotEngine.sol";
import {IERC1643} from "../../../submodules/CMTAT/contracts/interfaces/engine/IDocumentEngine.sol";
import "hardhat/console.sol";

abstract contract CCTBaseERC2771 is CCTCommon, ERC2771Module {

    /*//////////////////////////////////////////////////////////////
                            ERC2771 MODULE
    //////////////////////////////////////////////////////////////*/
       /**
     * @dev This surcharge is not necessary if you do not use the 2771Module
     */
    function _msgSender()
        internal virtual
        view
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (address sender)
    {
        return ERC2771ContextUpgradeable._msgSender();
    }

    /**
     * @dev This surcharge is not necessary if you do not use the 2771Module
     */
    function _contextSuffixLength() internal virtual view 
    override(ContextUpgradeable, ERC2771ContextUpgradeable)
    returns (uint256) {
         return ERC2771ContextUpgradeable._contextSuffixLength();
    }

    /**
     * @dev This surcharge is not necessary if you do not use the 2771Module
     */
    function _msgData()
        internal virtual
        view
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (bytes calldata)
    {
        return ERC2771ContextUpgradeable._msgData();
    }
}