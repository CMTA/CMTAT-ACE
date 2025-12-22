// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {ERC20EnforcementModuleInternal} from "../../../../submodules/CMTAT/contracts/modules/internal/ERC20EnforcementModuleInternal.sol";
import {IERC3643ERC20Enforcement} from "../../../../submodules/CMTAT/contracts/interfaces/tokenization/IERC3643Partial.sol";
import {IERC7551ERC20Enforcement, IERC7551ERC20EnforcementEvent} from "../../../../submodules/CMTAT/contracts/interfaces/tokenization/draft-IERC7551.sol";
import {PolicyProtected} from "../../../../submodules/chainlink-ace/packages/policy-management/src/core/PolicyProtected.sol";


abstract contract CCTEnforcementModule is ERC20EnforcementModuleInternal, IERC7551ERC20Enforcement, IERC3643ERC20Enforcement, PolicyProtected {

    /*//////////////////////////////////////////////////////////////
                            PUBLIC/EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

   /**
    *
    * @inheritdoc IERC7551ERC20Enforcement
    */
    function getFrozenTokens(address account) public override(IERC7551ERC20Enforcement, IERC3643ERC20Enforcement) 
        view virtual returns (uint256 frozenBalance_) {
        return _getFrozenTokens(account);
     }

   /**
    *
    * @inheritdoc IERC7551ERC20Enforcement
    */
    function getActiveBalanceOf(address account) public view override(IERC7551ERC20Enforcement) returns (uint256 activeBalance_) {
        return _getActiveBalanceOf(account);
     }

    /* ============  ERC-20 Enforcement ============ */
    /**
    *
    * @inheritdoc IERC7551ERC20Enforcement
    * @custom:access-control
    * - the caller must have the `DEFAULT_ADMIN_ROLE`.
    */
    function forcedTransfer(address from, address to, uint256 value, bytes calldata data) 
    public virtual override(IERC7551ERC20Enforcement) runPolicy returns (bool) {
       _forcedTransfer(from, to, value, data);
       return true;
    }

    /**
    *
    * @inheritdoc IERC3643ERC20Enforcement
    * @custom:access-control
    * - the caller must have the `DEFAULT_ADMIN_ROLE`.
    */
    function forcedTransfer(address from, address to, uint256 value) 
    public virtual override(IERC3643ERC20Enforcement) runPolicy returns (bool) {
       _forcedTransfer(from, to, value, "");
       return true;
    }

    /**
    *
    * @inheritdoc IERC3643ERC20Enforcement
    * @custom:access-control
    * - the caller must have the `ERC20ENFORCER_ROLE`.
    */
    function freezePartialTokens(address account, uint256 value) 
    public virtual override(IERC3643ERC20Enforcement) runPolicy {
        _freezePartialTokens(account, value, "");
    }

    /**
    *
    * @inheritdoc IERC3643ERC20Enforcement
    * @custom:access-control
    * - the caller must have the `ERC20ENFORCER_ROLE`.
    */
    function unfreezePartialTokens(address account, uint256 value) 
    public virtual override(IERC3643ERC20Enforcement) runPolicy {
        _unfreezePartialTokens(account, value, "");
    }

    /**
    *
    * @inheritdoc IERC7551ERC20Enforcement
    * @custom:access-control
    * - the caller must have the `ERC20ENFORCER_ROLE`.
    */
    function freezePartialTokens(address account, uint256 value, bytes calldata data) 
    public virtual override(IERC7551ERC20Enforcement) runPolicy {
        _freezePartialTokens(account, value, data);
    }

    /**
    *
    * @inheritdoc IERC7551ERC20Enforcement
    * @custom:access-control
    * - the caller must have the `ERC20ENFORCER_ROLE`.
    */
    function unfreezePartialTokens(address account, uint256 value, bytes calldata data) 
    public virtual override(IERC7551ERC20Enforcement) runPolicy {
        _unfreezePartialTokens(account, value, data);
    }

}
