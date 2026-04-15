const { expect } = require('chai');
const { DEPLOYMENT_DECIMAL } = require('../../deploymentUtils');

/**
 * Basic deployment tests for standard (PolicyEngine-based) contracts.
 *
 * Required `this` context:
 *   this.cmtat              – compliance token instance
 *   this.admin              – owner signer
 *   this.address1           – test address
 *   this.policyEngineAddress – PolicyEngine address
 */
function DeploymentCommon() {
  context('Deployment', function () {
    it('testHasCorrectName', async function () {
      expect(await this.cmtat.name()).to.equal('CMTA Token');
    });

    it('testHasCorrectSymbol', async function () {
      expect(await this.cmtat.symbol()).to.equal('CMTAT');
    });

    it('testHasCorrectDecimals', async function () {
      expect(await this.cmtat.decimals()).to.equal(DEPLOYMENT_DECIMAL);
    });

    it('testHasPolicyEngineAttached', async function () {
      expect(await this.cmtat.getPolicyEngine()).to.equal(this.policyEngineAddress);
    });

    it('testHasCorrectOwner', async function () {
      expect(await this.cmtat.owner()).to.equal(this.admin.address);
    });

    it('testHasZeroTotalSupply', async function () {
      expect(await this.cmtat.totalSupply()).to.equal(0n);
    });

    it('testAllowMintWithPolicies', async function () {
      await this.cmtat.connect(this.admin).mint(this.address1, 100n);
      expect(await this.cmtat.balanceOf(this.address1)).to.equal(100n);
    });
  });
}

module.exports = DeploymentCommon;
