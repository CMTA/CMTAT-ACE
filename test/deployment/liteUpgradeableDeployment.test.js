const { ethers, upgrades } = require('hardhat')
const { expect } = require('chai')
const {
  fixture,
  loadFixture,
  deployPolicyEngine,
  deployCCTLiteUpgradeable
} = require('../deploymentUtils')

// Reuse CMTAT common modules
const PauseModuleCommon = require('../../submodules/CMTAT/test/common/PauseModuleCommon')
const ERC20MintModuleCommon = require('../../submodules/CMTAT/test/common/ERC20MintModuleCommon')
const ERC20BurnModuleCommon = require('../../submodules/CMTAT/test/common/ERC20BurnModuleCommon')
const ERC20BaseModuleCommon = require('../../submodules/CMTAT/test/common/ERC20BaseModuleCommon')
const EnforcementModuleCommon = require('../../submodules/CMTAT/test/common/EnforcementModuleCommon')
const ERC20EnforcementModuleCommon = require('../../submodules/CMTAT/test/common/ERC20EnforcementModuleCommon')

describe('ComplianceTokenCMTATLiteUpgradeable', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture))
    const policyEngine = await deployPolicyEngine(true, this.admin.address)
    this.cmtat = await deployCCTLiteUpgradeable(
      this._.address,
      this.admin.address,
      await policyEngine.getAddress()
    )
    this.policyEngine = policyEngine
    this.erc1404 = true
  })

  // Proxy-specific
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

  // Core CMTAT commons
  PauseModuleCommon()
  ERC20MintModuleCommon()
  ERC20BurnModuleCommon()
  ERC20BaseModuleCommon()
  EnforcementModuleCommon()

  // Extensions
  ERC20EnforcementModuleCommon()
})
