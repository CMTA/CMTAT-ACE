const {
  loadFixture,
  deployCCTLiteStandalone,
  createLiteFixture,
  createLiteFixtureWithSnapshot,
} = require('../deploymentUtils');

// Reuse CMTAT common modules
const PauseModuleCommon = require('../../submodules/CMTAT/test/common/PauseModuleCommon');
const ERC20MintModuleCommon = require('../../submodules/CMTAT/test/common/ERC20MintModuleCommon');
const ERC20BurnModuleCommon = require('../../submodules/CMTAT/test/common/ERC20BurnModuleCommon');
const ERC20BaseModuleCommon = require('../../submodules/CMTAT/test/common/ERC20BaseModuleCommon');
const EnforcementModuleCommon = require('../../submodules/CMTAT/test/common/EnforcementModuleCommon');
const ERC20EnforcementModuleCommon = require('../../submodules/CMTAT/test/common/ERC20EnforcementModuleCommon');
const VersionModuleCommon = require('../../submodules/CMTAT/test/common/VersionModuleCommon');
const ERC20CrossChainModuleCommon = require('../../submodules/CMTAT/test/common/ERC20CrossChainModuleCommon');
const CCIPModuleCommon = require('../../submodules/CMTAT/test/common/CCIPModuleCommon');
const ExtraInfoModuleCommon = require('../../submodules/CMTAT/test/common/ExtraInfoModuleCommon');
const DocumentModuleCommon = require('../../submodules/CMTAT/test/common/DocumentModule/DocumentModuleCommon');
const SnapshotModuleCommon = require('../common/cmtat/SnapshotModuleCommon');
// Snapshot scheduling & global modules from CMTAT
const SnapshotModuleCommonScheduling = require('../../submodules/CMTAT/test/common/SnapshotModuleCommon/SnapshotModuleCommonScheduling');
const SnapshotModuleCommonRescheduling = require('../../submodules/CMTAT/test/common/SnapshotModuleCommon/SnapshotModuleCommonRescheduling');
const SnapshotModuleCommonUnschedule = require('../../submodules/CMTAT/test/common/SnapshotModuleCommon/SnapshotModuleCommonUnschedule');
const SnapshotModuleCommonGetNextSnapshot = require('../../submodules/CMTAT/test/common/SnapshotModuleCommon/SnapshotModuleCommonGetNextSnapshot');
const SnapshotModuleMultiplePlannedTest = require('../../submodules/CMTAT/test/common/SnapshotModuleCommon/global/SnapshotModuleMultiplePlannedTest');
const SnapshotModuleOnePlannedSnapshotTest = require('../../submodules/CMTAT/test/common/SnapshotModuleCommon/global/SnapshotModuleOnePlannedSnapshotTest');
const SnapshotModuleZeroPlannedSnapshotTest = require('../../submodules/CMTAT/test/common/SnapshotModuleCommon/global/SnapshotModuleZeroPlannedSnapshot');

const liteFixture = createLiteFixture(deployCCTLiteStandalone);
const liteFixtureWithSnapshot = createLiteFixtureWithSnapshot(deployCCTLiteStandalone);

describe('ComplianceTokenCMTATLiteStandalone', function () {
  context('snapshotEngine = 0 (no snapshot suites)', function () {
    beforeEach(async function () {
      Object.assign(this, await loadFixture(liteFixture));
      this.dontCheckTimestamp = true;
    });

    VersionModuleCommon();
    PauseModuleCommon();
    ERC20MintModuleCommon();
    ERC20BurnModuleCommon();
    ERC20BaseModuleCommon();
    EnforcementModuleCommon();
    ERC20EnforcementModuleCommon();
    ERC20CrossChainModuleCommon();
    CCIPModuleCommon();
    ExtraInfoModuleCommon();
    DocumentModuleCommon();
  });

  context('snapshotEngine is set (snapshot suites)', function () {
    beforeEach(async function () {
      Object.assign(this, await loadFixture(liteFixtureWithSnapshot));
      this.dontCheckTimestamp = true;
    });

    SnapshotModuleCommon(false);
    SnapshotModuleCommonScheduling();
    SnapshotModuleCommonRescheduling();
    SnapshotModuleCommonUnschedule();
    SnapshotModuleCommonGetNextSnapshot();
    SnapshotModuleMultiplePlannedTest();
    SnapshotModuleOnePlannedSnapshotTest();
    SnapshotModuleZeroPlannedSnapshotTest();
  });
});
