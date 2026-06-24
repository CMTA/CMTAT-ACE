// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.20;

import {VersionModule} from "CMTAT/modules/wrapper/core/VersionModule.sol";

/**
 * @title CMTAT-ACE Version module
 * @notice Retrieve the current version of the CMTAT-ACE integration.
 * @dev Mirrors CMTAT's {VersionModule} but reports the version of this integration release rather
 * than the underlying CMTAT framework version. Overrides {VersionModule.version()} so the token's
 * `version()` getter returns the CMTAT-ACE release.
 */
abstract contract CCTVersionModule is VersionModule {
    /// @dev Current CMTAT-ACE integration release version.
    string private constant CCT_VERSION = "0.2.0";

    /**
     * @inheritdoc VersionModule
     */
    function version() public view virtual override(VersionModule) returns (string memory version_) {
        return CCT_VERSION;
    }
}
