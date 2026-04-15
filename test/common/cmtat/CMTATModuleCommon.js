const ERC20BaseCommon = require('./ERC20BaseCommon')
const MintModuleCommon = require('./MintModuleCommon')
const BurnModuleCommon = require('./BurnModuleCommon')
const ERC20EnforcementCommon = require('./ERC20EnforcementCommon')

/**
 * Aggregates all CMTAT module tests for standard (PolicyEngine-based) contracts.
 *
 * Each submodule can also be imported individually for selective testing.
 *
 * Required `this` context (set up by each standard deployment test):
 *   this.cmtat, this.admin, this.address1, this.address2, this.address3, this.attacker
 *   this.policyEngine, this.rbacPolicy, this.rbacPolicyAddress, this.cmtatAddress
 *   this.mintSelector, this.burnSelector
 */
function CMTATModuleCommon () {
  ERC20BaseCommon()
  MintModuleCommon()
  BurnModuleCommon()
  ERC20EnforcementCommon()
}

module.exports = CMTATModuleCommon
