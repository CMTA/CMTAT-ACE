const { expect } = require('chai')

function BurnModuleCommon () {
  context('ERC20 Burn Module', function () {
    beforeEach(async function () {
      await this.cmtat.connect(this.admin).mint(this.address1, 100n)
    })

    it('testCanBurnByAdmin', async function () {
      this.logs = await this.cmtat.connect(this.admin)['burn(address,uint256)'](this.address1, 50n)
      expect(await this.cmtat.balanceOf(this.address1)).to.equal(50n)
      await expect(this.logs).to.emit(this.cmtat, 'Transfer').withArgs(this.address1, ethers.ZeroAddress, 50n)
    })

    it('testCannotBurnByNonBurner', async function () {
      await expect(
        this.cmtat.connect(this.address1)['burn(address,uint256)'](this.address1, 50n)
      ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
    })

    it('testCannotBurnMoreThanBalance', async function () {
      await expect(
        this.cmtat.connect(this.admin)['burn(address,uint256)'](this.address1, 200n)
      ).to.be.revertedWithCustomError(this.cmtat, 'ERC20InsufficientBalance')
    })

    it('testBatchBurn', async function () {
      await this.cmtat.connect(this.admin).mint(this.address2, 200n)
      await this.cmtat.connect(this.admin).batchBurn([this.address1, this.address2], [30n, 50n])
      expect(await this.cmtat.balanceOf(this.address1)).to.equal(70n)
      expect(await this.cmtat.balanceOf(this.address2)).to.equal(150n)
    })

    it('testBurnAndMint', async function () {
      await this.cmtat.connect(this.admin).burnAndMint(this.address1, this.address2, 30n, 50n, '0x')
      expect(await this.cmtat.balanceOf(this.address1)).to.equal(70n)
      expect(await this.cmtat.balanceOf(this.address2)).to.equal(50n)
    })
  })
}

module.exports = BurnModuleCommon
