// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {ERC20MintModuleInternal} from "../../../../submodules/CMTAT/contracts/modules/internal/ERC20MintModuleInternal.sol";
import {IMintBatchERC20Event} from "../../../../submodules/CMTAT/contracts/interfaces/technical/IMintBurnToken.sol";
import {IERC3643Mint, IERC3643BatchTransfer} from "../../../../submodules/CMTAT/contracts/interfaces/tokenization/IERC3643Partial.sol";
import {IERC7551Mint, IERC5679Mint} from "../../../../submodules/CMTAT/contracts/interfaces/tokenization/draft-IERC7551.sol";
import {PolicyProtected} from "../../../../submodules/chainlink-ace/packages/policy-management/src/core/PolicyProtected.sol";


abstract contract CCTMintModule is ERC20MintModuleInternal, IERC3643Mint, IERC3643BatchTransfer, 
  IERC7551Mint, IMintBatchERC20Event, PolicyProtected {

    /*//////////////////////////////////////////////////////////////
                            PUBLIC/EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @inheritdoc IERC5679Mint
     * @custom:devimpl
     * Requirements:
     * - `account` cannot be the zero address (check made by _mint).
     * @custom:access-control
     * - the caller must have the `MINTER_ROLE`.
     */
    function mint(address account, uint256 value, bytes calldata data) public virtual override(IERC5679Mint) runPolicy {
        _mint(account, value, data);
    }

    /**
     * @inheritdoc IERC3643Mint
     * @dev

     * Emits a {Mint} event.
     * Emits a {Transfer} event with `from` set to the zero address (emits inside _mint).
     *
     * Requirements:
     * - `account` cannot be the zero address (check made by _mint).
     * @custom:access-control
     * - the caller must have the `MINTER_ROLE`.
     */
    function mint(address account, uint256 value) public virtual override(IERC3643Mint) runPolicy {
       _mint(account, value, "");
    }

    /**
     *
     * @inheritdoc IERC3643Mint
     * @custom:devimpl
     * Requirement 
     * - `accounts` cannot contain a zero address (check made by _mint).
     * @custom:access-control
     * - the caller must have the `MINTER_ROLE`.
     */
    function batchMint(
        address[] calldata accounts,
        uint256[] calldata values
    ) public virtual override(IERC3643Mint) runPolicy {
       _batchMint(accounts, values);
        emit BatchMint(_msgSender(), accounts, values);
    }
    
    /**
     * @inheritdoc IERC3643BatchTransfer
     * @custom:access-control
     * - the caller must have the `MINTER_ROLE`.
     */
   function batchTransfer(
        address[] calldata tos,
        uint256[] calldata values
    ) public virtual override(IERC3643BatchTransfer) runPolicy returns (bool success_) {
        return _batchTransfer(tos, values);
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL/PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function _mint(address account, uint256 value, bytes memory data) internal virtual {
        _mintOverride(account, value);
        emit Mint(_msgSender(), account, value, data);
    }
    
}