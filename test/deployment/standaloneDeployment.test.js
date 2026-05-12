const {
  loadFixture,
  deployCCTStandalone,
  createStandardFixture,
  createStandardFixtureWithSnapshot,
} = require('../deploymentUtils');

// ACE-specific common modules
const DeploymentCommon = require('../common/ace/DeploymentCommon');
const PausePolicyCommon = require('../common/ace/PausePolicyCommon');
const RBACPolicyCommon = require('../common/ace/RBACPolicyCommon');
const CombinedPolicyCommon = require('../common/ace/CombinedPolicyCommon');
const PolicyEngineCommon = require('../common/ace/PolicyEngineCommon');
const CMTATModuleCommon = require('../common/cmtat/CMTATModuleCommon');

const standardFixture = createStandardFixture(deployCCTStandalone);
const standardFixtureWithSnapshot = createStandardFixtureWithSnapshot(deployCCTStandalone);

describe('ComplianceTokenCMTATStandalone', function () {
  context('snapshotEngine = 0 (no snapshot suites)', function () {
    beforeEach(async function () {
      Object.assign(this, await loadFixture(standardFixture));
      this.dontCheckTimestamp = true;
    });

    DeploymentCommon();
    PausePolicyCommon();
    RBACPolicyCommon();
    CombinedPolicyCommon();
    PolicyEngineCommon();
    CMTATModuleCommon(false);
  });

  context('snapshotEngine is set (snapshot suites)', function () {
    beforeEach(async function () {
      Object.assign(this, await loadFixture(standardFixtureWithSnapshot));
      this.dontCheckTimestamp = true;
    });
    CMTATModuleCommon(true, false);
  });
});
