const { ethers, upgrades } = require('hardhat')
const { expect } = require('chai')
const {
  fixture,
  loadFixture,
  deployPolicyEngine,
  deployCCTLiteUUPSUpgradeable
} = require('../deploymentUtils')

// Reuse CMTAT common modules
const PauseModuleCommon = require('../../submodules/CMTAT/test/common/PauseModuleCommon')
const ERC20MintModuleCommon = require('../../submodules/CMTAT/test/common/ERC20MintModuleCommon')
const ERC20BurnModuleCommon = require('../../submodules/CMTAT/test/common/ERC20BurnModuleCommon')
const ERC20BaseModuleCommon = require('../../submodules/CMTAT/test/common/ERC20BaseModuleCommon')
const EnforcementModuleCommon = require('../../submodules/CMTAT/test/common/EnforcementModuleCommon')
const ERC20EnforcementModuleCommon = require('../../submodules/CMTAT/test/common/ERC20EnforcementModuleCommon')
const VersionModuleCommon = require('../../submodules/CMTAT/test/common/VersionModuleCommon')
const ERC20CrossChainModuleCommon = require('../../submodules/CMTAT/test/common/ERC20CrossChainModuleCommon')
const CCIPModuleCommon = require('../../submodules/CMTAT/test/common/CCIPModuleCommon')

const PROXY_UPGRADE_ROLE = ethers.keccak256(ethers.toUtf8Bytes('PROXY_UPGRADE_ROLE'))

describe('ComplianceTokenCMTATLiteUUPSUpgradeable', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture))
    const policyEngine = await deployPolicyEngine(true, this.admin.address)
    this.cmtat = await deployCCTLiteUUPSUpgradeable(
      this._.address,
      this.admin.address,
      await policyEngine.getAddress()
    )
    this.policyEngine = policyEngine
    this.erc1404 = true
  })

  // UUPS proxy-specific
  context('Re-initialization', function () {
    it('testCannotBeReinitialized', async function () {
      const policyEngineAddress = await this.policyEngine.getAddress()
      await expect(
        this.cmtat.connect(this.admin).initialize(
          this.admin.address,
          ['CMTA Token', 'CMTAT', 0],
          ['CMTAT_ISIN', ['doc1', 'https://example.com/doc1', ethers.keccak256(ethers.toUtf8Bytes('h'))], 'CMTAT_info'],
          policyEngineAddress
        )
      ).to.be.revertedWithCustomError(this.cmtat, 'InvalidInitialization')
    })
  })

  context('UUPS Upgrade', function () {
    it('testAdminWithRoleCanUpgrade', async function () {
      // Grant PROXY_UPGRADE_ROLE to admin
      await this.cmtat.connect(this.admin).grantRole(PROXY_UPGRADE_ROLE, this.admin.address)

      const FactoryV2 = await ethers.getContractFactory('ComplianceTokenCMTATLiteUUPSUpgradeable', this.admin)
      await upgrades.upgradeProxy(await this.cmtat.getAddress(), FactoryV2, {
        constructorArgs: [this._.address],
        unsafeAllow: ['missing-initializer', 'constructor'],
        silenceWarnings: true,
        kind: 'uups'
      })
    })

    it('testCannotUpgradeWithoutProxyUpgradeRole', async function () {
      const FactoryV2 = await ethers.getContractFactory('ComplianceTokenCMTATLiteUUPSUpgradeable', this.attacker)
      await expect(
        upgrades.upgradeProxy(await this.cmtat.getAddress(), FactoryV2, {
          constructorArgs: [this._.address],
          unsafeAllow: ['missing-initializer', 'constructor'],
          silenceWarnings: true,
          kind: 'uups'
        })
      ).to.be.revertedWithCustomError(this.cmtat, 'AccessControlUnauthorizedAccount')
    })

    it('testStatePreservedAfterUpgrade', async function () {
      // Mint some tokens before upgrade
      await this.cmtat.connect(this.admin).mint(this.address1.address, 100n)
      expect(await this.cmtat.balanceOf(this.address1.address)).to.equal(100n)

      // Grant upgrade role and upgrade
      await this.cmtat.connect(this.admin).grantRole(PROXY_UPGRADE_ROLE, this.admin.address)
      const FactoryV2 = await ethers.getContractFactory('ComplianceTokenCMTATLiteUUPSUpgradeable', this.admin)
      const upgraded = await upgrades.upgradeProxy(await this.cmtat.getAddress(), FactoryV2, {
        constructorArgs: [this._.address],
        unsafeAllow: ['missing-initializer', 'constructor'],
        silenceWarnings: true,
        kind: 'uups'
      })

      // Verify state preserved
      expect(await upgraded.balanceOf(this.address1.address)).to.equal(100n)
      expect(await upgraded.name()).to.equal('CMTA Token')
      expect(await upgraded.symbol()).to.equal('CMTAT')
    })
  })

  // Core CMTAT commons
  VersionModuleCommon()
  PauseModuleCommon()
  ERC20MintModuleCommon()
  ERC20BurnModuleCommon()
  ERC20BaseModuleCommon()
  EnforcementModuleCommon()

  // Extensions
  ERC20EnforcementModuleCommon()

  // options
  ERC20CrossChainModuleCommon()
  CCIPModuleCommon()
})
