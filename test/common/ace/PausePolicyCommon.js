const { expect } = require('chai')

/**
 * Tests PausePolicy behavior on standard (PolicyEngine-based) contracts.
 *
 * Required `this` context:
 *   this.cmtat          – compliance token instance
 *   this.admin          – owner / authorized signer
 *   this.address1       – test address
 *   this.attacker       – unauthorized signer
 *   this.policyEngine   – PolicyEngine instance
 *   this.pausePolicy    – PausePolicy instance
 */
function PausePolicyCommon () {
  context('PausePolicy', function () {
    it('testAllowMintWhenNotPaused', async function () {
      await this.cmtat.connect(this.admin).mint(this.address1, 100n)
      expect(await this.cmtat.balanceOf(this.address1)).to.equal(100n)
    })

    it('testRejectMintWhenPaused', async function () {
      await this.pausePolicy.connect(this.admin).setPausedState(true)
      await expect(
        this.cmtat.connect(this.admin).mint(this.address1, 100n)
      ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
    })

    it('testAllowMintAfterUnpausing', async function () {
      await this.pausePolicy.connect(this.admin).setPausedState(true)
      await this.pausePolicy.connect(this.admin).setPausedState(false)
      await this.cmtat.connect(this.admin).mint(this.address1, 100n)
      expect(await this.cmtat.balanceOf(this.address1)).to.equal(100n)
    })

    it('testRejectBurnWhenPaused', async function () {
      await this.cmtat.connect(this.admin).mint(this.address1, 100n)
      await this.pausePolicy.connect(this.admin).setPausedState(true)
      await expect(
        this.cmtat.connect(this.admin)['burn(address,uint256)'](this.address1, 50n)
      ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
    })

    it('testEmitPauseStateChanged', async function () {
      await expect(this.pausePolicy.connect(this.admin).setPausedState(true))
        .to.emit(this.pausePolicy, 'PauseStateChanged')
        .withArgs(true)
      await expect(this.pausePolicy.connect(this.admin).setPausedState(false))
        .to.emit(this.pausePolicy, 'PauseStateChanged')
        .withArgs(false)
    })

    it('testRejectSettingSamePauseState', async function () {
      await expect(
        this.pausePolicy.connect(this.admin).setPausedState(false)
      ).to.be.reverted
    })

    it('testOnlyOwnerCanChangePauseState', async function () {
      await expect(
        this.pausePolicy.connect(this.attacker).setPausedState(true)
      ).to.be.revertedWithCustomError(this.pausePolicy, 'OwnableUnauthorizedAccount')
    })
  })
}

module.exports = PausePolicyCommon
