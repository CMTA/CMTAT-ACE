const { expect } = require('chai')

/**
 * Tests combined PausePolicy + RBAC behavior.
 *
 * Required `this` context:
 *   this.cmtat          – compliance token instance
 *   this.admin          – owner / authorized signer
 *   this.address1       – test address
 *   this.address2       – test address
 *   this.policyEngine   – PolicyEngine instance
 *   this.pausePolicy    – PausePolicy instance
 */
function CombinedPolicyCommon () {
  context('Combined PausePolicy + RBAC', function () {
    it('testRejectMintWhenPausedEvenWithCorrectRole', async function () {
      await this.pausePolicy.connect(this.admin).setPausedState(true)
      await expect(
        this.cmtat.connect(this.admin).mint(this.address1, 100n)
      ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
    })

    it('testRejectMintWhenUnpausedWithoutCorrectRole', async function () {
      await expect(
        this.cmtat.connect(this.address1).mint(this.address2, 100n)
      ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
    })

    it('testAllowMintWhenUnpausedWithCorrectRole', async function () {
      await this.cmtat.connect(this.admin).mint(this.address1, 100n)
      expect(await this.cmtat.balanceOf(this.address1)).to.equal(100n)
    })

    it('testPolicyOrderPauseCheckedBeforeRBAC', async function () {
      await this.pausePolicy.connect(this.admin).setPausedState(true)
      await expect(
        this.cmtat.connect(this.admin).mint(this.address1, 100n)
      ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
      await this.pausePolicy.connect(this.admin).setPausedState(false)
      await this.cmtat.connect(this.admin).mint(this.address1, 100n)
      expect(await this.cmtat.balanceOf(this.address1)).to.equal(100n)
    })

    it('testFullMintTransferBurnLifecycle', async function () {
      const MINT_AMOUNT = 200n
      const TRANSFER_AMOUNT = 50n
      const BURN_AMOUNT = 100n

      await this.cmtat.connect(this.admin).mint(this.address1, MINT_AMOUNT)
      expect(await this.cmtat.balanceOf(this.address1)).to.equal(MINT_AMOUNT)
      expect(await this.cmtat.totalSupply()).to.equal(MINT_AMOUNT)

      await this.cmtat.connect(this.address1).transfer(this.address2, TRANSFER_AMOUNT)
      expect(await this.cmtat.balanceOf(this.address1)).to.equal(MINT_AMOUNT - TRANSFER_AMOUNT)
      expect(await this.cmtat.balanceOf(this.address2)).to.equal(TRANSFER_AMOUNT)

      await this.cmtat.connect(this.admin)['burn(address,uint256)'](this.address1, BURN_AMOUNT)
      expect(await this.cmtat.balanceOf(this.address1)).to.equal(MINT_AMOUNT - TRANSFER_AMOUNT - BURN_AMOUNT)
      expect(await this.cmtat.totalSupply()).to.equal(MINT_AMOUNT - BURN_AMOUNT)
    })
  })
}

module.exports = CombinedPolicyCommon
