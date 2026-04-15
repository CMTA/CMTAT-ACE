const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture, deployCCTUpgradeable, createStandardFixture } = require('../deploymentUtils');

// ACE-specific common modules
const DeploymentCommon = require('../common/ace/DeploymentCommon');
const PausePolicyCommon = require('../common/ace/PausePolicyCommon');
const RBACPolicyCommon = require('../common/ace/RBACPolicyCommon');
const CombinedPolicyCommon = require('../common/ace/CombinedPolicyCommon');
const PolicyEngineCommon = require('../common/ace/PolicyEngineCommon');
const CMTATModuleCommon = require('../common/cmtat/CMTATModuleCommon');

const standardFixture = createStandardFixture(deployCCTUpgradeable);

describe('ComplianceTokenCMTATUpgradeable', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(standardFixture));
  });

  // Proxy-specific
  context('Re-initialization', function () {
    it('testCannotBeReinitialized', async function () {
      await expect(
        this.cmtat
          .connect(this.admin)
          .initialize(
            this.admin.address,
            ['CMTA Token', 'CMTAT', 0],
            [
              'CMTAT_ISIN',
              ['doc1', 'https://example.com/doc1', ethers.keccak256(ethers.toUtf8Bytes('h'))],
              'CMTAT_info',
            ],
            this.policyEngineAddress,
            ethers.ZeroAddress,
            ethers.ZeroAddress,
          ),
      ).to.be.revertedWithCustomError(this.cmtat, 'InvalidInitialization');
    });
  });

  DeploymentCommon();
  PausePolicyCommon();
  RBACPolicyCommon();
  CombinedPolicyCommon();
  PolicyEngineCommon();
  CMTATModuleCommon();
});
