const { ethers, upgrades } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
const {
  fixture,
  deployPolicyEngine,
  deployCCTStandalone,
  deployCCTLiteStandalone,
} = require('../deploymentUtils');

const PARAM_SPENDER = ethers.keccak256(ethers.toUtf8Bytes('spender'));
const PARAM_FROM = ethers.keccak256(ethers.toUtf8Bytes('from'));
const PARAM_TO = ethers.keccak256(ethers.toUtf8Bytes('to'));
const PARAM_AMOUNT = ethers.keccak256(ethers.toUtf8Bytes('amount'));
const TRANSFER_PARAMS = [PARAM_SPENDER, PARAM_FROM, PARAM_TO, PARAM_AMOUNT];
const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));
const ERC20ENFORCER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('ERC20ENFORCER_ROLE'));

async function deployTransferValidationPolicy(policyEngineAddress, owner, ruleAddresses) {
  const cfg =
    ruleAddresses.length > 0
      ? ethers.AbiCoder.defaultAbiCoder().encode(['address[]'], [ruleAddresses])
      : '0x';
  const Factory = await ethers.getContractFactory('TransferValidationPolicy');
  return upgrades.deployProxy(Factory, [policyEngineAddress, owner, cfg], {
    initializer: 'initialize',
    unsafeAllow: ['constructor', 'missing-initializer', 'missing-initializer-call'],
    silenceWarnings: true,
  });
}

/** Parse the token logs of a tx receipt into ordered event names. */
function eventNames(receipt, iface) {
  return receipt.logs
    .map((l) => {
      try {
        return iface.parseLog(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .map((p) => p.name);
}

describe('Enforcement behavior', function () {
  describe('Standard: real transfer is enforced via runPolicy', function () {
    beforeEach(async function () {
      Object.assign(this, await loadFixture(fixture));
      this.pe = await deployPolicyEngine(true, this.admin.address);
      this.cmtat = await deployCCTStandalone(this.admin.address, await this.pe.getAddress());
      this.cmtatAddress = await this.cmtat.getAddress();

      await this.cmtat.connect(this.admin).mint(this.admin.address, 1000n);

      this.transferSelector = this.cmtat.interface.getFunction(
        'transfer(address,uint256)',
      ).selector;
      const extractor = await ethers.deployContract('ERC20TransferFromExtractor');
      await this.pe
        .connect(this.admin)
        .setExtractor(this.transferSelector, await extractor.getAddress());
      const RuleFactory = await ethers.getContractFactory('RestrictedAddressRule', this.admin);
      this.rule = await RuleFactory.deploy([this.address2.address]); // address2 restricted
      this.policy = await deployTransferValidationPolicy(
        await this.pe.getAddress(),
        this.admin.address,
        [await this.rule.getAddress()],
      );
      await this.pe
        .connect(this.admin)
        .addPolicy(
          this.cmtatAddress,
          this.transferSelector,
          await this.policy.getAddress(),
          TRANSFER_PARAMS,
        );
    });

    it('reverts a real transfer to a policy-restricted recipient', async function () {
      await expect(this.cmtat.connect(this.admin).transfer(this.address2.address, 100n))
        .to.be.revertedWithCustomError(this.pe, 'PolicyRunRejected')
        .withArgs(await this.policy.getAddress(), 'Recipient is restricted', anyValue);
    });

    it('allows a real transfer to a clean recipient', async function () {
      await expect(this.cmtat.connect(this.admin).transfer(this.address3.address, 100n)).to.not.be
        .reverted;
      expect(await this.cmtat.balanceOf(this.address3.address)).to.equal(100n);
    });

    it('the canTransfer preview matches the real outcome', async function () {
      expect(
        await this.cmtat.canTransfer(this.admin.address, this.address2.address, 100n),
      ).to.equal(false);
      expect(
        await this.cmtat.canTransfer(this.admin.address, this.address3.address, 100n),
      ).to.equal(true);
    });
  });

  describe('forcedTransfer emits Frozen before Transfer (ERC-7943)', function () {
    beforeEach(async function () {
      Object.assign(this, await loadFixture(fixture));
      this.pe = await deployPolicyEngine(true, this.admin.address);
      this.cmtat = await deployCCTLiteStandalone(this.admin.address, await this.pe.getAddress());

      await this.cmtat.connect(this.admin).grantRole(MINTER_ROLE, this.admin.address);
      await this.cmtat.connect(this.admin).grantRole(ERC20ENFORCER_ROLE, this.admin.address);

      await this.cmtat.connect(this.admin).mint(this.address1.address, 100n);
      await this.cmtat.connect(this.admin).setFrozenTokens(this.address1.address, 100n); // all frozen
    });

    it('unfreezes (Frozen) before the underlying Transfer, and emits ForcedTransfer', async function () {
      const tx = await this.cmtat
        .connect(this.admin)
        .forcedTransfer(this.address1.address, this.address2.address, 60n);
      const receipt = await tx.wait();
      const names = eventNames(receipt, this.cmtat.interface);

      expect(names, names.join(',')).to.include('Frozen');
      expect(names).to.include('Transfer');
      expect(names).to.include('ForcedTransfer');
      // ERC-7943: the Frozen change MUST be emitted before the base Transfer event.
      expect(names.indexOf('Frozen')).to.be.lessThan(names.indexOf('Transfer'));

      expect(await this.cmtat.balanceOf(this.address2.address)).to.equal(60n);
      expect(await this.cmtat.getFrozenTokens(this.address1.address)).to.equal(40n);
    });
  });
});
