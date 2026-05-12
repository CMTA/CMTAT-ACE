const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('ValidationModulePolicyEngine coverage branches', function () {
  beforeEach(async function () {
    [this.deployer, this.address1, this.address2, this.address3] = await ethers.getSigners();
  });

  it('returns true in _tryCheckPolicies when no policy engine is attached', async function () {
    const harness = await ethers.deployContract('ValidationModulePolicyEngineHarness');

    const ok = await harness.exposedTryCheckPolicies(
      '0xa9059cbb',
      this.address1.address,
      ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [this.address2.address, 1n]),
    );

    expect(ok).to.equal(true);
  });

  it('returns true in _transferred when no policy engine is attached', async function () {
    const harness = await ethers.deployContract('ValidationModulePolicyEngineHarness');

    const ok = await harness.exposedTransferred.staticCall(
      this.address1.address,
      this.address2.address,
      this.address3.address,
      0n,
    );

    expect(ok).to.equal(true);
  });

  it('clears non-empty context after _transferred when policy engine is attached', async function () {
    const engine = await ethers.deployContract('MockPolicyEngine');
    const harness = await ethers.deployContract('ValidationModulePolicyEngineHarness');
    await harness.initializeWithPolicyEngine(await engine.getAddress());

    await harness.setContext('0x1234');
    expect(await harness.getContext()).to.equal('0x1234');

    const ok = await harness.exposedTransferred.staticCall(
      this.address1.address,
      this.address2.address,
      this.address3.address,
      0n,
    );

    expect(ok).to.equal(true);

    await harness.exposedTransferred(
      this.address1.address,
      this.address2.address,
      this.address3.address,
      0n,
    );

    expect(await harness.getContext()).to.equal('0x');

    const payload = await engine.lastPayload();
    expect(payload.context).to.equal('0x1234');
  });
});
