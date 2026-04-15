const { expect } = require('chai')
const {
  ENFORCER_ROLE,
  ERC20ENFORCER_ROLE,
  DEFAULT_ADMIN_ROLE
} = require('../../deploymentUtils')

function ERC20EnforcementCommon () {
  context('ERC20 Enforcement Module', function () {
    beforeEach(async function () {
      // Set up freeze/unfreeze/forcedTransfer with RBAC
      const freezeSelector = this.cmtat.interface.getFunction('freezePartialTokens(address,uint256)').selector
      const unfreezeSelector = this.cmtat.interface.getFunction('unfreezePartialTokens(address,uint256)').selector
      const forcedTransferSelector = this.cmtat.interface.getFunction('forcedTransfer(address,address,uint256)').selector

      await this.policyEngine.connect(this.admin).addPolicy(this.cmtatAddress, freezeSelector, this.rbacPolicyAddress, [])
      await this.policyEngine.connect(this.admin).addPolicy(this.cmtatAddress, unfreezeSelector, this.rbacPolicyAddress, [])
      await this.policyEngine.connect(this.admin).addPolicy(this.cmtatAddress, forcedTransferSelector, this.rbacPolicyAddress, [])

      await this.rbacPolicy.connect(this.admin).grantOperationAllowanceToRole(freezeSelector, ERC20ENFORCER_ROLE)
      await this.rbacPolicy.connect(this.admin).grantOperationAllowanceToRole(unfreezeSelector, ERC20ENFORCER_ROLE)
      await this.rbacPolicy.connect(this.admin).grantOperationAllowanceToRole(forcedTransferSelector, ENFORCER_ROLE)

      await this.rbacPolicy.connect(this.admin).grantRole(ERC20ENFORCER_ROLE, this.admin.address)
      await this.rbacPolicy.connect(this.admin).grantRole(ENFORCER_ROLE, this.admin.address)

      // Set up transfer for testing
      const transferSelector = this.cmtat.interface.getFunction('transfer(address,uint256)').selector
      await this.policyEngine.connect(this.admin).addPolicy(this.cmtatAddress, transferSelector, this.rbacPolicyAddress, [])
      await this.rbacPolicy.connect(this.admin).grantOperationAllowanceToRole(transferSelector, DEFAULT_ADMIN_ROLE)

      await this.cmtat.connect(this.admin).mint(this.address1, 100n)
    })

    it('testFreezePartialTokens', async function () {
      await this.cmtat.connect(this.admin)['freezePartialTokens(address,uint256)'](this.address1, 50n)
      expect(await this.cmtat.getFrozenTokens(this.address1)).to.equal(50n)
    })

    it('testCannotFreezeWithoutRole', async function () {
      await expect(
        this.cmtat.connect(this.address1)['freezePartialTokens(address,uint256)'](this.address1, 50n)
      ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
    })

    it('testUnfreezePartialTokens', async function () {
      await this.cmtat.connect(this.admin)['freezePartialTokens(address,uint256)'](this.address1, 50n)
      await this.cmtat.connect(this.admin)['unfreezePartialTokens(address,uint256)'](this.address1, 30n)
      expect(await this.cmtat.getFrozenTokens(this.address1)).to.equal(20n)
    })

    it('testCannotTransferFrozenTokens', async function () {
      await this.rbacPolicy.connect(this.admin).grantRole(DEFAULT_ADMIN_ROLE, this.address1)
      await this.cmtat.connect(this.admin)['freezePartialTokens(address,uint256)'](this.address1, 60n)
      // Active balance = 100 - 60 = 40, so transferring 50 should fail
      await expect(
        this.cmtat.connect(this.address1).transfer(this.address2, 50n)
      ).to.be.revertedWithCustomError(this.cmtat, 'ERC7943InsufficientUnfrozenBalance')
    })

    it('testCanTransferActiveBalance', async function () {
      await this.rbacPolicy.connect(this.admin).grantRole(DEFAULT_ADMIN_ROLE, this.address1)
      await this.cmtat.connect(this.admin)['freezePartialTokens(address,uint256)'](this.address1, 60n)
      // Active balance = 40, transferring 40 should work
      await this.cmtat.connect(this.address1).transfer(this.address2, 40n)
      expect(await this.cmtat.balanceOf(this.address2)).to.equal(40n)
    })

    it('testForcedTransfer', async function () {
      await this.cmtat.connect(this.admin)['forcedTransfer(address,address,uint256)'](this.address1, this.address2, 50n)
      expect(await this.cmtat.balanceOf(this.address1)).to.equal(50n)
      expect(await this.cmtat.balanceOf(this.address2)).to.equal(50n)
    })

    it('testCannotForcedTransferWithoutRole', async function () {
      await expect(
        this.cmtat.connect(this.address1)['forcedTransfer(address,address,uint256)'](this.address1, this.address2, 50n)
      ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
    })

    it('testGetActiveBalance', async function () {
      await this.cmtat.connect(this.admin)['freezePartialTokens(address,uint256)'](this.address1, 30n)
      expect(await this.cmtat.getActiveBalanceOf(this.address1)).to.equal(70n)
    })
  })
}

module.exports = ERC20EnforcementCommon
