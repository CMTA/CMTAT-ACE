const {
  fixture,
  loadFixture,
  deployPolicyEngine,
  deployCCTLiteStandalone
} = require('../deploymentUtils')

// Reuse CMTAT common modules
const PauseModuleCommon = require('../../submodules/CMTAT/test/common/PauseModuleCommon')
const ERC20MintModuleCommon = require('../../submodules/CMTAT/test/common/ERC20MintModuleCommon')
const ERC20BurnModuleCommon = require('../../submodules/CMTAT/test/common/ERC20BurnModuleCommon')
const ERC20BaseModuleCommon = require('../../submodules/CMTAT/test/common/ERC20BaseModuleCommon')
const EnforcementModuleCommon = require('../../submodules/CMTAT/test/common/EnforcementModuleCommon')
const ERC20EnforcementModuleCommon = require('../../submodules/CMTAT/test/common/ERC20EnforcementModuleCommon')

describe('ComplianceTokenCMTATLiteStandalone', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture))
    const policyEngine = await deployPolicyEngine(true, this.admin.address)
    this.cmtat = await deployCCTLiteStandalone(
      this._.address,
      this.admin.address,
      await policyEngine.getAddress()
    )
    this.policyEngine = policyEngine
    this.erc1404 = true
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
