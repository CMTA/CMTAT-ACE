const { ethers, upgrades } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
const { fixture, deployPolicyEngine, deployCCTLiteStandalone } = require('../deploymentUtils');

const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));

/**
 * Integration test for the Chainlink ACE `OnlyOwnerPolicy`: restricts a protected function to the
 * policy's own owner, independent of (and layered on top of) CMTAT roles.
 *
 * Use case demonstrated: gate `mint` so that even an account holding `MINTER_ROLE` cannot mint
 * unless it is also the policy owner — e.g. funnel all issuance through a single governance key.
 */
describe('OnlyOwnerPolicy integration', function () {
  async function deployOnlyOwnerPolicy(policyEngineAddress, owner) {
    const Factory = await ethers.getContractFactory('OnlyOwnerPolicy');
    return upgrades.deployProxy(Factory, [policyEngineAddress, owner, '0x'], {
      initializer: 'initialize',
      unsafeAllow: ['constructor', 'missing-initializer', 'missing-initializer-call'],
      silenceWarnings: true,
    });
  }

  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));

    this.policyEngine = await deployPolicyEngine(true, this.admin.address);
    this.policyEngineAddress = await this.policyEngine.getAddress();
    this.cmtat = await deployCCTLiteStandalone(this.admin.address, this.policyEngineAddress);
    this.cmtatAddress = await this.cmtat.getAddress();

    // Both admin (policy owner) and address1 hold MINTER_ROLE.
    await this.cmtat.connect(this.admin).grantRole(MINTER_ROLE, this.admin.address);
    await this.cmtat.connect(this.admin).grantRole(MINTER_ROLE, this.address1.address);

    this.mintSelector = this.cmtat.interface.getFunction('mint(address,uint256)').selector;

    // OnlyOwnerPolicy takes no parameters → no extractor, empty param-name list.
    this.policy = await deployOnlyOwnerPolicy(this.policyEngineAddress, this.admin.address);
    await this.policyEngine
      .connect(this.admin)
      .addPolicy(this.cmtatAddress, this.mintSelector, await this.policy.getAddress(), []);
  });

  it('allows the policy owner to call the gated function', async function () {
    await expect(this.cmtat.connect(this.admin).mint(this.address2.address, 100n)).to.not.be
      .reverted;
    expect(await this.cmtat.balanceOf(this.address2.address)).to.equal(100n);
  });

  it('rejects a non-owner caller even when it holds the role', async function () {
    await expect(this.cmtat.connect(this.address1).mint(this.address2.address, 100n))
      .to.be.revertedWithCustomError(this.policyEngine, 'PolicyRunRejected')
      .withArgs(await this.policy.getAddress(), 'caller is not the policy owner', anyValue);
  });
});
