const { ethers, upgrades } = require('hardhat')
const { expect } = require('chai')
const {
  loadFixture,
  deployCCTUUPSUpgradeable,
  createStandardFixture
} = require('../deploymentUtils')

// ACE-specific common modules
const DeploymentCommon = require('../common/ace/DeploymentCommon')
const PausePolicyCommon = require('../common/ace/PausePolicyCommon')
const RBACPolicyCommon = require('../common/ace/RBACPolicyCommon')
const CombinedPolicyCommon = require('../common/ace/CombinedPolicyCommon')
const PolicyEngineCommon = require('../common/ace/PolicyEngineCommon')
const CMTATModuleCommon = require('../common/cmtat/CMTATModuleCommon')

const standardFixture = createStandardFixture(deployCCTUUPSUpgradeable)

describe('ComplianceTokenCMTATUUPSUpgradeable', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(standardFixture))
  })

  // UUPS proxy-specific
  context('Re-initialization', function () {
    it('testCannotBeReinitialized', async function () {
      await expect(
        this.cmtat.connect(this.admin).initialize(
          this.admin.address,
          ['CMTA Token', 'CMTAT', 0],
          ['CMTAT_ISIN', ['doc1', 'https://example.com/doc1', ethers.keccak256(ethers.toUtf8Bytes('h'))], 'CMTAT_info'],
          this.policyEngineAddress,
          ethers.ZeroAddress,
          ethers.ZeroAddress
        )
      ).to.be.revertedWithCustomError(this.cmtat, 'InvalidInitialization')
    })
  })

  context('UUPS Upgrade', function () {
    it('testOwnerCanUpgrade', async function () {
      const FactoryV2 = await ethers.getContractFactory('ComplianceTokenCMTATUUPSUpgradeable', this.admin)
      await upgrades.upgradeProxy(await this.cmtat.getAddress(), FactoryV2, {
        constructorArgs: [this._.address],
        unsafeAllow: ['missing-initializer', 'constructor'],
        silenceWarnings: true,
        kind: 'uups'
      })
    })

    it('testNonOwnerCannotUpgrade', async function () {
      const FactoryV2 = await ethers.getContractFactory('ComplianceTokenCMTATUUPSUpgradeable', this.attacker)
      await expect(
        upgrades.upgradeProxy(await this.cmtat.getAddress(), FactoryV2, {
          constructorArgs: [this._.address],
          unsafeAllow: ['missing-initializer', 'constructor'],
          silenceWarnings: true,
          kind: 'uups'
        })
      ).to.be.revertedWithCustomError(this.cmtat, 'OwnableUnauthorizedAccount')
    })

    it('testStatePreservedAfterUpgrade', async function () {
      // Mint some tokens before upgrade
      await this.cmtat.connect(this.admin).mint(this.address1.address, 100n)
      expect(await this.cmtat.balanceOf(this.address1.address)).to.equal(100n)

      // Upgrade
      const FactoryV2 = await ethers.getContractFactory('ComplianceTokenCMTATUUPSUpgradeable', this.admin)
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

  DeploymentCommon()
  PausePolicyCommon()
  RBACPolicyCommon()
  CombinedPolicyCommon()
  PolicyEngineCommon()
  CMTATModuleCommon()
})
