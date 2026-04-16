const { ethers, upgrades } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { fixture, deployPolicyEngine, deployCCTLiteStandalone } = require('../deploymentUtils');

// Parameter name hashes matching the ERC20TransferFromExtractor
const PARAM_SPENDER = ethers.keccak256(ethers.toUtf8Bytes('spender'));
const PARAM_FROM = ethers.keccak256(ethers.toUtf8Bytes('from'));
const PARAM_TO = ethers.keccak256(ethers.toUtf8Bytes('to'));
const PARAM_AMOUNT = ethers.keccak256(ethers.toUtf8Bytes('amount'));
const TRANSFER_PARAM_NAMES = [PARAM_SPENDER, PARAM_FROM, PARAM_TO, PARAM_AMOUNT];

/**
 * Deploy TransferValidationPolicy via upgrades.deployProxy
 */
async function deployTransferValidationPolicy(policyEngineAddress, ownerAddress, ruleAddresses) {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const configParams =
    ruleAddresses.length > 0 ? abiCoder.encode(['address[]'], [ruleAddresses]) : '0x';
  const Factory = await ethers.getContractFactory('TransferValidationPolicy');
  const policy = await upgrades.deployProxy(
    Factory,
    [policyEngineAddress, ownerAddress, configParams],
    {
      initializer: 'initialize',
      unsafeAllow: ['constructor', 'missing-initializer', 'missing-initializer-call'],
      silenceWarnings: true,
    },
  );
  return policy;
}

/**
 * Deploy ERC20TransferFromExtractor (plain deploy, no proxy needed)
 */
async function deployERC20TransferFromExtractor() {
  const extractor = await ethers.deployContract('ERC20TransferFromExtractor');
  return extractor;
}

describe('TransferValidationPolicy', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));

    // Deploy PolicyEngine (defaultAllow = true so mint/burn work without extra policies)
    this.policyEngine = await deployPolicyEngine(true, this.admin.address);
    this.policyEngineAddress = await this.policyEngine.getAddress();

    // Deploy Lite Standalone token
    this.cmtat = await deployCCTLiteStandalone(
      this.admin.address,
      this.policyEngineAddress,
    );
    this.cmtatAddress = await this.cmtat.getAddress();

    // Deploy ERC20TransferFromExtractor
    this.extractor = await deployERC20TransferFromExtractor();
    this.extractorAddress = await this.extractor.getAddress();

    // Get transfer/transferFrom selectors
    this.transferSelector = this.cmtat.interface.getFunction('transfer(address,uint256)').selector;
    this.transferFromSelector = this.cmtat.interface.getFunction(
      'transferFrom(address,address,uint256)',
    ).selector;

    // Set extractor for transfer and transferFrom selectors on the policy engine
    await this.policyEngine
      .connect(this.admin)
      .setExtractor(this.transferSelector, this.extractorAddress);
    await this.policyEngine
      .connect(this.admin)
      .setExtractor(this.transferFromSelector, this.extractorAddress);

    // Mint tokens to admin for test transfers
    await this.cmtat.connect(this.admin).mint(this.admin.address, 1000n);
  });

  describe('MaxAmountRule', function () {
    beforeEach(async function () {
      // Deploy MaxAmountRule with max = 100
      this.maxAmountRule = await ethers.deployContract('MaxAmountRule', [100n]);
      this.maxAmountRuleAddress = await this.maxAmountRule.getAddress();

      // Deploy TransferValidationPolicy with the MaxAmountRule
      this.transferPolicy = await deployTransferValidationPolicy(
        this.policyEngineAddress,
        this.admin.address,
        [this.maxAmountRuleAddress],
      );
      this.transferPolicyAddress = await this.transferPolicy.getAddress();

      // Add TransferValidationPolicy to the PolicyEngine for transfer and transferFrom
      await this.policyEngine
        .connect(this.admin)
        .addPolicy(
          this.cmtatAddress,
          this.transferSelector,
          this.transferPolicyAddress,
          TRANSFER_PARAM_NAMES,
        );
      await this.policyEngine
        .connect(this.admin)
        .addPolicy(
          this.cmtatAddress,
          this.transferFromSelector,
          this.transferPolicyAddress,
          TRANSFER_PARAM_NAMES,
        );
    });

    describe('transfer', function () {
      it('should allow transfer within max amount', async function () {
        await expect(this.cmtat.connect(this.admin).transfer(this.address1.address, 50n)).to.not.be
          .reverted;
        expect(await this.cmtat.balanceOf(this.address1.address)).to.equal(50n);
      });

      it('should allow transfer at exact max amount', async function () {
        await expect(this.cmtat.connect(this.admin).transfer(this.address1.address, 100n)).to.not.be
          .reverted;
        expect(await this.cmtat.balanceOf(this.address1.address)).to.equal(100n);
      });

      it('should reject transfer exceeding max amount', async function () {
        await expect(this.cmtat.connect(this.admin).transfer(this.address1.address, 101n)).to.be
          .reverted;
      });
    });

    describe('transferFrom', function () {
      beforeEach(async function () {
        // Admin approves address1 to spend
        await this.cmtat.connect(this.admin).approve(this.address1.address, 500n);
      });

      it('should allow transferFrom within max amount', async function () {
        await expect(
          this.cmtat
            .connect(this.address1)
            .transferFrom(this.admin.address, this.address2.address, 50n),
        ).to.not.be.reverted;
        expect(await this.cmtat.balanceOf(this.address2.address)).to.equal(50n);
      });

      it('should reject transferFrom exceeding max amount', async function () {
        await expect(
          this.cmtat
            .connect(this.address1)
            .transferFrom(this.admin.address, this.address2.address, 101n),
        ).to.be.reverted;
      });
    });

    describe('canTransfer', function () {
      it('should return true for transfer within max amount', async function () {
        expect(await this.cmtat.canTransfer(this.admin.address, this.address1.address, 50n)).to.be
          .true;
      });

      it('should return false for transfer exceeding max amount', async function () {
        expect(await this.cmtat.canTransfer(this.admin.address, this.address1.address, 101n)).to.be
          .false;
      });
    });

    describe('canTransferFrom', function () {
      it('should return true for transferFrom within max amount', async function () {
        expect(
          await this.cmtat.canTransferFrom(
            this.address1.address,
            this.admin.address,
            this.address2.address,
            50n,
          ),
        ).to.be.true;
      });

      it('should return false for transferFrom exceeding max amount', async function () {
        expect(
          await this.cmtat.canTransferFrom(
            this.address1.address,
            this.admin.address,
            this.address2.address,
            101n,
          ),
        ).to.be.false;
      });
    });
  });

  describe('RestrictedAddressRule', function () {
    beforeEach(async function () {
      // Deploy RestrictedAddressRule with address2 restricted initially
      this.restrictedRule = await ethers.deployContract('RestrictedAddressRule', [
        [this.address2.address],
      ]);
      this.restrictedRuleAddress = await this.restrictedRule.getAddress();

      // Deploy TransferValidationPolicy with the RestrictedAddressRule
      this.transferPolicy = await deployTransferValidationPolicy(
        this.policyEngineAddress,
        this.admin.address,
        [this.restrictedRuleAddress],
      );
      this.transferPolicyAddress = await this.transferPolicy.getAddress();

      // Add TransferValidationPolicy for transfer and transferFrom
      await this.policyEngine
        .connect(this.admin)
        .addPolicy(
          this.cmtatAddress,
          this.transferSelector,
          this.transferPolicyAddress,
          TRANSFER_PARAM_NAMES,
        );
      await this.policyEngine
        .connect(this.admin)
        .addPolicy(
          this.cmtatAddress,
          this.transferFromSelector,
          this.transferPolicyAddress,
          TRANSFER_PARAM_NAMES,
        );
    });

    describe('transfer', function () {
      it('should allow transfer to unrestricted address', async function () {
        await expect(this.cmtat.connect(this.admin).transfer(this.address1.address, 50n)).to.not.be
          .reverted;
        expect(await this.cmtat.balanceOf(this.address1.address)).to.equal(50n);
      });

      it('should reject transfer to restricted address', async function () {
        await expect(this.cmtat.connect(this.admin).transfer(this.address2.address, 50n)).to.be
          .reverted;
      });

      it('should reject transfer from restricted address', async function () {
        // First give address2 some tokens via unrestricted path (remove restriction temporarily)
        await this.restrictedRule.setRestricted(this.address2.address, false);
        await this.cmtat.connect(this.admin).transfer(this.address2.address, 100n);
        // Re-restrict
        await this.restrictedRule.setRestricted(this.address2.address, true);

        await expect(this.cmtat.connect(this.address2).transfer(this.address1.address, 50n)).to.be
          .reverted;
      });

      it('should allow transfer after removing restriction', async function () {
        await this.restrictedRule.setRestricted(this.address2.address, false);
        await expect(this.cmtat.connect(this.admin).transfer(this.address2.address, 50n)).to.not.be
          .reverted;
        expect(await this.cmtat.balanceOf(this.address2.address)).to.equal(50n);
      });
    });

    describe('canTransfer', function () {
      it('should return true for unrestricted addresses', async function () {
        expect(await this.cmtat.canTransfer(this.admin.address, this.address1.address, 50n)).to.be
          .true;
      });

      it('should return false when recipient is restricted', async function () {
        expect(await this.cmtat.canTransfer(this.admin.address, this.address2.address, 50n)).to.be
          .false;
      });

      it('should return false when sender is restricted', async function () {
        expect(await this.cmtat.canTransfer(this.address2.address, this.address1.address, 50n)).to
          .be.false;
      });
    });
  });

  describe('Multiple rules (MaxAmount + RestrictedAddress)', function () {
    beforeEach(async function () {
      this.maxAmountRule = await ethers.deployContract('MaxAmountRule', [200n]);
      this.restrictedRule = await ethers.deployContract('RestrictedAddressRule', [
        [this.address3.address],
      ]);

      this.transferPolicy = await deployTransferValidationPolicy(
        this.policyEngineAddress,
        this.admin.address,
        [await this.maxAmountRule.getAddress(), await this.restrictedRule.getAddress()],
      );
      this.transferPolicyAddress = await this.transferPolicy.getAddress();

      await this.policyEngine
        .connect(this.admin)
        .addPolicy(
          this.cmtatAddress,
          this.transferSelector,
          this.transferPolicyAddress,
          TRANSFER_PARAM_NAMES,
        );
      await this.policyEngine
        .connect(this.admin)
        .addPolicy(
          this.cmtatAddress,
          this.transferFromSelector,
          this.transferPolicyAddress,
          TRANSFER_PARAM_NAMES,
        );
    });

    it('should allow valid transfer (within amount, unrestricted)', async function () {
      await expect(this.cmtat.connect(this.admin).transfer(this.address1.address, 100n)).to.not.be
        .reverted;
    });

    it('should reject transfer exceeding max amount even to unrestricted address', async function () {
      await expect(this.cmtat.connect(this.admin).transfer(this.address1.address, 201n)).to.be
        .reverted;
    });

    it('should reject transfer to restricted address even within max amount', async function () {
      await expect(this.cmtat.connect(this.admin).transfer(this.address3.address, 50n)).to.be
        .reverted;
    });

    it('canTransfer should return false when either rule rejects', async function () {
      // Exceeds max
      expect(await this.cmtat.canTransfer(this.admin.address, this.address1.address, 201n)).to.be
        .false;
      // Restricted recipient
      expect(await this.cmtat.canTransfer(this.admin.address, this.address3.address, 50n)).to.be
        .false;
    });

    it('canTransfer should return true when both rules pass', async function () {
      expect(await this.cmtat.canTransfer(this.admin.address, this.address1.address, 100n)).to.be
        .true;
    });
  });

  describe('Policy management', function () {
    it('should work with no rules configured', async function () {
      // Deploy policy with no rules — all transfers should pass
      this.transferPolicy = await deployTransferValidationPolicy(
        this.policyEngineAddress,
        this.admin.address,
        [],
      );
      this.transferPolicyAddress = await this.transferPolicy.getAddress();

      await this.policyEngine
        .connect(this.admin)
        .addPolicy(
          this.cmtatAddress,
          this.transferSelector,
          this.transferPolicyAddress,
          TRANSFER_PARAM_NAMES,
        );

      await expect(this.cmtat.connect(this.admin).transfer(this.address1.address, 500n)).to.not.be
        .reverted;
    });

    it('should allow owner to update rules via setRules', async function () {
      // Start with no rules
      this.transferPolicy = await deployTransferValidationPolicy(
        this.policyEngineAddress,
        this.admin.address,
        [],
      );
      this.transferPolicyAddress = await this.transferPolicy.getAddress();

      await this.policyEngine
        .connect(this.admin)
        .addPolicy(
          this.cmtatAddress,
          this.transferSelector,
          this.transferPolicyAddress,
          TRANSFER_PARAM_NAMES,
        );

      // Transfer should succeed with no rules
      await expect(this.cmtat.connect(this.admin).transfer(this.address1.address, 500n)).to.not.be
        .reverted;

      // Now add a MaxAmountRule via setRules
      const maxAmountRule = await ethers.deployContract('MaxAmountRule', [100n]);
      await this.transferPolicy.connect(this.admin).setRules([await maxAmountRule.getAddress()]);

      // Transfer above max should now fail
      await expect(this.cmtat.connect(this.admin).transfer(this.address2.address, 101n)).to.be
        .reverted;

      // Transfer within max should still succeed
      await expect(this.cmtat.connect(this.admin).transfer(this.address2.address, 50n)).to.not.be
        .reverted;
    });

    it('should not allow non-owner to call setRules', async function () {
      this.transferPolicy = await deployTransferValidationPolicy(
        this.policyEngineAddress,
        this.admin.address,
        [],
      );

      const maxAmountRule = await ethers.deployContract('MaxAmountRule', [100n]);
      await expect(
        this.transferPolicy.connect(this.address1).setRules([await maxAmountRule.getAddress()]),
      ).to.be.reverted;
    });

    it('should report correct rules and rulesCount', async function () {
      const rule1 = await ethers.deployContract('MaxAmountRule', [100n]);
      const rule2 = await ethers.deployContract('RestrictedAddressRule', [[]]);

      this.transferPolicy = await deployTransferValidationPolicy(
        this.policyEngineAddress,
        this.admin.address,
        [await rule1.getAddress(), await rule2.getAddress()],
      );

      expect(await this.transferPolicy.rulesCount()).to.equal(2n);
      const rules = await this.transferPolicy.rules();
      expect(rules[0]).to.equal(await rule1.getAddress());
      expect(rules[1]).to.equal(await rule2.getAddress());
    });
  });

  describe('No policy attached (defaultAllow = true)', function () {
    it('should allow transfers when no policy is registered for transfer selector', async function () {
      // PolicyEngine has defaultAllow = true and no policy for transfer
      await expect(this.cmtat.connect(this.admin).transfer(this.address1.address, 500n)).to.not.be
        .reverted;
    });

    it('canTransfer should return true when no policy is registered', async function () {
      expect(await this.cmtat.canTransfer(this.admin.address, this.address1.address, 500n)).to.be
        .true;
    });
  });

  describe('canTransfer with module-level restrictions', function () {
    beforeEach(async function () {
      // Set up MaxAmountRule policy on transfer selector
      this.maxAmountRule = await ethers.deployContract('MaxAmountRule', [100n]);
      this.transferPolicy = await deployTransferValidationPolicy(
        this.policyEngineAddress,
        this.admin.address,
        [await this.maxAmountRule.getAddress()],
      );
      this.transferPolicyAddress = await this.transferPolicy.getAddress();

      await this.policyEngine
        .connect(this.admin)
        .addPolicy(
          this.cmtatAddress,
          this.transferSelector,
          this.transferPolicyAddress,
          TRANSFER_PARAM_NAMES,
        );

      // Give address1 some tokens
      await this.cmtat.connect(this.admin).transfer(this.address1.address, 50n);
    });

    it('canTransfer should return false when sender is frozen', async function () {
      await this.cmtat.connect(this.admin).setAddressFrozen(this.address1.address, true);
      expect(await this.cmtat.canTransfer(this.address1.address, this.address2.address, 10n)).to.be
        .false;
    });

    it('canTransfer should return false when recipient is frozen', async function () {
      await this.cmtat.connect(this.admin).setAddressFrozen(this.address2.address, true);
      expect(await this.cmtat.canTransfer(this.address1.address, this.address2.address, 10n)).to.be
        .false;
    });

    it('canTransfer should return false when contract is paused', async function () {
      await this.cmtat.connect(this.admin).pause();
      expect(await this.cmtat.canTransfer(this.address1.address, this.address2.address, 10n)).to.be
        .false;
    });

    it('canTransfer should return false when transfer exceeds active balance (frozen tokens)', async function () {
      // Freeze 40 of address1's 50 tokens → active balance = 10
      await this.cmtat
        .connect(this.admin)
        ['freezePartialTokens(address,uint256)'](this.address1.address, 40n);
      expect(await this.cmtat.canTransfer(this.address1.address, this.address2.address, 20n)).to.be
        .false;
    });

    it('canTransfer should return true for valid transfer with no module restrictions', async function () {
      expect(await this.cmtat.canTransfer(this.address1.address, this.address2.address, 10n)).to.be
        .true;
    });
  });
});
