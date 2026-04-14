const { expect } = require('chai')
const { MINTER_ROLE, BURNER_ROLE, BURNER_FROM_ROLE, BURNER_SELF_ROLE, ENFORCER_ROLE, ERC20ENFORCER_ROLE, DEFAULT_ADMIN_ROLE, DOCUMENT_ROLE, SNAPSHOOTER_ROLE, CROSS_CHAIN_ROLE } = require('../../deploymentUtils')

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
 *   this.rbacPolicyAddress – address of rbacPolicy
 *   this.cmtatAddress   – address of cmtat
 *   this.mintSelector   – bytes4 selector for mint(address,uint256)
 *   this.burnSelector   – bytes4 selector for burn(address,uint256)
 */
function RBACPolicyCommon () {
  context('RoleBasedAccessControlPolicy', function () {
    beforeEach(async function () {
      // Set up forcedTransfer selector + policy + role
      this.forcedTransferSelector = this.cmtat.interface.getFunction('forcedTransfer(address,address,uint256)').selector
      await this.policyEngine.connect(this.admin).addPolicy(this.cmtatAddress, this.forcedTransferSelector, this.rbacPolicyAddress, [])
      await this.rbacPolicy.connect(this.admin).grantOperationAllowanceToRole(this.forcedTransferSelector, ENFORCER_ROLE)
      await this.rbacPolicy.connect(this.admin).grantRole(ENFORCER_ROLE, this.admin.address)

      // Set up freezePartialTokens selector + policy + role
      this.freezeSelector = this.cmtat.interface.getFunction('freezePartialTokens(address,uint256)').selector
      await this.policyEngine.connect(this.admin).addPolicy(this.cmtatAddress, this.freezeSelector, this.rbacPolicyAddress, [])
      await this.rbacPolicy.connect(this.admin).grantOperationAllowanceToRole(this.freezeSelector, ERC20ENFORCER_ROLE)

      // Set up unfreezePartialTokens selector + policy + role
      this.unfreezeSelector = this.cmtat.interface.getFunction('unfreezePartialTokens(address,uint256)').selector
      await this.policyEngine.connect(this.admin).addPolicy(this.cmtatAddress, this.unfreezeSelector, this.rbacPolicyAddress, [])
      await this.rbacPolicy.connect(this.admin).grantOperationAllowanceToRole(this.unfreezeSelector, ERC20ENFORCER_ROLE)
      await this.rbacPolicy.connect(this.admin).grantRole(ERC20ENFORCER_ROLE, this.admin.address)

      // Set up setName selector + policy + role (DEFAULT_ADMIN_ROLE granted by RBAC configure())
      this.setNameSelector = this.cmtat.interface.getFunction('setName').selector
      await this.policyEngine.connect(this.admin).addPolicy(this.cmtatAddress, this.setNameSelector, this.rbacPolicyAddress, [])
      await this.rbacPolicy.connect(this.admin).grantOperationAllowanceToRole(this.setNameSelector, DEFAULT_ADMIN_ROLE)

      // Set up setTokenId selector + policy + role
      this.setTokenIdSelector = this.cmtat.interface.getFunction('setTokenId').selector
      await this.policyEngine.connect(this.admin).addPolicy(this.cmtatAddress, this.setTokenIdSelector, this.rbacPolicyAddress, [])
      await this.rbacPolicy.connect(this.admin).grantOperationAllowanceToRole(this.setTokenIdSelector, DEFAULT_ADMIN_ROLE)

      // Set up setDocumentEngine selector + policy + role
      this.setDocumentEngineSelector = this.cmtat.interface.getFunction('setDocumentEngine').selector
      await this.policyEngine.connect(this.admin).addPolicy(this.cmtatAddress, this.setDocumentEngineSelector, this.rbacPolicyAddress, [])
      await this.rbacPolicy.connect(this.admin).grantOperationAllowanceToRole(this.setDocumentEngineSelector, DOCUMENT_ROLE)
      await this.rbacPolicy.connect(this.admin).grantRole(DOCUMENT_ROLE, this.admin.address)

      // Set up setSnapshotEngine selector + policy + role
      this.setSnapshotEngineSelector = this.cmtat.interface.getFunction('setSnapshotEngine').selector
      await this.policyEngine.connect(this.admin).addPolicy(this.cmtatAddress, this.setSnapshotEngineSelector, this.rbacPolicyAddress, [])
      await this.rbacPolicy.connect(this.admin).grantOperationAllowanceToRole(this.setSnapshotEngineSelector, SNAPSHOOTER_ROLE)
      await this.rbacPolicy.connect(this.admin).grantRole(SNAPSHOOTER_ROLE, this.admin.address)

      // Set up setCCIPAdmin selector + policy + role
      this.setCCIPAdminSelector = this.cmtat.interface.getFunction('setCCIPAdmin').selector
      await this.policyEngine.connect(this.admin).addPolicy(this.cmtatAddress, this.setCCIPAdminSelector, this.rbacPolicyAddress, [])
      await this.rbacPolicy.connect(this.admin).grantOperationAllowanceToRole(this.setCCIPAdminSelector, DEFAULT_ADMIN_ROLE)

      // Set up crosschainMint selector + policy + role
      this.crosschainMintSelector = this.cmtat.interface.getFunction('crosschainMint').selector
      await this.policyEngine.connect(this.admin).addPolicy(this.cmtatAddress, this.crosschainMintSelector, this.rbacPolicyAddress, [])
      await this.rbacPolicy.connect(this.admin).grantOperationAllowanceToRole(this.crosschainMintSelector, CROSS_CHAIN_ROLE)

      // Set up crosschainBurn selector + policy + role
      this.crosschainBurnSelector = this.cmtat.interface.getFunction('crosschainBurn').selector
      await this.policyEngine.connect(this.admin).addPolicy(this.cmtatAddress, this.crosschainBurnSelector, this.rbacPolicyAddress, [])
      await this.rbacPolicy.connect(this.admin).grantOperationAllowanceToRole(this.crosschainBurnSelector, CROSS_CHAIN_ROLE)

      // Set up burnFrom selector + policy + role
      this.burnFromSelector = this.cmtat.interface.getFunction('burnFrom').selector
      await this.policyEngine.connect(this.admin).addPolicy(this.cmtatAddress, this.burnFromSelector, this.rbacPolicyAddress, [])
      await this.rbacPolicy.connect(this.admin).grantOperationAllowanceToRole(this.burnFromSelector, BURNER_FROM_ROLE)

      // Set up burn(uint256) self-burn selector + policy + role
      this.selfBurnSelector = this.cmtat.interface.getFunction('burn(uint256)').selector
      await this.policyEngine.connect(this.admin).addPolicy(this.cmtatAddress, this.selfBurnSelector, this.rbacPolicyAddress, [])
      await this.rbacPolicy.connect(this.admin).grantOperationAllowanceToRole(this.selfBurnSelector, BURNER_SELF_ROLE)
    })

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

    // ---- forcedTransfer ----

    it('testAllowForcedTransferByEnforcerRole', async function () {
      await this.cmtat.connect(this.admin).mint(this.address1, 100n)
      await this.cmtat.connect(this.admin)['forcedTransfer(address,address,uint256)'](this.address1, this.address2, 50n)
      expect(await this.cmtat.balanceOf(this.address1)).to.equal(50n)
      expect(await this.cmtat.balanceOf(this.address2)).to.equal(50n)
    })

    it('testRejectForcedTransferWithoutEnforcerRole', async function () {
      await this.cmtat.connect(this.admin).mint(this.address1, 100n)
      await expect(
        this.cmtat.connect(this.address1)['forcedTransfer(address,address,uint256)'](this.address1, this.address2, 50n)
      ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
    })

    it('testAllowForcedTransferAfterGrantingEnforcerRole', async function () {
      await this.cmtat.connect(this.admin).mint(this.address1, 100n)
      await this.rbacPolicy.connect(this.admin).grantRole(ENFORCER_ROLE, this.address2)
      await this.cmtat.connect(this.address2)['forcedTransfer(address,address,uint256)'](this.address1, this.address2, 50n)
      expect(await this.cmtat.balanceOf(this.address2)).to.equal(50n)
    })

    it('testRejectForcedTransferAfterRevokingEnforcerRole', async function () {
      await this.cmtat.connect(this.admin).mint(this.address1, 100n)
      await this.rbacPolicy.connect(this.admin).grantRole(ENFORCER_ROLE, this.address2)
      await this.rbacPolicy.connect(this.admin).revokeRole(ENFORCER_ROLE, this.address2)
      await expect(
        this.cmtat.connect(this.address2)['forcedTransfer(address,address,uint256)'](this.address1, this.address2, 50n)
      ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
    })

    // ---- freezePartialTokens / unfreezePartialTokens ----

    it('testAllowFreezeByERC20EnforcerRole', async function () {
      await this.cmtat.connect(this.admin).mint(this.address1, 100n)
      await this.cmtat.connect(this.admin)['freezePartialTokens(address,uint256)'](this.address1, 50n)
      expect(await this.cmtat.getFrozenTokens(this.address1)).to.equal(50n)
    })

    it('testRejectFreezeWithoutERC20EnforcerRole', async function () {
      await this.cmtat.connect(this.admin).mint(this.address1, 100n)
      await expect(
        this.cmtat.connect(this.address1)['freezePartialTokens(address,uint256)'](this.address1, 50n)
      ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
    })

    it('testAllowUnfreezeByERC20EnforcerRole', async function () {
      await this.cmtat.connect(this.admin).mint(this.address1, 100n)
      await this.cmtat.connect(this.admin)['freezePartialTokens(address,uint256)'](this.address1, 50n)
      await this.cmtat.connect(this.admin)['unfreezePartialTokens(address,uint256)'](this.address1, 30n)
      expect(await this.cmtat.getFrozenTokens(this.address1)).to.equal(20n)
    })

    it('testRejectUnfreezeWithoutERC20EnforcerRole', async function () {
      await this.cmtat.connect(this.admin).mint(this.address1, 100n)
      await this.cmtat.connect(this.admin)['freezePartialTokens(address,uint256)'](this.address1, 50n)
      await expect(
        this.cmtat.connect(this.address1)['unfreezePartialTokens(address,uint256)'](this.address1, 30n)
      ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
    })

    // ---- setName (ERC20 Attribute Management) ----

    it('testAllowSetNameByAdminRole', async function () {
      await this.cmtat.connect(this.admin).setName('New Name')
      expect(await this.cmtat.name()).to.equal('New Name')
    })

    it('testRejectSetNameWithoutAdminRole', async function () {
      await expect(
        this.cmtat.connect(this.address1).setName('New Name')
      ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
    })

    // ---- setTokenId (Extra Information Management) ----

    it('testAllowSetTokenIdByAdminRole', async function () {
      await this.cmtat.connect(this.admin).setTokenId('NEW_ISIN')
      expect(await this.cmtat.tokenId()).to.equal('NEW_ISIN')
    })

    it('testRejectSetTokenIdWithoutAdminRole', async function () {
      await expect(
        this.cmtat.connect(this.address1).setTokenId('NEW_ISIN')
      ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
    })

    // ---- setDocumentEngine (Document Management) ----

    it('testAllowSetDocumentEngineByDocumentRole', async function () {
      await this.cmtat.connect(this.admin).setDocumentEngine(this.address1)
    })

    it('testRejectSetDocumentEngineWithoutDocumentRole', async function () {
      await expect(
        this.cmtat.connect(this.address1).setDocumentEngine(this.address2)
      ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
    })

    // ---- setSnapshotEngine (Snapshots) ----

    it('testAllowSetSnapshotEngineBySnapshooterRole', async function () {
      await this.cmtat.connect(this.admin).setSnapshotEngine(this.address1)
    })

    it('testRejectSetSnapshotEngineWithoutSnapshooterRole', async function () {
      await expect(
        this.cmtat.connect(this.address1).setSnapshotEngine(this.address2)
      ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
    })

    // ---- setCCIPAdmin ----

    it('testAllowSetCCIPAdminByAdminRole', async function () {
      await this.cmtat.connect(this.admin).setCCIPAdmin(this.address1)
      expect(await this.cmtat.getCCIPAdmin()).to.equal(this.address1)
    })

    it('testRejectSetCCIPAdminWithoutAdminRole', async function () {
      await expect(
        this.cmtat.connect(this.address1).setCCIPAdmin(this.address2)
      ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
    })

    // ---- crosschainMint / crosschainBurn (CROSS_CHAIN_ROLE) ----

    it('testRejectCrosschainMintWithoutCrossChainRole', async function () {
      await expect(
        this.cmtat.connect(this.address1).crosschainMint(this.address2, 100n)
      ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
    })

    it('testAllowCrosschainMintWithCrossChainRole', async function () {
      await this.rbacPolicy.connect(this.admin).grantRole(CROSS_CHAIN_ROLE, this.address1)
      await this.cmtat.connect(this.address1).crosschainMint(this.address2, 100n)
      expect(await this.cmtat.balanceOf(this.address2)).to.equal(100n)
    })

    it('testRejectCrosschainBurnWithoutCrossChainRole', async function () {
      await this.rbacPolicy.connect(this.admin).grantRole(CROSS_CHAIN_ROLE, this.admin)
      await this.cmtat.connect(this.admin).crosschainMint(this.address1, 100n)
      await expect(
        this.cmtat.connect(this.address1).crosschainBurn(this.address1, 50n)
      ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
    })

    it('testAllowCrosschainBurnWithCrossChainRole', async function () {
      await this.rbacPolicy.connect(this.admin).grantRole(CROSS_CHAIN_ROLE, this.admin)
      await this.cmtat.connect(this.admin).crosschainMint(this.address1, 100n)
      await this.cmtat.connect(this.admin).crosschainBurn(this.address1, 50n)
      expect(await this.cmtat.balanceOf(this.address1)).to.equal(50n)
    })

    // ---- burnFrom (BURNER_FROM_ROLE) ----

    it('testRejectBurnFromWithoutBurnerFromRole', async function () {
      await this.cmtat.connect(this.admin).mint(this.address1, 100n)
      await expect(
        this.cmtat.connect(this.address1).burnFrom(this.address1, 50n)
      ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
    })

    it('testAllowBurnFromWithBurnerFromRole', async function () {
      await this.cmtat.connect(this.admin).mint(this.address1, 100n)
      await this.cmtat.connect(this.address1).approve(this.admin, 50n)
      await this.rbacPolicy.connect(this.admin).grantRole(BURNER_FROM_ROLE, this.admin)
      await this.cmtat.connect(this.admin).burnFrom(this.address1, 50n)
      expect(await this.cmtat.balanceOf(this.address1)).to.equal(50n)
    })

    // ---- burn(uint256) self-burn (BURNER_SELF_ROLE) ----

    it('testRejectSelfBurnWithoutBurnerSelfRole', async function () {
      await this.cmtat.connect(this.admin).mint(this.address1, 100n)
      await expect(
        this.cmtat.connect(this.address1)['burn(uint256)'](50n)
      ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
    })

    it('testAllowSelfBurnWithBurnerSelfRole', async function () {
      await this.cmtat.connect(this.admin).mint(this.address1, 100n)
      await this.rbacPolicy.connect(this.admin).grantRole(BURNER_SELF_ROLE, this.address1)
      await this.cmtat.connect(this.address1)['burn(uint256)'](50n)
      expect(await this.cmtat.balanceOf(this.address1)).to.equal(50n)
    })
  })
}

module.exports = RBACPolicyCommon
