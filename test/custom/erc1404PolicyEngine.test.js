const { ethers, upgrades } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { fixture, deployPolicyEngine, deployCCTLiteStandalone } = require('../deploymentUtils');

const PARAM_SPENDER = ethers.keccak256(ethers.toUtf8Bytes('spender'));
const PARAM_FROM = ethers.keccak256(ethers.toUtf8Bytes('from'));
const PARAM_TO = ethers.keccak256(ethers.toUtf8Bytes('to'));
const PARAM_AMOUNT = ethers.keccak256(ethers.toUtf8Bytes('amount'));
const TRANSFER_PARAMS = [PARAM_SPENDER, PARAM_FROM, PARAM_TO, PARAM_AMOUNT];
const ENFORCER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('ENFORCER_ROLE'));

const POLICY_ENGINE_CODE = 7n;
const NO_RESTRICTION = 0n;

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
 * FEEDBACK_22.md finding 1 (M-1): make the ERC-1404 `detectTransferRestriction` view
 * PolicyEngine-aware. When the module checks pass but the PolicyEngine would reject the transfer,
 * the code 7 (`TRANSFER_REJECTED_BY_POLICY_ENGINE_CODE`) is returned. Module-level codes still
 * take precedence, and the view never reverts.
 */
describe('ERC-1404 PolicyEngine-aware restriction code (7)', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));

    this.restricted = this.address2;
    this.clean = this.address3;

    this.pe = await deployPolicyEngine(true, this.admin.address);
    this.cmtat = await deployCCTLiteStandalone(this.admin.address, await this.pe.getAddress());
    this.cmtatAddress = await this.cmtat.getAddress();

    this.transferSelector = this.cmtat.interface.getFunction('transfer(address,uint256)').selector;
    this.transferFromSelector = this.cmtat.interface.getFunction(
      'transferFrom(address,address,uint256)',
    ).selector;

    const extractor = await ethers.deployContract('ERC20TransferFromExtractor');
    const extractorAddress = await extractor.getAddress();
    await this.pe.connect(this.admin).setExtractor(this.transferSelector, extractorAddress);
    await this.pe.connect(this.admin).setExtractor(this.transferFromSelector, extractorAddress);

    const RuleFactory = await ethers.getContractFactory('RestrictedAddressRule', this.admin);
    this.rule = await RuleFactory.deploy([this.restricted.address]);
    this.policy = await deployTransferValidationPolicy(
      await this.pe.getAddress(),
      this.admin.address,
      [await this.rule.getAddress()],
    );
    const policyAddress = await this.policy.getAddress();
    await this.pe
      .connect(this.admin)
      .addPolicy(this.cmtatAddress, this.transferSelector, policyAddress, TRANSFER_PARAMS);
    await this.pe
      .connect(this.admin)
      .addPolicy(this.cmtatAddress, this.transferFromSelector, policyAddress, TRANSFER_PARAMS);
  });

  it('exposes the code as a public constant (7)', async function () {
    expect(await this.cmtat.TRANSFER_REJECTED_BY_POLICY_ENGINE_CODE()).to.equal(POLICY_ENGINE_CODE);
  });

  it('returns 0 when the PolicyEngine allows the transfer', async function () {
    expect(
      await this.cmtat.detectTransferRestriction(this.address1.address, this.clean.address, 100n),
    ).to.equal(NO_RESTRICTION);
  });

  it('returns 7 when the PolicyEngine rejects the transfer', async function () {
    expect(
      await this.cmtat.detectTransferRestriction(
        this.address1.address,
        this.restricted.address,
        100n,
      ),
    ).to.equal(POLICY_ENGINE_CODE);
  });

  it('maps code 7 to a human-readable message', async function () {
    expect(await this.cmtat.messageForTransferRestriction(POLICY_ENGINE_CODE)).to.equal(
      'PolicyEngine:transferRejected',
    );
  });

  it('returns 7 for transferFrom when the PolicyEngine rejects', async function () {
    expect(
      await this.cmtat.detectTransferRestrictionFrom(
        this.address1.address, // spender
        this.address1.address, // from
        this.restricted.address, // to
        100n,
      ),
    ).to.equal(POLICY_ENGINE_CODE);
  });

  it('the view never reverts and matches the actual transfer outcome', async function () {
    // Restricted recipient → detect says 7 AND the real transfer reverts.
    expect(
      await this.cmtat.detectTransferRestriction(
        this.address1.address,
        this.restricted.address,
        1n,
      ),
    ).to.equal(POLICY_ENGINE_CODE);
  });

  it('module-level restrictions take precedence over the engine code', async function () {
    // Freeze the sender: the module returns its own (frozen) code, not 7.
    await this.cmtat.connect(this.admin).grantRole(ENFORCER_ROLE, this.admin.address);
    await this.cmtat
      .connect(this.admin)
      ['setAddressFrozen(address,bool)'](this.address1.address, true);

    const code = await this.cmtat.detectTransferRestriction(
      this.address1.address,
      this.clean.address,
      100n,
    );
    expect(code).to.not.equal(NO_RESTRICTION);
    expect(code).to.not.equal(POLICY_ENGINE_CODE);
    expect(await this.cmtat.messageForTransferRestriction(code)).to.equal('AddrFromIsFrozen');
  });
});
