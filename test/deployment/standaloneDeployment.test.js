const { loadFixture, deployCCTStandalone, createStandardFixture } = require('../deploymentUtils');

// ACE-specific common modules
const DeploymentCommon = require('../common/ace/DeploymentCommon');
const PausePolicyCommon = require('../common/ace/PausePolicyCommon');
const RBACPolicyCommon = require('../common/ace/RBACPolicyCommon');
const CombinedPolicyCommon = require('../common/ace/CombinedPolicyCommon');
const PolicyEngineCommon = require('../common/ace/PolicyEngineCommon');
const CMTATModuleCommon = require('../common/cmtat/CMTATModuleCommon');

const standardFixture = createStandardFixture(deployCCTStandalone);

describe('ComplianceTokenCMTATStandalone', function () {
  context('PolicyEngine + RBAC suites', function () {
    beforeEach(async function () {
      Object.assign(this, await loadFixture(standardFixture));
      this.dontCheckTimestamp = true;
    });

    DeploymentCommon();
    PausePolicyCommon();
    RBACPolicyCommon();
    CombinedPolicyCommon();
    PolicyEngineCommon();
    CMTATModuleCommon();
  });
});
