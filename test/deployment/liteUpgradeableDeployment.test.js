const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture, deployCCTLiteUpgradeable, createLiteFixture } = require('../deploymentUtils');

// Reuse CMTAT common modules
const PauseModuleCommon = require('../../submodules/CMTAT/test/common/PauseModuleCommon');
const ERC20MintModuleCommon = require('../../submodules/CMTAT/test/common/ERC20MintModuleCommon');
const ERC20BurnModuleCommon = require('../../submodules/CMTAT/test/common/ERC20BurnModuleCommon');
const ERC20BaseModuleCommon = require('../../submodules/CMTAT/test/common/ERC20BaseModuleCommon');
const EnforcementModuleCommon = require('../../submodules/CMTAT/test/common/EnforcementModuleCommon');
const ERC20EnforcementModuleCommon = require('../../submodules/CMTAT/test/common/ERC20EnforcementModuleCommon');
const VersionModuleCommon = require('../common/CCTVersionModuleCommon');
const ERC20CrossChainModuleCommon = require('../../submodules/CMTAT/test/common/ERC20CrossChainModuleCommon');
const CCIPModuleCommon = require('../../submodules/CMTAT/test/common/CCIPModuleCommon');
const ExtraInfoModuleCommon = require('../../submodules/CMTAT/test/common/ExtraInfoModuleCommon');
const DocumentModuleCommon = require('../../submodules/CMTAT/test/common/DocumentModule/DocumentModuleCommon');

const liteFixture = createLiteFixture(deployCCTLiteUpgradeable);

describe('ComplianceTokenCMTATLiteUpgradeable', function () {
  context('CMTAT module suites', function () {
    beforeEach(async function () {
      Object.assign(this, await loadFixture(liteFixture));
      this.dontCheckTimestamp = true;
      // The ACE Lite variant validates transfers through the PolicyEngine
      // (ValidationModuleCore) and does NOT include ValidationModuleAllowance,
      // so approvals are not gated on frozen addresses. Skip those two
      // CMTAT edge-case tests, which do not apply to this variant.
      if (
        this.currentTest &&
        ['testCannotApproveIfOwnerIsFrozen', 'testCannotApproveIfSpenderIsFrozen'].includes(
          this.currentTest.title,
        )
      ) {
        this.skip();
      }
    });

    context('Re-initialization', function () {
      it('testCannotBeReinitialized', async function () {
        const policyEngineAddress = await this.policyEngine.getAddress();
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
              policyEngineAddress,
            ),
        ).to.be.revertedWithCustomError(this.cmtat, 'InvalidInitialization');
      });
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
});
