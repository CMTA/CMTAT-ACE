const { expect } = require('chai');

const ZERO_ADDRESS = ethers.ZeroAddress;

function SnapshotModuleCommon() {
  context('Snapshot Engine Module', function () {
    it('testCanSetSnapshotEngine', async function () {
      const snapshotEngineMock = await ethers.deployContract('SnapshotEngineMock', [
        ZERO_ADDRESS,
        this.admin,
      ]);
      this.logs = await this.cmtat.connect(this.admin).setSnapshotEngine(snapshotEngineMock.target);
      await expect(this.logs)
        .to.emit(this.cmtat, 'SnapshotEngine')
        .withArgs(snapshotEngineMock.target);
      expect(await this.cmtat.snapshotEngine()).to.equal(snapshotEngineMock.target);
    });

    it('testCannotSetSnapshotEngineWithSameValue', async function () {
      const snapshotEngineCurrent = await this.cmtat.snapshotEngine();
      await expect(
        this.cmtat.connect(this.admin).setSnapshotEngine(snapshotEngineCurrent),
      ).to.be.revertedWithCustomError(this.cmtat, 'CMTAT_SnapshotModule_SameValue');
    });

    it('testSnapshotEngineIsZeroByDefault', async function () {
      expect(await this.cmtat.snapshotEngine()).to.equal(ZERO_ADDRESS);
    });
  });
}

module.exports = SnapshotModuleCommon;
