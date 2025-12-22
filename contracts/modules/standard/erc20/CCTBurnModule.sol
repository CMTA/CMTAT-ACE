// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {ERC20BurnModuleInternal} from "../../../../submodules/CMTAT/contracts/modules/internal/ERC20BurnModuleInternal.sol";
import {IBurnBatchERC20} from "../../../../submodules/CMTAT/contracts/interfaces/technical/IMintBurnToken.sol";
import {IERC3643Burn} from "../../../../submodules/CMTAT/contracts/interfaces/tokenization/IERC3643Partial.sol";
import {IERC7551Burn, IERC5679Burn} from "../../../../submodules/CMTAT/contracts/interfaces/tokenization/draft-IERC7551.sol";
import {PolicyProtected} from "../../../../submodules/chainlink-ace/packages/policy-management/src/core/PolicyProtected.sol";


abstract contract CCTBurnModule is ERC20BurnModuleInternal, IBurnBatchERC20, IERC3643Burn, IERC7551Burn, PolicyProtected {

    /*//////////////////////////////////////////////////////////////
                            PUBLIC/EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev
     * @inheritdoc IERC7551Burn
     * @custom:access-control
     * - the caller must have the `BURNER_ROLE`.
     */
    function burn(
        address account,
        uint256 value,
        bytes calldata data
    ) public virtual override(IERC5679Burn) runPolicy {
        _burn(account, value, data);
    }

    /**
     * @inheritdoc IERC3643Burn
     * @custom:access-control
     * - the caller must have the `BURNER_ROLE`.
     */
    function burn(
        address account,
        uint256 value
    ) public virtual override(IERC3643Burn) runPolicy {
       _burn(account, value,"");
    }

    /**
     *
     * @inheritdoc IBurnBatchERC20
     * @custom:access-control
     * - the caller must have the `BURNER_ROLE`.
     */
    function batchBurn(
        address[] calldata accounts,
        uint256[] calldata values,
        bytes memory data
    ) public virtual override(IBurnBatchERC20) runPolicy {
        _batchBurn(accounts, values);
        emit BatchBurn(_msgSender(),accounts, values, data );
    }

    /**
     *
     * @inheritdoc IERC3643Burn
     * @custom:access-control
     * - the caller must have the `BURNER_ROLE`.
     */
    function batchBurn(
        address[] calldata accounts,
        uint256[] calldata values
    ) public virtual override (IERC3643Burn) runPolicy {
        _batchBurn(accounts, values);
        emit BatchBurn(_msgSender(),accounts, values, "" );
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL/PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _burn(
        address account,
        uint256 value,
        bytes memory data
    ) internal virtual {
        _burnOverride(account, value);
        emit Burn(_msgSender(), account, value, data);
    }
}