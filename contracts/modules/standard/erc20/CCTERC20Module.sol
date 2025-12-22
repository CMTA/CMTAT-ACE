// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;


import {CCTMintModule} from "./CCTMintModule.sol";
import {CCTBurnModule} from "./CCTBurnModule.sol";
import {IERC20Allowance} from "../../../../submodules/CMTAT/contracts/interfaces/technical/IERC20Allowance.sol";
import {IERC20BatchBalance} from "../../../../submodules/CMTAT/contracts/interfaces/engine/ISnapshotEngine.sol";
import {IERC3643ERC20Base} from "../../../../submodules/CMTAT/contracts/interfaces/tokenization/IERC3643Partial.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {PolicyProtected} from "../../../../submodules/chainlink-ace/packages/policy-management/src/core/PolicyProtected.sol";


abstract contract CCTERC20Module is CCTMintModule, CCTBurnModule, IERC20Allowance, IERC3643ERC20Base, IERC20BatchBalance {
    // This is a placeholder for the actual implementation of the CCTERC20Module.
    /* ============ Events ============ */
    event Name(string indexed newNameIndexed, string newName);
    event Symbol(string indexed newSymbolIndexed, string newSymbol);

    // Copy from ERC20 as these are private variables and are not inherited
    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.ERC20")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 public constant CCTERC20StorageLocation = 0x52c63247e1f47db19d5ce0460030c497f067ca4cebf71ba98eeadabe20bace00;

    function _getCCTERC20Storage() private pure returns (ERC20Storage storage $) {
        assembly {
            $.slot := CCTERC20StorageLocation
        }
    }

    /* ============  Initializer Function ============ */
    /**
     * @dev Initializers: Sets the values for decimals.
     *
     * this value is immutable: it can only be set once during
     * construction/initialization.
     */
    function __CCTERC20Module_init_unchained(
        string memory name_,
        string memory symbol_
    ) internal virtual onlyInitializing {
        __ERC20_init_unchained(name_, symbol_);
    }
    /*//////////////////////////////////////////////////////////////
                            PUBLIC/EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/


    /* ============  Custom functions ============ */
    /* ========  State Functions ======= */
    /**
     *  @inheritdoc IERC3643ERC20Base
     *  @dev 
     */
    function setName(string calldata name_) public virtual override(IERC3643ERC20Base) runPolicy{
        ERC20Storage storage $ = _getCCTERC20Storage();
        $._name = name_;
        emit Name(name_, name_);
    }

    /**
     * @inheritdoc IERC3643ERC20Base
     */
    function setSymbol(string calldata symbol_) public virtual override(IERC3643ERC20Base) runPolicy {
        ERC20Storage storage $ = _getCCTERC20Storage();
        $._symbol = symbol_;
        emit Symbol(symbol_, symbol_);
    }
    /* ======== View functions ======= */
    /**
    * @inheritdoc IERC20BatchBalance
    */
    function batchBalanceOf(address[] calldata addresses) public view virtual 
        override(IERC20BatchBalance) returns(uint256[] memory balances , uint256 totalSupply_) {
        balances = new uint256[](addresses.length);
        for(uint256 i = 0; i < addresses.length; ++i){
            balances[i] = ERC20Upgradeable.balanceOf(addresses[i]);
        }
        totalSupply_ = ERC20Upgradeable.totalSupply();
    }
}