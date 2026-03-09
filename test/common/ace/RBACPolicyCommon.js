const { expect } = require('chai')
const { MINTER_ROLE, BURNER_ROLE } = require('../../deploymentUtils')

/**
 * Tests RoleBasedAccessControlPolicy behavior on standard (PolicyEngine-based) contracts.
 *
 * Required `this` context:
 *   this.cmtat          – compliance token instance
 *   this.admin          – owner / authorized signer (has MINTER_ROLE + BURNER_ROLE)
 *   this.address1       – test address
 *   this.address2       – test address
 *   this.attacker       – unauthorized signer
 *   this.policyEngine   – PolicyEngine instance
 *   this.rbacPolicy     – RoleBasedAccessControlPolicy instance
 *   this.mintSelector   – bytes4 selector for mint(address,uint256)
 *   this.burnSelector   – bytes4 selector for burn(address,uint256)
 */
function RBACPolicyCommon () {
  context('RoleBasedAccessControlPolicy', function () {
    it('testAllowMintByMinterRole', async function () {
      await this.cmtat.connect(this.admin).mint(this.address1, 100n)
      expect(await this.cmtat.balanceOf(this.address1)).to.equal(100n)
    })

    it('testRejectMintWithoutMinterRole', async function () {
      await expect(
        this.cmtat.connect(this.address1).mint(this.address2, 100n)
      ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
    })

    it('testAllowMintAfterGrantingMinterRole', async function () {
      await this.rbacPolicy.connect(this.admin).grantRole(MINTER_ROLE, this.address1)
      await this.cmtat.connect(this.address1).mint(this.address2, 50n)
      expect(await this.cmtat.balanceOf(this.address2)).to.equal(50n)
    })

    it('testRejectMintAfterRevokingMinterRole', async function () {
      await this.rbacPolicy.connect(this.admin).grantRole(MINTER_ROLE, this.address1)
      await this.rbacPolicy.connect(this.admin).revokeRole(MINTER_ROLE, this.address1)
      await expect(
        this.cmtat.connect(this.address1).mint(this.admin, 50n)
      ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
    })

    it('testAllowBurnByBurnerRole', async function () {
      await this.cmtat.connect(this.admin).mint(this.address1, 100n)
      await this.cmtat.connect(this.admin)['burn(address,uint256)'](this.address1, 50n)
      expect(await this.cmtat.balanceOf(this.address1)).to.equal(50n)
    })

    it('testRejectBurnWithoutBurnerRole', async function () {
      await this.cmtat.connect(this.admin).mint(this.address1, 100n)
      await expect(
        this.cmtat.connect(this.address1)['burn(address,uint256)'](this.address1, 50n)
      ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
    })

    it('testMultipleRolesForDifferentOperations', async function () {
      // Grant MINTER_ROLE to address1 (but not BURNER_ROLE)
      await this.rbacPolicy.connect(this.admin).grantRole(MINTER_ROLE, this.address1)
      await this.cmtat.connect(this.address1).mint(this.address2, 100n)
      expect(await this.cmtat.balanceOf(this.address2)).to.equal(100n)
      // address1 cannot burn
      await expect(
        this.cmtat.connect(this.address1)['burn(address,uint256)'](this.address2, 50n)
      ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
    })

    it('testHasAllowedRole', async function () {
      expect(await this.rbacPolicy.hasAllowedRole(this.mintSelector, this.admin)).to.equal(true)
      expect(await this.rbacPolicy.hasAllowedRole(this.mintSelector, this.address1)).to.equal(false)
      await this.rbacPolicy.connect(this.admin).grantRole(MINTER_ROLE, this.address1)
      expect(await this.rbacPolicy.hasAllowedRole(this.mintSelector, this.address1)).to.equal(true)
    })

    it('testEmitOperationAllowanceEvents', async function () {
      const setNameSelector = this.cmtat.interface.getFunction('setName').selector
      const testRole = ethers.keccak256(ethers.toUtf8Bytes('TEST_ROLE'))
      await expect(this.rbacPolicy.connect(this.admin).grantOperationAllowanceToRole(setNameSelector, testRole))
        .to.emit(this.rbacPolicy, 'OperationAllowanceGrantedToRole')
        .withArgs(setNameSelector, testRole)
      await expect(this.rbacPolicy.connect(this.admin).removeOperationAllowanceFromRole(setNameSelector, testRole))
        .to.emit(this.rbacPolicy, 'OperationAllowanceRemovedFromRole')
        .withArgs(setNameSelector, testRole)
    })

    it('testRejectDuplicateOperationAllowanceGrant', async function () {
      await expect(
        this.rbacPolicy.connect(this.admin).grantOperationAllowanceToRole(this.mintSelector, MINTER_ROLE)
      ).to.be.reverted
    })

    it('testOnlyOwnerCanManageOperationAllowances', async function () {
      const testRole = ethers.keccak256(ethers.toUtf8Bytes('TEST_ROLE'))
      await expect(
        this.rbacPolicy.connect(this.attacker).grantOperationAllowanceToRole(this.mintSelector, testRole)
      ).to.be.revertedWithCustomError(this.rbacPolicy, 'OwnableUnauthorizedAccount')
    })
  })
}

module.exports = RBACPolicyCommon
