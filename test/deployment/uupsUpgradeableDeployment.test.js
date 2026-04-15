const { ethers, upgrades } = require('hardhat')
const { expect } = require('chai')
const {
  fixture,
  loadFixture,
  MINTER_ROLE,
  BURNER_ROLE,
  deployPolicyEngine,
  deployPausePolicy,
  deployRBACPolicy,
  deployCCTUUPSUpgradeable
} = require('../deploymentUtils')

// ACE-specific common modules
const DeploymentCommon = require('../common/ace/DeploymentCommon')
const PausePolicyCommon = require('../common/ace/PausePolicyCommon')
const RBACPolicyCommon = require('../common/ace/RBACPolicyCommon')
const CombinedPolicyCommon = require('../common/ace/CombinedPolicyCommon')
const PolicyEngineCommon = require('../common/ace/PolicyEngineCommon')
const CMTATModuleCommon = require('../common/cmtat/CMTATModuleCommon')

describe('ComplianceTokenCMTATUUPSUpgradeable', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture))

    // Deploy PolicyEngine (defaultAllow = true)
    this.policyEngine = await deployPolicyEngine(true, this.admin.address)
    this.policyEngineAddress = await this.policyEngine.getAddress()

    // Deploy PausePolicy
    this.pausePolicy = await deployPausePolicy(this.policyEngineAddress, this.admin.address, false)
    this.pausePolicyAddress = await this.pausePolicy.getAddress()

    // Deploy RoleBasedAccessControlPolicy
    this.rbacPolicy = await deployRBACPolicy(this.policyEngineAddress, this.admin.address)
    this.rbacPolicyAddress = await this.rbacPolicy.getAddress()

    // Deploy ComplianceToken (UUPS proxy)
    this.cmtat = await deployCCTUUPSUpgradeable(
      this._.address,
      this.admin.address,
      this.policyEngineAddress
    )
    this.cmtatAddress = await this.cmtat.getAddress()

    // Get function selectors
    this.mintSelector = this.cmtat.interface.getFunction('mint(address,uint256)').selector
    this.burnSelector = this.cmtat.interface.getFunction('burn(address,uint256)').selector

    // Add PausePolicy + RBAC to PolicyEngine for mint and burn
    await this.policyEngine.connect(this.admin).addPolicy(this.cmtatAddress, this.mintSelector, this.pausePolicyAddress, [])
    await this.policyEngine.connect(this.admin).addPolicy(this.cmtatAddress, this.mintSelector, this.rbacPolicyAddress, [])
    await this.policyEngine.connect(this.admin).addPolicy(this.cmtatAddress, this.burnSelector, this.pausePolicyAddress, [])
    await this.policyEngine.connect(this.admin).addPolicy(this.cmtatAddress, this.burnSelector, this.rbacPolicyAddress, [])

    // Grant operation allowances on RBAC policy
    await this.rbacPolicy.connect(this.admin).grantOperationAllowanceToRole(this.mintSelector, MINTER_ROLE)
    await this.rbacPolicy.connect(this.admin).grantOperationAllowanceToRole(this.burnSelector, BURNER_ROLE)

    // Grant roles to admin
    await this.rbacPolicy.connect(this.admin).grantRole(MINTER_ROLE, this.admin.address)
    await this.rbacPolicy.connect(this.admin).grantRole(BURNER_ROLE, this.admin.address)
  })

  // UUPS proxy-specific
  context('Re-initialization', function () {
    it('testCannotBeReinitialized', async function () {
      await expect(
        this.cmtat.connect(this.admin).initialize(
          this.admin.address,
          ['CMTA Token', 'CMTAT', 0],
          ['CMTAT_ISIN', ['doc1', 'https://example.com/doc1', ethers.keccak256(ethers.toUtf8Bytes('h'))], 'CMTAT_info'],
          this.policyEngineAddress
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
