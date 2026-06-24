const { ethers, upgrades } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const {
  fixture,
  deployPolicyEngine,
  deployCCTStandalone,
  deployCCTLiteStandalone,
} = require('../deploymentUtils');

// ERC-7943 fungible profile interface id (pinned by the spec), ERC-165, and an invalid id.
const URWA_ID = '0x3edbb4c4';
const ERC165_ID = '0x01ffc9a7';
const INVALID_ID = '0xffffffff';
// type(IPolicyProtected).interfaceId — advertised by the ACE PolicyProtectedBaseUpgradeable base.
const POLICY_PROTECTED_ID = '0x79906df0';

const PARAM_SPENDER = ethers.keccak256(ethers.toUtf8Bytes('spender'));
const PARAM_FROM = ethers.keccak256(ethers.toUtf8Bytes('from'));
const PARAM_TO = ethers.keccak256(ethers.toUtf8Bytes('to'));
const PARAM_AMOUNT = ethers.keccak256(ethers.toUtf8Bytes('amount'));
const TRANSFER_PARAMS = [PARAM_SPENDER, PARAM_FROM, PARAM_TO, PARAM_AMOUNT];
const ENFORCER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('ENFORCER_ROLE'));

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

/**
 * ERC-7943 (uRWA, ERC-20 profile) conformance for both ComplianceToken variants:
 *  - ERC-165 advertises the fungible interface id 0x3edbb4c4
 *  - the uRWA check surface (canTransfer/canSend/canReceive) is present, never reverts, and
 *    reflects the unfrozen balance + the PolicyEngine's permissioned rules.
 */
describe('ERC-7943 (uRWA) conformance', function () {
  describe('ERC-165 interface id', function () {
    it('Standard advertises uRWA + ERC-165 + IPolicyProtected and rejects an invalid id', async function () {
      const { admin } = await loadFixture(fixture);
      const pe = await deployPolicyEngine(true, admin.address);
      const cmtat = await deployCCTStandalone(admin.address, await pe.getAddress());
      expect(await cmtat.supportsInterface(URWA_ID)).to.equal(true);
      expect(await cmtat.supportsInterface(ERC165_ID)).to.equal(true);
      // Forces the PolicyProtectedBaseUpgradeable.supportsInterface() operand of the `||` chain.
      expect(await cmtat.supportsInterface(POLICY_PROTECTED_ID)).to.equal(true);
      expect(await cmtat.supportsInterface(INVALID_ID)).to.equal(false);
    });

    it('Lite advertises uRWA + ERC-165 + IPolicyProtected and rejects an invalid id', async function () {
      const { admin } = await loadFixture(fixture);
      const pe = await deployPolicyEngine(true, admin.address);
      const cmtat = await deployCCTLiteStandalone(admin.address, await pe.getAddress());
      expect(await cmtat.supportsInterface(URWA_ID)).to.equal(true);
      expect(await cmtat.supportsInterface(ERC165_ID)).to.equal(true);
      // Forces the PolicyProtectedBaseUpgradeable.supportsInterface() operand of the `||` chain.
      expect(await cmtat.supportsInterface(POLICY_PROTECTED_ID)).to.equal(true);
      expect(await cmtat.supportsInterface(INVALID_ID)).to.equal(false);
    });
  });

  describe('Standard variant: canTransfer / canSend / canReceive', function () {
    beforeEach(async function () {
      Object.assign(this, await loadFixture(fixture));
      this.pe = await deployPolicyEngine(true, this.admin.address);
      this.cmtat = await deployCCTStandalone(this.admin.address, await this.pe.getAddress());
      this.cmtatAddress = await this.cmtat.getAddress();

      // Mint to admin (no mint policy + defaultAllow=true → allowed).
      await this.cmtat.connect(this.admin).mint(this.admin.address, 1000n);

      // Screen transfers: address2 is restricted.
      this.transferSelector = this.cmtat.interface.getFunction(
        'transfer(address,uint256)',
      ).selector;
      const extractor = await ethers.deployContract('ERC20TransferFromExtractor');
      await this.pe
        .connect(this.admin)
        .setExtractor(this.transferSelector, await extractor.getAddress());
      const RuleFactory = await ethers.getContractFactory('RestrictedAddressRule', this.admin);
      this.rule = await RuleFactory.deploy([this.address2.address]);
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

    it('canSend/canReceive report no account-level restriction (engine decides per transfer)', async function () {
      expect(await this.cmtat.canSend(this.address1.address)).to.equal(true);
      expect(await this.cmtat.canReceive(this.address2.address)).to.equal(true);
    });

    it('canTransfer is true for an allowed transfer', async function () {
      expect(
        await this.cmtat.canTransfer(this.admin.address, this.address1.address, 100n),
      ).to.equal(true);
    });

    it('canTransfer is false when the recipient is policy-restricted', async function () {
      expect(
        await this.cmtat.canTransfer(this.admin.address, this.address2.address, 100n),
      ).to.equal(false);
    });

    it('canTransfer respects the unfrozen balance', async function () {
      await this.cmtat.connect(this.admin).setFrozenTokens(this.admin.address, 950n); // unfrozen = 50
      expect(
        await this.cmtat.canTransfer(this.admin.address, this.address1.address, 100n),
      ).to.equal(false);
      expect(await this.cmtat.canTransfer(this.admin.address, this.address1.address, 50n)).to.equal(
        true,
      );
    });

    it('canTransfer is a non-reverting view even for arbitrary inputs', async function () {
      // Must return a boolean, never revert (ERC-7943 requirement).
      expect(
        await this.cmtat.canTransfer(this.address3.address, this.address1.address, 1n),
      ).to.be.a('boolean');
    });
  });

  describe('Lite variant: canSend/canReceive reflect account freeze', function () {
    beforeEach(async function () {
      Object.assign(this, await loadFixture(fixture));
      this.pe = await deployPolicyEngine(true, this.admin.address);
      this.cmtat = await deployCCTLiteStandalone(this.admin.address, await this.pe.getAddress());
      await this.cmtat.connect(this.admin).grantRole(ENFORCER_ROLE, this.admin.address);
    });

    it('flip to false once the account is frozen', async function () {
      expect(await this.cmtat.canSend(this.address1.address)).to.equal(true);
      expect(await this.cmtat.canReceive(this.address1.address)).to.equal(true);

      await this.cmtat
        .connect(this.admin)
        ['setAddressFrozen(address,bool)'](this.address1.address, true);

      expect(await this.cmtat.canSend(this.address1.address)).to.equal(false);
      expect(await this.cmtat.canReceive(this.address1.address)).to.equal(false);
    });
  });
});
