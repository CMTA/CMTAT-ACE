const { expect } = require('chai');
const { ethers } = require('hardhat');
const { DEPLOYMENT_DECIMAL, CROSS_CHAIN_ROLE } = require('../../deploymentUtils');

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

    it('testSupportsInterfaceForCrossChainAndPolicyProtected', async function () {
      const iPolicyProtected = new ethers.Interface([
        'function attachPolicyEngine(address policyEngine)',
        'function getPolicyEngine() view returns (address)',
        'function setContext(bytes context)',
        'function getContext() view returns (bytes)',
        'function clearContext()',
      ]);
      const ierc7802 = new ethers.Interface([
        'function crosschainMint(address to, uint256 value)',
        'function crosschainBurn(address from, uint256 value)',
      ]);
      const interfaceId = (iface, names) => {
        const value =
          names
            .map((name) => BigInt(iface.getFunction(name).selector))
            .reduce((acc, selector) => acc ^ selector, 0n) & 0xffffffffn;
        return `0x${value.toString(16).padStart(8, '0')}`;
      };

      const policyProtectedId = interfaceId(iPolicyProtected, [
        'attachPolicyEngine',
        'getPolicyEngine',
        'setContext',
        'getContext',
        'clearContext',
      ]);
      const ierc7802Id = interfaceId(ierc7802, ['crosschainMint', 'crosschainBurn']);

      expect(await this.cmtat.supportsInterface(ierc7802Id)).to.equal(true);
      expect(await this.cmtat.supportsInterface(policyProtectedId)).to.equal(true);
      expect(await this.cmtat.supportsInterface('0xffffffff')).to.equal(false);
    });

    it('testCrosschainMintExecutesMinterTransferOverride', async function () {
      await this.rbacPolicy.connect(this.admin).grantRole(CROSS_CHAIN_ROLE, this.admin.address);
      await this.cmtat.connect(this.admin).crosschainMint(this.address1, 25n);
      expect(await this.cmtat.balanceOf(this.address1)).to.equal(25n);
      expect(await this.cmtat.totalSupply()).to.equal(25n);
    });
  });
}

module.exports = DeploymentCommon;
