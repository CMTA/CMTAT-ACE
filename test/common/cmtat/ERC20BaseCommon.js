const { expect } = require('chai')

function ERC20BaseCommon () {
  context('ERC20 Base Module', function () {
    context('Token structure', function () {
      it('testHasTheDefinedName', async function () {
        expect(await this.cmtat.name()).to.equal('CMTA Token')
      })

      it('testHasTheDefinedSymbol', async function () {
        expect(await this.cmtat.symbol()).to.equal('CMTAT')
      })

      it('testDecimalsEqual0', async function () {
        expect(await this.cmtat.decimals()).to.equal(0)
      })
    })

    context('Balance & Transfer', function () {
      const TOKEN_AMOUNTS = [31n, 32n, 33n]
      const TOKEN_INITIAL_SUPPLY = TOKEN_AMOUNTS.reduce((a, b) => a + b)

      beforeEach(async function () {
        await this.cmtat.connect(this.admin).mint(this.address1, TOKEN_AMOUNTS[0])
        await this.cmtat.connect(this.admin).mint(this.address2, TOKEN_AMOUNTS[1])
        await this.cmtat.connect(this.admin).mint(this.address3, TOKEN_AMOUNTS[2])
      })

      it('testHasTheCorrectBalanceBatch', async function () {
        const ADDRESSES = [this.address1, this.address2, this.address3]
        const result = await this.cmtat.batchBalanceOf(ADDRESSES)
        expect(result[0][0]).to.equal(TOKEN_AMOUNTS[0])
        expect(result[0][1]).to.equal(TOKEN_AMOUNTS[1])
        expect(result[1]).to.equal(TOKEN_INITIAL_SUPPLY)
      })

      it('testTransferFromOneAccountToAnother', async function () {
        const AMOUNT = 11n
        this.logs = await this.cmtat.connect(this.address1).transfer(this.address2, AMOUNT)
        expect(await this.cmtat.balanceOf(this.address1)).to.equal(TOKEN_AMOUNTS[0] - AMOUNT)
        expect(await this.cmtat.balanceOf(this.address2)).to.equal(TOKEN_AMOUNTS[1] + AMOUNT)
        await expect(this.logs).to.emit(this.cmtat, 'Transfer').withArgs(this.address1, this.address2, AMOUNT)
      })

      it('testCannotTransferMoreTokensThanOwn', async function () {
        const BALANCE = await this.cmtat.balanceOf(this.address1)
        await expect(
          this.cmtat.connect(this.address1).transfer(this.address2, 50n)
        ).to.be.revertedWithCustomError(this.cmtat, 'ERC20InsufficientBalance')
          .withArgs(this.address1.address, BALANCE, 50n)
      })

      it('testTransferFromWithAllowance', async function () {
        await this.cmtat.connect(this.address1).approve(this.address3, 20n)
        const AMOUNT = 11n
        this.logs = await this.cmtat.connect(this.address3).transferFrom(this.address1, this.address2, AMOUNT)
        expect(await this.cmtat.balanceOf(this.address1)).to.equal(TOKEN_AMOUNTS[0] - AMOUNT)
        expect(await this.cmtat.balanceOf(this.address2)).to.equal(TOKEN_AMOUNTS[1] + AMOUNT)
        await expect(this.logs).to.emit(this.cmtat, 'Transfer').withArgs(this.address1, this.address2, AMOUNT)
      })

      it('testCannotTransferFromWithInsufficientAllowance', async function () {
        await this.cmtat.connect(this.address1).approve(this.address3, 20n)
        await expect(
          this.cmtat.connect(this.address3).transferFrom(this.address1, this.address2, 31n)
        ).to.be.revertedWithCustomError(this.cmtat, 'ERC20InsufficientAllowance')
          .withArgs(this.address3.address, 20n, 31n)
      })
    })

    context('Allowance', function () {
      it('testApproveAllowance', async function () {
        expect(await this.cmtat.allowance(this.address1, this.address3)).to.equal(0n)
        this.logs = await this.cmtat.connect(this.address1).approve(this.address3, 20n)
        expect(await this.cmtat.allowance(this.address1, this.address3)).to.equal(20n)
        await expect(this.logs).to.emit(this.cmtat, 'Approval').withArgs(this.address1, this.address3, 20n)
      })
    })
  })
}

module.exports = ERC20BaseCommon
