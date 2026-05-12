const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('PolicyProtectedUpgradeable', function () {
  const iPolicyProtected = new ethers.Interface([
    'function attachPolicyEngine(address policyEngine)',
    'function getPolicyEngine() view returns (address)',
    'function setContext(bytes context)',
    'function getContext() view returns (bytes)',
    'function clearContext()',
  ]);

  const toErrorStringData = (reason) =>
    ethers.concat([
      '0x08c379a0',
      ethers.AbiCoder.defaultAbiCoder().encode(['string'], [reason]),
    ]);

  const iPolicyProtectedInterfaceId = (() => {
    const selectors = [
      iPolicyProtected.getFunction('attachPolicyEngine').selector,
      iPolicyProtected.getFunction('getPolicyEngine').selector,
      iPolicyProtected.getFunction('setContext').selector,
      iPolicyProtected.getFunction('getContext').selector,
      iPolicyProtected.getFunction('clearContext').selector,
    ].map((selector) => BigInt(selector));
    const interfaceId = selectors.reduce((acc, selector) => acc ^ selector, 0n) & 0xffffffffn;
    return `0x${interfaceId.toString(16).padStart(8, '0')}`;
  })();

  async function deployInitializedHarness() {
    const engine = await ethers.deployContract('MockPolicyEngine');
    const harness = await ethers.deployContract('PolicyProtectedUpgradeableHarness');
    await harness.initialize(await engine.getAddress());
    return { engine, harness };
  }

  describe('initialization and attach flow', function () {
    it('initializes through __PolicyProtected_init and attaches engine', async function () {
      const engine = await ethers.deployContract('MockPolicyEngine');
      const harness = await ethers.deployContract('PolicyProtectedUpgradeableHarness');

      await expect(harness.initialize(await engine.getAddress()))
        .to.emit(harness, 'PolicyEngineAttached')
        .withArgs(await engine.getAddress());

      expect(await harness.getPolicyEngine()).to.equal(await engine.getAddress());
      expect(await engine.attachCalls()).to.equal(1n);
    });

    it('reverts initialize with zero policy engine', async function () {
      const harness = await ethers.deployContract('PolicyProtectedUpgradeableHarness');
      await expect(harness.initialize(ethers.ZeroAddress)).to.be.revertedWith('Policy engine is zero address');
    });

    it('detaches previous engine on attach and emits detach failed if detach reverts', async function () {
      const oldEngine = await ethers.deployContract('MockPolicyEngine');
      const newEngine = await ethers.deployContract('MockPolicyEngine');
      const harness = await ethers.deployContract('PolicyProtectedUpgradeableHarness');
      await harness.initialize(await oldEngine.getAddress());

      await oldEngine.setDetachShouldRevert(true);

      await expect(harness.attachPolicyEngine(await newEngine.getAddress()))
        .to.emit(harness, 'PolicyEngineDetachFailed')
        .withArgs(
          await oldEngine.getAddress(),
          toErrorStringData('MockPolicyEngine: detach failed'),
        );

      expect(await harness.getPolicyEngine()).to.equal(await newEngine.getAddress());
      expect(await newEngine.attachCalls()).to.equal(1n);
    });
  });

  describe('policy execution and context', function () {
    it('reverts runPolicy when engine is undefined', async function () {
      const harness = await ethers.deployContract('PolicyProtectedUpgradeableHarness');

      await expect(harness.guardedRun()).to.be.reverted;
      await expect(harness.guardedRunWithContext('0x1234')).to.be.reverted;
    });

    it('stores, reads and clears sender context through runPolicy cleanup', async function () {
      const { engine, harness } = await deployInitializedHarness();
      const context = '0x123456';

      await harness.setContext(context);
      expect(await harness.getContext()).to.equal(context);

      await harness.guardedRun();

      const payload = await engine.lastPayload();
      expect(payload.context).to.equal(context);
      expect(await harness.getContext()).to.equal('0x');
      expect(await harness.counter()).to.equal(1n);
    });

    it('does not clear context when guarded function reverts', async function () {
      const harness = await ethers.deployContract('PolicyProtectedUpgradeableHarness');
      const engine = await ethers.deployContract('MockPolicyEngine');
      await harness.initialize(await engine.getAddress());

      await harness.setContext('0xabcd');
      await expect(harness.guardedRunAndRevert()).to.be.revertedWithCustomError(harness, 'ForcedRevert');
      expect(await harness.getContext()).to.equal('0xabcd');

      await harness.clearContext();
      expect(await harness.getContext()).to.equal('0x');
    });

    it('passes explicit context through runPolicyWithContext', async function () {
      const { engine, harness } = await deployInitializedHarness();
      const runContext = '0xdeadbeef';

      await harness.guardedRunWithContext(runContext);

      const payload = await engine.lastPayload();
      expect(payload.context).to.equal(runContext);
      expect(await harness.counter()).to.equal(1n);
    });
  });

  describe('ERC165', function () {
    it('supports IPolicyProtected and rejects unknown interface', async function () {
      const { harness } = await deployInitializedHarness();
      expect(await harness.supportsInterface(iPolicyProtectedInterfaceId)).to.equal(true);
      expect(await harness.supportsInterface('0xffffffff')).to.equal(false);
    });
  });
});
