const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { fixture, deployPolicyEngine, deployCCTLiteStandalone } = require('../deploymentUtils');

describe('ERC1404 validation and MintBurnExtractor coverage', function () {
  async function deployLiteFixture() {
    const base = await loadFixture(fixture);
    const policyEngine = await deployPolicyEngine(true, base.admin.address);
    const policyEngineAddress = await policyEngine.getAddress();
    const cmtat = await deployCCTLiteStandalone(base.admin.address, policyEngineAddress);
    return { ...base, policyEngine, cmtat };
  }

  describe('PolicyValidationModuleERC1404 / CCTCMTATBaseERC1404', function () {
    beforeEach(async function () {
      Object.assign(this, await deployLiteFixture());
      await this.cmtat.connect(this.admin).mint(this.address1.address, 100n);
      await this.cmtat.connect(this.admin).mint(this.address2.address, 10n);
    });

    it('returns NoRestriction for unrestricted transfer code', async function () {
      const code = await this.cmtat.detectTransferRestriction(
        this.address1.address,
        this.address2.address,
        10n,
      );
      expect(code).to.equal(0n);
      expect(await this.cmtat.messageForTransferRestriction(code)).to.equal('NoRestriction');
    });

    it('returns EnforcedPause when paused', async function () {
      await this.cmtat.connect(this.admin).pause();
      const code = await this.cmtat.detectTransferRestriction(
        this.address1.address,
        this.address2.address,
        10n,
      );
      expect(await this.cmtat.messageForTransferRestriction(code)).to.equal('EnforcedPause');
    });

    it('returns ContractDeactivated when deactivated', async function () {
      await this.cmtat.connect(this.admin).pause();
      await this.cmtat.connect(this.admin).deactivateContract();
      const code = await this.cmtat.detectTransferRestriction(
        this.address1.address,
        this.address2.address,
        10n,
      );
      expect(await this.cmtat.messageForTransferRestriction(code)).to.equal('ContractDeactivated');
    });

    it('returns AddrFromIsFrozen when sender is frozen', async function () {
      await this.cmtat.connect(this.admin).setAddressFrozen(this.address1.address, true);
      const code = await this.cmtat.detectTransferRestriction(
        this.address1.address,
        this.address2.address,
        10n,
      );
      expect(await this.cmtat.messageForTransferRestriction(code)).to.equal('AddrFromIsFrozen');
    });

    it('returns AddrToIsFrozen when recipient is frozen', async function () {
      await this.cmtat.connect(this.admin).setAddressFrozen(this.address2.address, true);
      const code = await this.cmtat.detectTransferRestriction(
        this.address1.address,
        this.address2.address,
        10n,
      );
      expect(await this.cmtat.messageForTransferRestriction(code)).to.equal('AddrToIsFrozen');
    });

    it('returns AddrSpenderIsFrozen for detectTransferRestrictionFrom', async function () {
      await this.cmtat.connect(this.admin).setAddressFrozen(this.address3.address, true);
      const code = await this.cmtat.detectTransferRestrictionFrom(
        this.address3.address,
        this.address1.address,
        this.address2.address,
        10n,
      );
      expect(await this.cmtat.messageForTransferRestriction(code)).to.equal('AddrSpenderIsFrozen');
    });

    it('returns downstream restriction code in detectTransferRestrictionFrom when spender is not frozen', async function () {
      await this.cmtat.connect(this.admin).setAddressFrozen(this.address2.address, true);
      const code = await this.cmtat.detectTransferRestrictionFrom(
        this.address3.address,
        this.address1.address,
        this.address2.address,
        10n,
      );
      expect(await this.cmtat.messageForTransferRestriction(code)).to.equal('AddrToIsFrozen');
    });

    it('returns TRANSFER_OK in detectTransferRestrictionFrom when spender and transfer are valid', async function () {
      const code = await this.cmtat.detectTransferRestrictionFrom(
        this.address3.address,
        this.address1.address,
        this.address2.address,
        10n,
      );
      expect(code).to.equal(0n);
      expect(await this.cmtat.messageForTransferRestriction(code)).to.equal('NoRestriction');
    });

    it('returns insufficient active balance code and message', async function () {
      await this.cmtat
        .connect(this.admin)
        ['freezePartialTokens(address,uint256)'](this.address1.address, 95n);

      const code = await this.cmtat.detectTransferRestriction(
        this.address1.address,
        this.address2.address,
        20n,
      );

      expect(await this.cmtat.messageForTransferRestriction(code)).to.equal(
        'AddrFrom:insufficientActiveBalance',
      );
    });

    it('returns UnknownCode for arbitrary unsupported code', async function () {
      expect(await this.cmtat.messageForTransferRestriction(255)).to.equal('UnknownCode');
    });
  });

  describe('MintBurnExtractor', function () {
    beforeEach(async function () {
      Object.assign(this, await loadFixture(fixture));
      this.extractor = await ethers.deployContract('MintBurnExtractor');
    });

    it('extracts account and amount for mint(address,uint256)', async function () {
      const payload = {
        selector: '0x40c10f19',
        sender: this.admin.address,
        data: ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [this.address1.address, 123n]),
        context: '0x',
      };

      const params = await this.extractor.extract(payload);
      expect(params.length).to.equal(2);
      expect(params[0].name).to.equal(ethers.keccak256(ethers.toUtf8Bytes('account')));
      expect(ethers.AbiCoder.defaultAbiCoder().decode(['address'], params[0].value)[0]).to.equal(
        this.address1.address,
      );
      expect(ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], params[1].value)[0]).to.equal(123n);
    });

    it('extracts account and amount for burnFrom(address,uint256)', async function () {
      const payload = {
        selector: '0x79cc6790',
        sender: this.admin.address,
        data: ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [this.address2.address, 50n]),
        context: '0x',
      };

      const params = await this.extractor.extract(payload);
      expect(ethers.AbiCoder.defaultAbiCoder().decode(['address'], params[0].value)[0]).to.equal(
        this.address2.address,
      );
      expect(ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], params[1].value)[0]).to.equal(50n);
    });

    it('uses sender as account for burn(uint256)', async function () {
      const payload = {
        selector: '0x42966c68',
        sender: this.address3.address,
        data: ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [77n]),
        context: '0x',
      };

      const params = await this.extractor.extract(payload);
      expect(ethers.AbiCoder.defaultAbiCoder().decode(['address'], params[0].value)[0]).to.equal(
        this.address3.address,
      );
      expect(ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], params[1].value)[0]).to.equal(77n);
    });

    it('reverts on unsupported selector', async function () {
      const payload = {
        selector: '0x12345678',
        sender: this.admin.address,
        data: '0x',
        context: '0x',
      };

      await expect(this.extractor.extract(payload)).to.be.reverted;
    });
  });
});
