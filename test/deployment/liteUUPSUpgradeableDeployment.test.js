const { ethers, upgrades } = require('hardhat');
const { expect } = require('chai');
const {
  loadFixture,
  deployCCTLiteUUPSUpgradeable,
  createLiteFixture,
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

const PROXY_UPGRADE_ROLE = ethers.keccak256(ethers.toUtf8Bytes('PROXY_UPGRADE_ROLE'));

const liteFixture = createLiteFixture(deployCCTLiteUUPSUpgradeable);

describe('ComplianceTokenCMTATLiteUUPSUpgradeable', function () {
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

    context('UUPS Upgrade', function () {
      it('testAdminWithRoleCanUpgrade', async function () {
        await this.cmtat.connect(this.admin).grantRole(PROXY_UPGRADE_ROLE, this.admin.address);
        const FactoryV2 = await ethers.getContractFactory(
          'ComplianceTokenCMTATLiteUUPSUpgradeable',
          this.admin,
        );
        await upgrades.upgradeProxy(await this.cmtat.getAddress(), FactoryV2, {
          unsafeAllow: ['missing-initializer', 'constructor'],
          silenceWarnings: true,
          kind: 'uups',
        });
      });

      it('testCannotUpgradeWithoutProxyUpgradeRole', async function () {
        const FactoryV2 = await ethers.getContractFactory(
          'ComplianceTokenCMTATLiteUUPSUpgradeable',
          this.attacker,
        );
        await expect(
          upgrades.upgradeProxy(await this.cmtat.getAddress(), FactoryV2, {
            unsafeAllow: ['missing-initializer', 'constructor'],
            silenceWarnings: true,
            kind: 'uups',
          }),
        ).to.be.revertedWithCustomError(this.cmtat, 'AccessControlUnauthorizedAccount');
      });

      it('testStatePreservedAfterUpgrade', async function () {
        await this.cmtat.connect(this.admin).mint(this.address1.address, 100n);
        expect(await this.cmtat.balanceOf(this.address1.address)).to.equal(100n);
        await this.cmtat.connect(this.admin).grantRole(PROXY_UPGRADE_ROLE, this.admin.address);
        const FactoryV2 = await ethers.getContractFactory(
          'ComplianceTokenCMTATLiteUUPSUpgradeable',
          this.admin,
        );
        const upgraded = await upgrades.upgradeProxy(await this.cmtat.getAddress(), FactoryV2, {
          unsafeAllow: ['missing-initializer', 'constructor'],
          silenceWarnings: true,
          kind: 'uups',
        });
        expect(await upgraded.balanceOf(this.address1.address)).to.equal(100n);
        expect(await upgraded.name()).to.equal('CMTA Token');
        expect(await upgraded.symbol()).to.equal('CMTAT');
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
