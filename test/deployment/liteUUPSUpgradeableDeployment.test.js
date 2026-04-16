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
const SnapshotModuleCommon = require('../common/cmtat/SnapshotModuleCommon');
// Snapshot scheduling & global modules from CMTAT
const SnapshotModuleCommonScheduling = require('../../submodules/CMTAT/test/common/SnapshotModuleCommon/SnapshotModuleCommonScheduling');
const SnapshotModuleCommonRescheduling = require('../../submodules/CMTAT/test/common/SnapshotModuleCommon/SnapshotModuleCommonRescheduling');
const SnapshotModuleCommonUnschedule = require('../../submodules/CMTAT/test/common/SnapshotModuleCommon/SnapshotModuleCommonUnschedule');
const SnapshotModuleCommonGetNextSnapshot = require('../../submodules/CMTAT/test/common/SnapshotModuleCommon/SnapshotModuleCommonGetNextSnapshot');
const SnapshotModuleMultiplePlannedTest = require('../../submodules/CMTAT/test/common/SnapshotModuleCommon/global/SnapshotModuleMultiplePlannedTest');
const SnapshotModuleOnePlannedSnapshotTest = require('../../submodules/CMTAT/test/common/SnapshotModuleCommon/global/SnapshotModuleOnePlannedSnapshotTest');
const SnapshotModuleZeroPlannedSnapshotTest = require('../../submodules/CMTAT/test/common/SnapshotModuleCommon/global/SnapshotModuleZeroPlannedSnapshot');

const PROXY_UPGRADE_ROLE = ethers.keccak256(ethers.toUtf8Bytes('PROXY_UPGRADE_ROLE'));

const liteFixture = createLiteFixture(deployCCTLiteUUPSUpgradeable);

describe('ComplianceTokenCMTATLiteUUPSUpgradeable', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(liteFixture));
  });

  // UUPS proxy-specific
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
            ethers.ZeroAddress,
            ethers.ZeroAddress,
          ),
      ).to.be.revertedWithCustomError(this.cmtat, 'InvalidInitialization');
    });
  });

  context('UUPS Upgrade', function () {
    it('testAdminWithRoleCanUpgrade', async function () {
      // Grant PROXY_UPGRADE_ROLE to admin
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
      // Mint some tokens before upgrade
      await this.cmtat.connect(this.admin).mint(this.address1.address, 100n);
      expect(await this.cmtat.balanceOf(this.address1.address)).to.equal(100n);

      // Grant upgrade role and upgrade
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

      // Verify state preserved
      expect(await upgraded.balanceOf(this.address1.address)).to.equal(100n);
      expect(await upgraded.name()).to.equal('CMTA Token');
      expect(await upgraded.symbol()).to.equal('CMTAT');
    });
  });

  // Core CMTAT commons
  VersionModuleCommon();
  PauseModuleCommon();
  ERC20MintModuleCommon();
  ERC20BurnModuleCommon();
  ERC20BaseModuleCommon();
  EnforcementModuleCommon();

  // Extensions
  ERC20EnforcementModuleCommon();

  // options
  ERC20CrossChainModuleCommon();
  CCIPModuleCommon();

  // Extensions
  ExtraInfoModuleCommon();

  // Engines
  DocumentModuleCommon();
  SnapshotModuleCommon();

  // Snapshot scheduling & global
  SnapshotModuleCommonScheduling();
  SnapshotModuleCommonRescheduling();
  SnapshotModuleCommonUnschedule();
  SnapshotModuleCommonGetNextSnapshot();
  SnapshotModuleMultiplePlannedTest();
  SnapshotModuleOnePlannedSnapshotTest();
  SnapshotModuleZeroPlannedSnapshotTest();
});
