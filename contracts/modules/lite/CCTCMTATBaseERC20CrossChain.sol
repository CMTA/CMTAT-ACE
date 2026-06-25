// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {ERC20CrossChainModule} from "CMTAT/modules/wrapper/options/ERC20CrossChainModule.sol";
import {CCIPModule} from "CMTAT/modules/wrapper/options/CCIPModule.sol";
import {CCTCMTATBaseERC1404} from "./CCTCMTATBaseERC1404.sol";
import {CMTATBaseCommon} from "CMTAT/modules/0_CMTATBaseCommon.sol";
import {ERC20MintModule, ERC20MintModuleInternal} from "CMTAT/modules/wrapper/core/ERC20MintModule.sol";
import {ERC20BurnModule, ERC20BurnModuleInternal} from "CMTAT/modules/wrapper/core/ERC20BurnModule.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

abstract contract CCTCMTATBaseERC20CrossChain is ERC20CrossChainModule, CCIPModule, CCTCMTATBaseERC1404 {
    /* ============  State Functions ============ */
    /**
     * @dev revert if the contract is in pause state
     */
    function approve(
        address spender,
        uint256 value
    ) public virtual override(ERC20Upgradeable) whenNotPaused returns (bool) {
        return ERC20Upgradeable.approve(spender, value);
    }
    function transfer(
        address to,
        uint256 value
    ) public virtual override(ERC20Upgradeable, CMTATBaseCommon) returns (bool) {
        return CMTATBaseCommon.transfer(to, value);
    }
    /*
     * @inheritdoc ERC20BaseModule
     */
    function transferFrom(
        address from,
        address to,
        uint256 value
    ) public virtual override(ERC20Upgradeable, CMTATBaseCommon) returns (bool) {
        return CMTATBaseCommon.transferFrom(from, to, value);
    }

    /* ==== Batch operations: run the PolicyEngine per item with EMPTY context ==== */
    /**
     * @dev The per-sender PolicyEngine `context` is a single-call concept (it is read and cleared once around a
     * single operation by {_transferred}). Chainlink ACE's reference tokens screen each *batch* item with an
     * empty context (never the ambient stored context). We mirror that here by clearing the caller's context
     * before the batch runs, so every item's {_transferred} evaluates the engine with an empty context. This
     * avoids the mid-batch asymmetry where the first item consumes the context and the remaining items revert
     * under a context-dependent policy, while leaving single-operation ambient context (and its clear-once)
     * untouched. A batch + context-dependent policy is therefore intentionally unsupported (use the single-op
     * path for context-bearing calls).
     */
    function batchMint(
        address[] calldata accounts,
        uint256[] calldata values
    ) public virtual override(ERC20MintModule) {
        clearContext();
        ERC20MintModule.batchMint(accounts, values);
    }

    /**
     * @inheritdoc ERC20MintModule
     * @dev See {batchMint}: batch items are screened with an empty context.
     */
    function batchTransfer(
        address[] calldata tos,
        uint256[] calldata values
    ) public virtual override(ERC20MintModule) returns (bool success_) {
        clearContext();
        return ERC20MintModule.batchTransfer(tos, values);
    }

    /**
     * @inheritdoc ERC20BurnModule
     * @dev See {batchMint}: batch items are screened with an empty context.
     */
    function batchBurn(
        address[] calldata accounts,
        uint256[] calldata values,
        bytes memory data
    ) public virtual override(ERC20BurnModule) {
        clearContext();
        ERC20BurnModule.batchBurn(accounts, values, data);
    }

    /**
     * @inheritdoc ERC20BurnModule
     * @dev See {batchMint}: batch items are screened with an empty context.
     */
    function batchBurn(
        address[] calldata accounts,
        uint256[] calldata values
    ) public virtual override(ERC20BurnModule) {
        clearContext();
        ERC20BurnModule.batchBurn(accounts, values);
    }

    /**
     * @dev Check if the mint is valid
     * @dev Delegates to CMTAT's {CMTATBaseCommon._mintOverride} (which runs `_checkTransferred` then the
     * internal mint) rather than re-implementing it. Resolves the diamond between {CMTATBaseCommon} and
     * {ERC20MintModuleInternal}; mirrors the Standard variant ({CCTCommon}).
     */
    function _mintOverride(
        address account,
        uint256 value
    ) internal virtual override(CMTATBaseCommon, ERC20MintModuleInternal) {
        CMTATBaseCommon._mintOverride(account, value);
    }

    /**
     * @dev Check if the burn is valid
     * @dev Delegates to CMTAT's {CMTATBaseCommon._burnOverride}; see {_mintOverride}.
     */
    function _burnOverride(
        address account,
        uint256 value
    ) internal virtual override(CMTATBaseCommon, ERC20BurnModuleInternal) {
        CMTATBaseCommon._burnOverride(account, value);
    }

    /**
     * @dev Check if a minter transfer is valid
     * @dev Delegates to CMTAT's {CMTATBaseCommon._minterTransferOverride}; see {_mintOverride}. This keeps the
     * `_checkTransferred` spender as `_msgSender()` (the CMTAT default), so the operator-frozen check applies on
     * minter transfers, matching CMTAT and the Standard variant.
     */
    function _minterTransferOverride(
        address from,
        address to,
        uint256 value
    ) internal virtual override(CMTATBaseCommon, ERC20MintModuleInternal) {
        CMTATBaseCommon._minterTransferOverride(from, to, value);
    }

    /**
     * @inheritdoc CMTATBaseCommon
     */
    function decimals() public view virtual override(ERC20Upgradeable, CMTATBaseCommon) returns (uint8) {
        return CMTATBaseCommon.decimals();
    }

    /**
     * @inheritdoc CMTATBaseCommon
     */
    function name() public view virtual override(ERC20Upgradeable, CMTATBaseCommon) returns (string memory) {
        return CMTATBaseCommon.name();
    }

    /**
     * @inheritdoc CMTATBaseCommon
     */
    function symbol() public view virtual override(ERC20Upgradeable, CMTATBaseCommon) returns (string memory) {
        return CMTATBaseCommon.symbol();
    }

    /* ============ View functions ============ */
    function supportsInterface(
        bytes4 _interfaceId
    ) public view virtual override(ERC20CrossChainModule, CCTCMTATBaseERC1404) returns (bool) {
        return
            ERC20CrossChainModule.supportsInterface(_interfaceId) ||
            CCTCMTATBaseERC1404.supportsInterface(_interfaceId);
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL/PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /* ==== Access Control ==== */

    /**
     * @custom:access-control
     * - the caller must have the `DEFAULT_ADMIN_ROLE`.
     */
    function _authorizeCCIPSetAdmin() internal virtual override(CCIPModule) onlyRole(DEFAULT_ADMIN_ROLE) {}

    /**
     * @dev
     * A cross-chain bridge could call the OpenZeppelin function `renounceRole` to lose their privileges (CROSS_CHAIN_ROLE)
     * While it is not intended,this has no other effect than depriving the bridge of burn/mint tokens
     * An attacker could use this to disrupt minting/burning if they can get the bridge to execute calls.
     * However, in this case, the bridge should still be considered compromised and not used again.
     * @custom:access-control
     * - the caller must have the `CROSS_CHAIN_ROLE`.
     */
    function _checkTokenBridge(address caller) internal virtual override(ERC20CrossChainModule) whenNotPaused {
        AccessControlUpgradeable._checkRole(CROSS_CHAIN_ROLE, caller);
    }

    /**
     * @custom:access-control
     * - the caller must have the `BURNER_FROM_ROLE`.
     * - We don't allow token holder to burn their own tokens if they don't have this role.
     */
    function _authorizeBurnFrom()
        internal
        virtual
        override(ERC20CrossChainModule)
        onlyRole(BURNER_FROM_ROLE)
        whenNotPaused
    {}

    /**
     * @custom:access-control
     * - the caller must have the `BURNER_SELF_ROLE`.
     * - We don't allow token holder to burn their own tokens if they don't have this role.
     */
    function _authorizeSelfBurn()
        internal
        virtual
        override(ERC20CrossChainModule)
        onlyRole(BURNER_SELF_ROLE)
        whenNotPaused
    {}
}
