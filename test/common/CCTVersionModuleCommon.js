const { expect } = require('chai');

// Mirrors CMTAT's VersionModuleCommon but asserts the CMTAT-ACE integration release version
// (CCTVersionModule overrides CMTAT's VersionModule).
function CCTVersionModuleCommon() {
  context('Token structure', function () {
    it('testHasTheDefinedVersion', async function () {
      expect(await this.cmtat.version()).to.equal('0.3.0');
    });
  });
}

module.exports = CCTVersionModuleCommon;
