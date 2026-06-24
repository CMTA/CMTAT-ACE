const { ethers, upgrades } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const {
  fixture,
  deployPolicyEngine,
  deployCCTStandalone,
  TERMS,
  DEPLOYMENT_DECIMAL,
} = require('../deploymentUtils');

const PARAM_SPENDER = ethers.keccak256(ethers.toUtf8Bytes('spender'));
const PARAM_FROM = ethers.keccak256(ethers.toUtf8Bytes('from'));
const PARAM_TO = ethers.keccak256(ethers.toUtf8Bytes('to'));
const PARAM_AMOUNT = ethers.keccak256(ethers.toUtf8Bytes('amount'));
const TRANSFER_PARAMS = [PARAM_SPENDER, PARAM_FROM, PARAM_TO, PARAM_AMOUNT];

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
 * Covers the Standard (CCTCommon) paths missed by the rest of the suite:
 *  - canTransferFrom (the spender-aware uRWA view)
 *  - _minterTransferOverride (reached via the minter batchTransfer)
 *
 * Note: `_canTransferWithPolicyEngine`'s `getPolicyEngine() == address(0)` early-return is
 * unreachable defensive code — the policy engine is validated non-zero at init and on
 * `attachPolicyEngine`, so it can never be zero on a deployed token. Its main (engine-attached)
 * path is already covered via `canTransfer`/`canTransferFrom`.
 */
describe('CCTCommon Standard coverage', function () {
  describe('canTransferFrom', function () {
    beforeEach(async function () {
      Object.assign(this, await loadFixture(fixture));
      this.pe = await deployPolicyEngine(true, this.admin.address);
      this.cmtat = await deployCCTStandalone(this.admin.address, await this.pe.getAddress());
      this.cmtatAddress = await this.cmtat.getAddress();
      await this.cmtat.connect(this.admin).mint(this.admin.address, 1000n);

      this.transferFromSelector = this.cmtat.interface.getFunction(
        'transferFrom(address,address,uint256)',
      ).selector;
      const extractor = await ethers.deployContract('ERC20TransferFromExtractor');
      await this.pe
        .connect(this.admin)
        .setExtractor(this.transferFromSelector, await extractor.getAddress());
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
          this.transferFromSelector,
          await this.policy.getAddress(),
          TRANSFER_PARAMS,
        );
    });

    it('is true for an allowed (spender, from, to)', async function () {
      expect(
        await this.cmtat.canTransferFrom(
          this.address1.address,
          this.admin.address,
          this.address3.address,
          100n,
        ),
      ).to.equal(true);
    });

    it('is false when the recipient is policy-restricted', async function () {
      expect(
        await this.cmtat.canTransferFrom(
          this.address1.address,
          this.admin.address,
          this.address2.address,
          100n,
        ),
      ).to.equal(false);
    });

    it('respects the unfrozen balance of `from`', async function () {
      await this.cmtat.connect(this.admin).setFrozenTokens(this.admin.address, 950n); // unfrozen = 50
      expect(
        await this.cmtat.canTransferFrom(
          this.address1.address,
          this.admin.address,
          this.address3.address,
          100n,
        ),
      ).to.equal(false);
      expect(
        await this.cmtat.canTransferFrom(
          this.address1.address,
          this.admin.address,
          this.address3.address,
          50n,
        ),
      ).to.equal(true);
    });
  });

  describe('_minterTransferOverride (via batchTransfer)', function () {
    it('a minter batchTransfer moves tokens through _minterTransferOverride', async function () {
      const { admin, address1, address2 } = await loadFixture(fixture);
      const pe = await deployPolicyEngine(true, admin.address);
      const cmtat = await deployCCTStandalone(admin.address, await pe.getAddress());
      await cmtat.connect(admin).mint(admin.address, 1000n);

      await expect(
        cmtat.connect(admin).batchTransfer([address1.address, address2.address], [10n, 20n]),
      ).to.not.be.reverted;
      expect(await cmtat.balanceOf(address1.address)).to.equal(10n);
      expect(await cmtat.balanceOf(address2.address)).to.equal(20n);
    });
  });

  /**
   * The Standard variant's canSend/canReceive always return true on the base token, so the
   * `!canSend(from)` / `!canReceive(to)` short-circuit branches in canTransfer/canTransferFrom
   * are only reachable once those virtual hooks are overridden. CanSendReceiveOverrideMock makes
   * them toggleable so both branches can be covered.
   */
  describe('canSend / canReceive short-circuit branches', function () {
    beforeEach(async function () {
      Object.assign(this, await loadFixture(fixture));
      this.pe = await deployPolicyEngine(true, this.admin.address);
      this.cmtat = await ethers.deployContract('CanSendReceiveOverrideMock', [
        this.admin.address,
        ['CMTA Token', 'CMTAT', DEPLOYMENT_DECIMAL],
        ['CMTAT_ISIN', TERMS, 'CMTAT_info'],
        await this.pe.getAddress(),
      ]);
      await this.cmtat.connect(this.admin).mint(this.admin.address, 1000n);
    });

    it('canTransfer is false when canSend(from) is false', async function () {
      await this.cmtat.connect(this.admin).setSendAllowed(false);
      expect(
        await this.cmtat.canTransfer(this.admin.address, this.address1.address, 100n),
      ).to.equal(false);
    });

    it('canTransfer is false when canReceive(to) is false', async function () {
      await this.cmtat.connect(this.admin).setReceiveAllowed(false);
      expect(
        await this.cmtat.canTransfer(this.admin.address, this.address1.address, 100n),
      ).to.equal(false);
    });

    it('canTransferFrom is false when canSend(from) is false', async function () {
      await this.cmtat.connect(this.admin).setSendAllowed(false);
      expect(
        await this.cmtat.canTransferFrom(
          this.address1.address,
          this.admin.address,
          this.address2.address,
          100n,
        ),
      ).to.equal(false);
    });

    it('canTransferFrom is false when canReceive(to) is false', async function () {
      await this.cmtat.connect(this.admin).setReceiveAllowed(false);
      expect(
        await this.cmtat.canTransferFrom(
          this.address1.address,
          this.admin.address,
          this.address2.address,
          100n,
        ),
      ).to.equal(false);
    });

    it('both are true again once the hooks are re-enabled (positive control)', async function () {
      // sanity: with hooks allowing and engine defaultAllow=true, the checks pass
      expect(
        await this.cmtat.canTransfer(this.admin.address, this.address1.address, 100n),
      ).to.equal(true);
      expect(
        await this.cmtat.canTransferFrom(
          this.address1.address,
          this.admin.address,
          this.address2.address,
          100n,
        ),
      ).to.equal(true);
    });
  });
});
