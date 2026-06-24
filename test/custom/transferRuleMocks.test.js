const { ethers, artifacts } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { fixture } = require('../deploymentUtils');

const TRANSFER_OK = 0;
const AMOUNT_TOO_HIGH = 13;
const FROM_RESTRICTED = 14;
const TO_RESTRICTED = 15;

// transferred() is overloaded; address ethers via the full signatures.
const TRANSFERRED_3 = 'transferred(address,address,uint256)';
const TRANSFERRED_4 = 'transferred(address,address,address,uint256)';

// Compute type(IRule).interfaceId (ERC-165) the way Solidity does: the XOR of the selectors
// declared directly in IRule, excluding functions inherited from IRuleEngineERC1404. Deriving it
// from the artifacts (child ABI minus parent ABI) keeps the assertion tracking the interface
// rather than a hardcoded constant.
async function selectorSet(fqn) {
  const art = await artifacts.readArtifact(fqn);
  const iface = new ethers.Interface(art.abi);
  const set = new Set();
  iface.forEachFunction((f) => set.add(f.selector));
  return set;
}

async function iRuleInterfaceId() {
  const child = await selectorSet('submodules/RuleEngine/src/interfaces/IRule.sol:IRule');
  const parent = await selectorSet('CMTAT/interfaces/engine/IRuleEngine.sol:IRuleEngineERC1404');
  let id = 0n;
  for (const sel of child) {
    if (!parent.has(sel)) id ^= BigInt(sel);
  }
  return '0x' + (id & 0xffffffffn).toString(16).padStart(8, '0');
}

describe('MaxAmountRule (example rule)', function () {
  const MAX = 100n;

  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
    const Factory = await ethers.getContractFactory('MaxAmountRule', this.admin);
    this.rule = await Factory.deploy(MAX);
    this.a = this.address1.address;
    this.b = this.address2.address;
    this.spender = this.address3.address;
  });

  it('exposes the configured maxAmount', async function () {
    expect(await this.rule.maxAmount()).to.equal(MAX);
  });

  describe('detectTransferRestriction', function () {
    it('returns TRANSFER_OK when amount <= max (boundary included)', async function () {
      expect(await this.rule.detectTransferRestriction(this.a, this.b, MAX)).to.equal(TRANSFER_OK);
      expect(await this.rule.detectTransferRestriction(this.a, this.b, MAX - 1n)).to.equal(
        TRANSFER_OK,
      );
    });

    it('returns AMOUNT_TOO_HIGH when amount > max', async function () {
      expect(await this.rule.detectTransferRestriction(this.a, this.b, MAX + 1n)).to.equal(
        AMOUNT_TOO_HIGH,
      );
    });
  });

  describe('detectTransferRestrictionFrom', function () {
    it('delegates to detectTransferRestriction (ignores spender)', async function () {
      expect(
        await this.rule.detectTransferRestrictionFrom(this.spender, this.a, this.b, MAX),
      ).to.equal(TRANSFER_OK);
      expect(
        await this.rule.detectTransferRestrictionFrom(this.spender, this.a, this.b, MAX + 1n),
      ).to.equal(AMOUNT_TOO_HIGH);
    });
  });

  describe('canTransfer / canTransferFrom', function () {
    it('canTransfer mirrors the restriction code', async function () {
      expect(await this.rule.canTransfer(this.a, this.b, MAX)).to.equal(true);
      expect(await this.rule.canTransfer(this.a, this.b, MAX + 1n)).to.equal(false);
    });

    it('canTransferFrom mirrors canTransfer (ignores spender)', async function () {
      expect(await this.rule.canTransferFrom(this.spender, this.a, this.b, MAX)).to.equal(true);
      expect(await this.rule.canTransferFrom(this.spender, this.a, this.b, MAX + 1n)).to.equal(
        false,
      );
    });
  });

  describe('transferred (enforcement hook)', function () {
    it('does not revert when the amount is within max', async function () {
      await expect(this.rule[TRANSFERRED_3](this.a, this.b, MAX)).to.not.be.reverted;
      await expect(this.rule[TRANSFERRED_4](this.spender, this.a, this.b, MAX)).to.not.be.reverted;
    });

    it('reverts with MaxAmountRule_InvalidTransfer when the amount exceeds max', async function () {
      await expect(this.rule[TRANSFERRED_3](this.a, this.b, MAX + 1n))
        .to.be.revertedWithCustomError(this.rule, 'MaxAmountRule_InvalidTransfer')
        .withArgs(this.a, this.b, MAX + 1n, AMOUNT_TOO_HIGH);
      await expect(this.rule[TRANSFERRED_4](this.spender, this.a, this.b, MAX + 1n))
        .to.be.revertedWithCustomError(this.rule, 'MaxAmountRule_InvalidTransfer')
        .withArgs(this.a, this.b, MAX + 1n, AMOUNT_TOO_HIGH);
    });
  });

  describe('supportsInterface', function () {
    it('advertises the IRule interface id and rejects others', async function () {
      expect(await this.rule.supportsInterface(await iRuleInterfaceId())).to.equal(true);
      expect(await this.rule.supportsInterface('0x01ffc9a7')).to.equal(false); // ERC-165 base
      expect(await this.rule.supportsInterface('0xffffffff')).to.equal(false);
    });
  });

  describe('canReturnTransferRestrictionCode', function () {
    it('claims only AMOUNT_TOO_HIGH', async function () {
      expect(await this.rule.canReturnTransferRestrictionCode(AMOUNT_TOO_HIGH)).to.equal(true);
      expect(await this.rule.canReturnTransferRestrictionCode(TRANSFER_OK)).to.equal(false);
      expect(await this.rule.canReturnTransferRestrictionCode(FROM_RESTRICTED)).to.equal(false);
    });
  });

  describe('messageForTransferRestriction', function () {
    it('returns the message for the known code and a fallback otherwise', async function () {
      expect(await this.rule.messageForTransferRestriction(AMOUNT_TOO_HIGH)).to.equal(
        'Amount exceeds maximum',
      );
      expect(await this.rule.messageForTransferRestriction(TRANSFER_OK)).to.equal('Unknown code');
    });
  });
});

describe('RestrictedAddressRule (example rule)', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
    // owner = admin
    this.RuleFactory = await ethers.getContractFactory('RestrictedAddressRule', this.admin);
  });

  it('emits RestrictionUpdated for each address in the initial list at deploy', async function () {
    const rule = await this.RuleFactory.deploy([this.address1.address]);
    await rule.waitForDeployment();
    await expect(rule.deploymentTransaction())
      .to.emit(rule, 'RestrictionUpdated')
      .withArgs(this.address1.address, true);
    expect(await rule.restricted(this.address1.address)).to.equal(true);
  });

  it('emits RestrictionUpdated when setRestricted changes status', async function () {
    const rule = await this.RuleFactory.deploy([]);
    await expect(rule.connect(this.admin).setRestricted(this.address2.address, true))
      .to.emit(rule, 'RestrictionUpdated')
      .withArgs(this.address2.address, true);
    expect(await rule.restricted(this.address2.address)).to.equal(true);

    await expect(rule.connect(this.admin).setRestricted(this.address2.address, false))
      .to.emit(rule, 'RestrictionUpdated')
      .withArgs(this.address2.address, false);
    expect(await rule.restricted(this.address2.address)).to.equal(false);
  });

  it('restricts setRestricted to the owner', async function () {
    const rule = await this.RuleFactory.deploy([]);
    await expect(
      rule.connect(this.address1).setRestricted(this.address2.address, true),
    ).to.be.revertedWithCustomError(rule, 'OnlyOwner');
  });

  it('records the deployer as owner', async function () {
    const rule = await this.RuleFactory.deploy([]);
    expect(await rule.owner()).to.equal(this.admin.address);
  });

  describe('detectTransferRestriction', function () {
    beforeEach(async function () {
      // address1 = restricted sender, address2 = restricted recipient, address3 = clean
      this.rule = await this.RuleFactory.deploy([this.address1.address, this.address2.address]);
    });

    it('returns FROM_RESTRICTED when the sender is restricted (sender takes precedence)', async function () {
      expect(
        await this.rule.detectTransferRestriction(this.address1.address, this.address2.address, 1n),
      ).to.equal(FROM_RESTRICTED);
    });

    it('returns TO_RESTRICTED when only the recipient is restricted', async function () {
      expect(
        await this.rule.detectTransferRestriction(this.address3.address, this.address2.address, 1n),
      ).to.equal(TO_RESTRICTED);
    });

    it('returns TRANSFER_OK when neither party is restricted', async function () {
      expect(
        await this.rule.detectTransferRestriction(this.address3.address, this.admin.address, 1n),
      ).to.equal(TRANSFER_OK);
    });

    it('detectTransferRestrictionFrom delegates (ignores spender)', async function () {
      expect(
        await this.rule.detectTransferRestrictionFrom(
          this.address3.address,
          this.address1.address,
          this.address3.address,
          1n,
        ),
      ).to.equal(FROM_RESTRICTED);
    });
  });

  describe('canTransfer / canTransferFrom', function () {
    beforeEach(async function () {
      this.rule = await this.RuleFactory.deploy([this.address2.address]);
    });

    it('canTransfer is false to a restricted recipient, true otherwise', async function () {
      expect(
        await this.rule.canTransfer(this.address1.address, this.address2.address, 1n),
      ).to.equal(false);
      expect(
        await this.rule.canTransfer(this.address1.address, this.address3.address, 1n),
      ).to.equal(true);
    });

    it('canTransferFrom mirrors canTransfer (ignores spender)', async function () {
      expect(
        await this.rule.canTransferFrom(
          this.address3.address,
          this.address1.address,
          this.address2.address,
          1n,
        ),
      ).to.equal(false);
      expect(
        await this.rule.canTransferFrom(
          this.address3.address,
          this.address1.address,
          this.address3.address,
          1n,
        ),
      ).to.equal(true);
    });
  });

  describe('IRule view helpers', function () {
    beforeEach(async function () {
      this.rule = await this.RuleFactory.deploy([]);
    });

    it('transferred overloads do not revert when neither party is restricted', async function () {
      await expect(this.rule[TRANSFERRED_3](this.address1.address, this.address2.address, 1n)).to
        .not.be.reverted;
      await expect(
        this.rule[TRANSFERRED_4](
          this.address3.address,
          this.address1.address,
          this.address2.address,
          1n,
        ),
      ).to.not.be.reverted;
    });

    it('supportsInterface advertises IRule and rejects others', async function () {
      expect(await this.rule.supportsInterface(await iRuleInterfaceId())).to.equal(true);
      expect(await this.rule.supportsInterface('0x01ffc9a7')).to.equal(false);
      expect(await this.rule.supportsInterface('0xffffffff')).to.equal(false);
    });

    it('canReturnTransferRestrictionCode claims both restriction codes only', async function () {
      expect(await this.rule.canReturnTransferRestrictionCode(FROM_RESTRICTED)).to.equal(true);
      expect(await this.rule.canReturnTransferRestrictionCode(TO_RESTRICTED)).to.equal(true);
      expect(await this.rule.canReturnTransferRestrictionCode(TRANSFER_OK)).to.equal(false);
      expect(await this.rule.canReturnTransferRestrictionCode(AMOUNT_TOO_HIGH)).to.equal(false);
    });

    it('messageForTransferRestriction maps each code, with a fallback', async function () {
      expect(await this.rule.messageForTransferRestriction(FROM_RESTRICTED)).to.equal(
        'Sender is restricted',
      );
      expect(await this.rule.messageForTransferRestriction(TO_RESTRICTED)).to.equal(
        'Recipient is restricted',
      );
      expect(await this.rule.messageForTransferRestriction(TRANSFER_OK)).to.equal('Unknown code');
    });
  });

  describe('transferred (enforcement hook)', function () {
    beforeEach(async function () {
      // address1 = restricted sender, address2 = restricted recipient, address3 = clean
      this.rule = await this.RuleFactory.deploy([this.address1.address, this.address2.address]);
    });

    it('reverts with FROM_RESTRICTED when the sender is restricted', async function () {
      await expect(this.rule[TRANSFERRED_3](this.address1.address, this.address3.address, 1n))
        .to.be.revertedWithCustomError(this.rule, 'RestrictedAddressRule_InvalidTransfer')
        .withArgs(this.address1.address, this.address3.address, 1n, FROM_RESTRICTED);
    });

    it('reverts with TO_RESTRICTED when the recipient is restricted (4-arg overload)', async function () {
      await expect(
        this.rule[TRANSFERRED_4](
          this.address3.address,
          this.address3.address,
          this.address2.address,
          1n,
        ),
      )
        .to.be.revertedWithCustomError(this.rule, 'RestrictedAddressRule_InvalidTransfer')
        .withArgs(this.address3.address, this.address2.address, 1n, TO_RESTRICTED);
    });

    it('does not revert when neither party is restricted', async function () {
      await expect(this.rule[TRANSFERRED_3](this.address3.address, this.admin.address, 1n)).to.not
        .be.reverted;
    });
  });
});
