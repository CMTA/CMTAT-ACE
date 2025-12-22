// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {ISnapshotEngine, ISnapshotEngineModule} from "../../../../submodules/CMTAT/contracts/interfaces/modules/ISnapshotEngineModule.sol";
import {PolicyProtected} from "../../../../submodules/chainlink-ace/packages/policy-management/src/core/PolicyProtected.sol";


abstract contract CCTSnapshotEngineModule is Initializable, ISnapshotEngineModule, PolicyProtected {

    /* ============ ERC-7201 ============ */
    // keccak256(abi.encode(uint256(keccak256("CMTAT.storage.SnapshotEngineModule")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant SnapshotEngineModuleStorageLocation = 0x1387b97dfab601d3023cb57858a6be29329babb05c85597ddbe4926c1193a900;
    /* ==== ERC-7201 State Variables === */
    struct SnapshotEngineModuleStorage {
        ISnapshotEngine _snapshotEngine;
    }

    /* ============  Initializer Function ============ */
    /**
     * @dev
     *
     * - The grant to the admin role is done by AccessControlDefaultAdminRules
     * - The control of the zero address is done by AccessControlDefaultAdminRules
     *
     */
    function __CCTSnapshotEngineModule_init_unchained(ISnapshotEngine snapshotEngine_)
    internal virtual onlyInitializing {
        if (address(snapshotEngine_) != address (0)) {
            SnapshotEngineModuleStorage storage $ = _getSnapshotEngineModuleStorage();
            _setSnapshotEngine($, snapshotEngine_);
        }
    }


    /*//////////////////////////////////////////////////////////////
                            PUBLIC/EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /* ============  State Restricted Functions ============ */
    /**
    * @inheritdoc ISnapshotEngineModule
    * @custom:access-control
    * - The caller must have the `SNAPSHOOTER_ROLE`.
    */
    function setSnapshotEngine(
        ISnapshotEngine snapshotEngine_
    ) public virtual override(ISnapshotEngineModule) runPolicy  {
        SnapshotEngineModuleStorage storage $ = _getSnapshotEngineModuleStorage();
        require($._snapshotEngine != snapshotEngine_, CMTAT_SnapshotModule_SameValue());
        _setSnapshotEngine($, snapshotEngine_);
    }

    
    /* ============ View functions ============ */

    /**
    * @inheritdoc ISnapshotEngineModule
    */
    function snapshotEngine() public view virtual override(ISnapshotEngineModule) returns (ISnapshotEngine) {
        SnapshotEngineModuleStorage storage $ = _getSnapshotEngineModuleStorage();
        return $._snapshotEngine;
    }
    /*//////////////////////////////////////////////////////////////
                            INTERNAL/PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _setSnapshotEngine(
        SnapshotEngineModuleStorage storage $, ISnapshotEngine snapshotEngine_
    ) internal virtual {
        $._snapshotEngine = snapshotEngine_;
        emit SnapshotEngine(snapshotEngine_);
    }

    /* ============ ERC-7201 ============ */
    function _getSnapshotEngineModuleStorage() private pure returns (SnapshotEngineModuleStorage storage $) {
        assembly {
            $.slot := SnapshotEngineModuleStorageLocation
        }
    }


}
