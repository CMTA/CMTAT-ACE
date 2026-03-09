const { ethers } = require('hardhat')
const { expect } = require('chai')
const {
  fixture,
  loadFixture,
  MINTER_ROLE,
  BURNER_ROLE,
  deployPolicyEngine,
  deployPausePolicy,
  deployRBACPolicy,
  deployCCTUpgradeable
} = require('../deploymentUtils')

// ACE-specific common modules
const DeploymentCommon = require('../common/ace/DeploymentCommon')
const PausePolicyCommon = require('../common/ace/PausePolicyCommon')
const RBACPolicyCommon = require('../common/ace/RBACPolicyCommon')
const CombinedPolicyCommon = require('../common/ace/CombinedPolicyCommon')
const PolicyEngineCommon = require('../common/ace/PolicyEngineCommon')

describe('ComplianceTokenCMTATUpgradeable', function () {
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

    // Deploy ComplianceToken (upgradeable proxy)
    this.cmtat = await deployCCTUpgradeable(
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

  // Proxy-specific
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

  DeploymentCommon()
  PausePolicyCommon()
  RBACPolicyCommon()
  CombinedPolicyCommon()
  PolicyEngineCommon()
})
