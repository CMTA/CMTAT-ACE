// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {VersionModule} from "../../../submodules/CMTAT/contracts/modules/wrapper/core/VersionModule.sol";
import {CCTERC20Module} from "./erc20/CCTERC20Module.sol";
import {CCTSnapshotEngineModule} from "./engines/CCTSnapshotEngineModule.sol";
import {CCTEnforcementModule} from "./extensions/CCTEnforcementModule.sol";
import {CCTDocumentEngineModule, IERC1643} from "./engines/CCTDocumentEngineModule.sol";
import {CCTExtraInformationModule} from "./extensions/CCTExtraInformationModule.sol";
import {IBurnMintERC20} from "../../../submodules/CMTAT/contracts/interfaces/technical/IMintBurnToken.sol";
import {IERC5679} from "../../../submodules/CMTAT/contracts/interfaces/technical/IERC5679.sol";
import {ICMTATConstructor} from "../../../submodules/CMTAT/contracts/interfaces/technical/ICMTATConstructor.sol";
import {ISnapshotEngine} from "../../../submodules/CMTAT/contracts/interfaces/engine/ISnapshotEngine.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {PolicyProtected} from "../../../submodules/chainlink-ace/packages/policy-management/src/core/PolicyProtected.sol";
import {CCTCrossChainModule} from "./extensions/CCTCrossChainModule.sol";


abstract contract CCTCommon is 
    CCTERC20Module,
    CCTCrossChainModule,
    CCTEnforcementModule,
    VersionModule,
    CCTSnapshotEngineModule,
    CCTDocumentEngineModule,
    CCTExtraInformationModule,
    IBurnMintERC20
{
    function initialize(
        address admin,
        ICMTATConstructor.ERC20Attributes memory ERC20Attributes_,
        ICMTATConstructor.ExtraInformationAttributes memory extraInformationAttributes_,
        ISnapshotEngine snapshotEngine_,
        IERC1643 documentEngine_,
        address policyEngine
    ) public virtual initializer {
        _initialize(admin, ERC20Attributes_, extraInformationAttributes_, snapshotEngine_, documentEngine_, policyEngine);
    }

    function _initialize(
        address admin,
        ICMTATConstructor.ERC20Attributes memory ERC20Attributes_,
        ICMTATConstructor.ExtraInformationAttributes memory extraInformationAttributes_,
        ISnapshotEngine snapshotEngine_,
        IERC1643 documentEngine_,
        address policyEngine
    ) internal virtual onlyInitializing {
        __CCT_commonModules_init_unchained(
            admin,
            ERC20Attributes_,
            extraInformationAttributes_,
            snapshotEngine_,
            documentEngine_,
            policyEngine
        );
    }

    function __CCT_commonModules_init_unchained(address admin, ICMTATConstructor.ERC20Attributes memory ERC20Attributes_, ICMTATConstructor.ExtraInformationAttributes memory ExtraInformationModuleAttributes_,
        ISnapshotEngine snapshotEngine_, IERC1643 documentEngine_, address policyEngine
    ) internal virtual onlyInitializing {        
        __PolicyProtected_init(admin, policyEngine);

        __CCTERC20Module_init_unchained(ERC20Attributes_.name, ERC20Attributes_.symbol);
        
        __CCTExtraInformationModule_init_unchained(ExtraInformationModuleAttributes_.tokenId, ExtraInformationModuleAttributes_.terms, ExtraInformationModuleAttributes_.information);
        __CCTSnapshotEngineModule_init_unchained(snapshotEngine_);
        __CCTDocumentEngineModule_init_unchained(documentEngine_);
    }

    /*//////////////////////////////////////////////////////////////
                        PUBLIC/EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function supportsInterface(bytes4 _interfaceId) public view virtual override(
        CCTCrossChainModule,
        PolicyProtected
    ) returns (bool) {
        return
            CCTCrossChainModule.supportsInterface(_interfaceId) ||
            PolicyProtected.supportsInterface(_interfaceId);
    }



    /*//////////////////////////////////////////////////////////////
                Functions requiring several modules
    //////////////////////////////////////////////////////////////*/

    /**
    * @inheritdoc IBurnMintERC20
    * @dev 
    * - The access control is managed by the functions burn (ERC20BurnModule) and mint (ERC20MintModule)
    * - Input validation is also managed by the functions burn and mint
    * - You can mint more tokens than burnt
    */
    function burnAndMint(address from, address to, uint256 amountToBurn, uint256 amountToMint, bytes calldata data) public virtual override(IBurnMintERC20) {
        burn(from, amountToBurn, data);
        mint(to, amountToMint, data);
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL/PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev we don't check the transfer validity here
     */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(ERC20Upgradeable) {
        // We check here the address of the snapshotEngine here because we don't want to read balance/totalSupply if there is no Snapshot Engine
        ISnapshotEngine snapshotEngineLocal = snapshotEngine();
      
        if(address(snapshotEngineLocal) != address(0)){
          uint256 fromBalanceBefore = balanceOf(from);
          uint256 toBalanceBefore = balanceOf(to);
          uint256 totalSupplyBefore = totalSupply();
        
          // We perform the update here (CEI pattern)
          ERC20Upgradeable._update(from, to, amount);

          // Required to use the balance before the update
          snapshotEngineLocal.operateOnTransfer(from, to, fromBalanceBefore, toBalanceBefore, totalSupplyBefore);
        } else {
            // Update without snapshot call
            ERC20Upgradeable._update(from, to, amount);
        }
    }

}