const { expect } = require('chai');
const { deployPolicyEngine } = require('../../deploymentUtils');

/**
 * Tests PolicyEngine management on standard (Ownable-based) contracts.
 *
 * Required `this` context:
 *   this.cmtat              – compliance token instance
 *   this.admin              – owner signer
 *   this.attacker           – unauthorized signer
 *   this.policyEngine       – PolicyEngine instance
 *   this.cmtatAddress       – deployed token address
 *   this.mintSelector       – bytes4 selector for mint(address,uint256)
 *   this.pausePolicyAddress – PausePolicy address
 *   this.rbacPolicyAddress  – RBACPolicy address
 */
function PolicyEngineCommon() {
  context('PolicyEngine Management', function () {
    it('testOwnerCanAttachNewPolicyEngine', async function () {
      const newPolicyEngine = await deployPolicyEngine(true, this.admin.address);
      const newAddr = await newPolicyEngine.getAddress();
      await this.cmtat.connect(this.admin).attachPolicyEngine(newAddr);
      expect(await this.cmtat.getPolicyEngine()).to.equal(newAddr);
    });

    it('testNonOwnerCannotAttachPolicyEngine', async function () {
      const newPolicyEngine = await deployPolicyEngine(true, this.attacker.address);
      const newAddr = await newPolicyEngine.getAddress();
      await expect(
        this.cmtat.connect(this.attacker).attachPolicyEngine(newAddr),
      ).to.be.revertedWithCustomError(this.cmtat, 'OwnableUnauthorizedAccount');
    });

    it('testListPoliciesForSelector', async function () {
      const policies = await this.policyEngine.getPolicies(this.cmtatAddress, this.mintSelector);
      expect(policies.length).to.equal(2);
      expect(policies[0]).to.equal(this.pausePolicyAddress);
      expect(policies[1]).to.equal(this.rbacPolicyAddress);
    });

    it('testRemovePolicy', async function () {
      await this.policyEngine
        .connect(this.admin)
        .removePolicy(this.cmtatAddress, this.mintSelector, this.pausePolicyAddress);
      const policies = await this.policyEngine.getPolicies(this.cmtatAddress, this.mintSelector);
      expect(policies.length).to.equal(1);
    });
  });
}

module.exports = PolicyEngineCommon;
