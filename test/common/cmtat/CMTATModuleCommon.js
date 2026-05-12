const ERC20BaseCommon = require('./ERC20BaseCommon');
const MintModuleCommon = require('./MintModuleCommon');
const BurnModuleCommon = require('./BurnModuleCommon');
const ERC20EnforcementCommon = require('./ERC20EnforcementCommon');
const DocumentModuleCommon = require('./DocumentModuleCommon');
const SnapshotModuleCommon = require('./SnapshotModuleCommon');
// Snapshot scheduling & global modules from CMTAT
const SnapshotModuleCommonScheduling = require('../../../submodules/CMTAT/test/common/SnapshotModuleCommon/SnapshotModuleCommonScheduling');
const SnapshotModuleCommonRescheduling = require('../../../submodules/CMTAT/test/common/SnapshotModuleCommon/SnapshotModuleCommonRescheduling');
const SnapshotModuleCommonUnschedule = require('../../../submodules/CMTAT/test/common/SnapshotModuleCommon/SnapshotModuleCommonUnschedule');
const SnapshotModuleCommonGetNextSnapshot = require('../../../submodules/CMTAT/test/common/SnapshotModuleCommon/SnapshotModuleCommonGetNextSnapshot');
const SnapshotModuleMultiplePlannedTest = require('../../../submodules/CMTAT/test/common/SnapshotModuleCommon/global/SnapshotModuleMultiplePlannedTest');
const SnapshotModuleOnePlannedSnapshotTest = require('../../../submodules/CMTAT/test/common/SnapshotModuleCommon/global/SnapshotModuleOnePlannedSnapshotTest');
const SnapshotModuleZeroPlannedSnapshotTest = require('../../../submodules/CMTAT/test/common/SnapshotModuleCommon/global/SnapshotModuleZeroPlannedSnapshot');

/**
 * Aggregates all CMTAT module tests for standard (PolicyEngine-based) contracts.
 *
 * Each submodule can also be imported individually for selective testing.
 *
 * Required `this` context (set up by each standard deployment test):
 *   this.cmtat, this.admin, this.address1, this.address2, this.address3, this.attacker
 *   this.policyEngine, this.rbacPolicy, this.rbacPolicyAddress, this.cmtatAddress
 *   this.mintSelector, this.burnSelector
 */
function CMTATModuleCommon(includeSnapshotModules = true, snapshotZeroDefault = true) {
  ERC20BaseCommon();
  MintModuleCommon();
  BurnModuleCommon();
  ERC20EnforcementCommon();
  DocumentModuleCommon();
  if (!includeSnapshotModules) {
    return;
  }
  SnapshotModuleCommon(snapshotZeroDefault);

  // Snapshot scheduling & global (from CMTAT)
  SnapshotModuleCommonScheduling();
  SnapshotModuleCommonRescheduling();
  SnapshotModuleCommonUnschedule();
  SnapshotModuleCommonGetNextSnapshot();
  SnapshotModuleMultiplePlannedTest();
  SnapshotModuleOnePlannedSnapshotTest();
  SnapshotModuleZeroPlannedSnapshotTest();
}

module.exports = CMTATModuleCommon;
