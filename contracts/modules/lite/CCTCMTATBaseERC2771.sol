// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {CCTCMTATBaseERC20CrossChain} from "./CCTCMTATBaseERC20CrossChain.sol";
import {ERC2771Module, ERC2771ContextUpgradeable} from "../../../submodules/CMTAT/contracts/modules/wrapper/options/ERC2771Module.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

abstract contract CCTCMTATBaseERC2771 is  CCTCMTATBaseERC20CrossChain, ERC2771Module {
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