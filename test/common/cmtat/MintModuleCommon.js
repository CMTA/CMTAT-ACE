const { expect } = require('chai')
const { MINTER_ROLE } = require('../../deploymentUtils')

const ZERO_ADDRESS = ethers.ZeroAddress

function MintModuleCommon () {
  context('ERC20 Mint Module', function () {
    it('testCanBeMintedByAdmin', async function () {
      expect(await this.cmtat.balanceOf(this.address1)).to.equal(0n)
      this.logs = await this.cmtat.connect(this.admin).mint(this.address1, 20n)
      expect(await this.cmtat.balanceOf(this.address1)).to.equal(20n)
      expect(await this.cmtat.totalSupply()).to.equal(20n)
      await expect(this.logs).to.emit(this.cmtat, 'Transfer').withArgs(ZERO_ADDRESS, this.address1, 20n)
      await expect(this.logs).to.emit(this.cmtat, 'Mint').withArgs(this.admin, this.address1, 20n, '0x')
    })

    it('testCanMintByNewMinter', async function () {
      await this.rbacPolicy.connect(this.admin).grantRole(MINTER_ROLE, this.address1)
      await this.cmtat.connect(this.address1).mint(this.address2, 50n)
      expect(await this.cmtat.balanceOf(this.address2)).to.equal(50n)
    })

    it('testCannotMintByNonMinter', async function () {
      await expect(
        this.cmtat.connect(this.address1).mint(this.address1, 20n)
      ).to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
    })

    it('testBatchMint', async function () {
      const holders = [this.address1, this.address2, this.address3]
      const amounts = [10n, 100n, 1000n]
      await this.cmtat.connect(this.admin).batchMint(holders, amounts)
      expect(await this.cmtat.balanceOf(this.address1)).to.equal(10n)
      expect(await this.cmtat.balanceOf(this.address2)).to.equal(100n)
      expect(await this.cmtat.balanceOf(this.address3)).to.equal(1000n)
      expect(await this.cmtat.totalSupply()).to.equal(1110n)
    })

    it('testCannotMintToZeroAddress', async function () {
      await expect(
        this.cmtat.connect(this.admin).mint(ZERO_ADDRESS, 20n)
      ).to.be.revertedWithCustomError(this.cmtat, 'ERC20InvalidReceiver')
    })
  })
}

module.exports = MintModuleCommon
