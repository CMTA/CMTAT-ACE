// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;


import {IERC7802} from "../../../../submodules/CMTAT/contracts/interfaces/technical/IERC7802.sol";
import {IBurnFromERC20} from "../../../../submodules/CMTAT/contracts/interfaces/technical/IMintBurnToken.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {PolicyProtected} from "../../../../submodules/chainlink-ace/packages/policy-management/src/core/PolicyProtected.sol";
import {CCTModule} from "./CCTModule.sol";
import {IERC20Allowance} from "../../../../submodules/CMTAT/contracts/interfaces/technical/IERC20Allowance.sol";


/**
 * @title ERC20CrossChainModule (ERC-7802)
 * @dev 
 *
 * Contains all mint and burn functions, inherits from ERC-20
 */
abstract contract CCTCrossChainModule is ERC20Upgradeable, CCTModule, IERC7802, IBurnFromERC20 {

    /*//////////////////////////////////////////////////////////////
                            PUBLIC/EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
    * @inheritdoc IERC7802
    * @dev
    * Don't emit the same event as configured in the ERC20MintModule
    * @custom:access-control
    * Protected by the modifier onlyTokenBridge.
    */
    function crosschainMint(address to, uint256 value) public virtual override(IERC7802) runPolicy {
        _mint(to, value);
        emit CrosschainMint(to, value,_msgSender());
    }

    /**
    * @inheritdoc IERC7802
    * @dev
    * Don't emit the same event as configured in the ERC20BurnModule
    * Don't require allowance to follow Optimism Superchain ERC20 and OpenZeppelin implementation
    * @custom:access-control
    * - Protected by the modifier onlyTokenBridge.
    */
    function crosschainBurn(address from, uint256 value) public virtual override(IERC7802) runPolicy {
        _burn(from, value);
        emit CrosschainBurn(from, value, _msgSender());
    }

    /**
     * @inheritdoc IBurnFromERC20
     * @custom:access-control
     * - Protected by the modifier onlyBurnerFrom.
     */
    function burnFrom(address account, uint256 value) public virtual override(IBurnFromERC20) runPolicy {
        address sender =  _msgSender();
        _burnFrom(sender, account, value); 
    }

    /**
    * @inheritdoc IBurnFromERC20
    * @custom:access-control
    * - Protected by the modifier onlyBurnerFrom
    */
    function burn(
        uint256 value
    ) public virtual override(IBurnFromERC20) runPolicy{
        // Don't emit Spend event because allowance is not used here
        address sender = _msgSender();
        // burn from itself
        _burn(sender, sender, value);
    }



    /* ============ View functions ============ */
    function supportsInterface(bytes4 _interfaceId) public view virtual override(IERC165, PolicyProtected) returns (bool) {
        return _interfaceId == type(IERC7802).interfaceId || PolicyProtected.supportsInterface(_interfaceId);
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL/PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function _burnFrom(address sender, address account, uint256 value) internal virtual {
        // Allowance check and spend
        ERC20Upgradeable._spendAllowance(account, sender, value );
        // Specific event for the spend operation, same as transferFrom (ERC20BaseModule)
        emit IERC20Allowance.Spend(account, sender, value);
        _burn(sender, account, value);
    }

    function _burn(
       address sender, address account, uint256 value
    ) internal virtual {
        // burn
        _burn(account, value);
        // Specific event to burnFrom and self-burn (burn)
        // Don't emit CrossChainBurn because this function burn is not part of the IERC7802 interface
        emit BurnFrom(sender, account, sender, value);
    }
}