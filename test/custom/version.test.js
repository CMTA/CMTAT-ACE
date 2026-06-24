const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const {
  fixture,
  deployPolicyEngine,
  deployCCTStandalone,
  deployCCTLiteStandalone,
} = require('../deploymentUtils');

const CCT_VERSION = '0.2.0';

/**
 * CCTVersionModule overrides CMTAT's VersionModule so `version()` reports the CMTAT-ACE integration
 * release rather than the underlying CMTAT framework version.
 */
describe('CCTVersionModule version()', function () {
  it('Standard reports the CMTAT-ACE integration version', async function () {
    const { admin } = await loadFixture(fixture);
    const pe = await deployPolicyEngine(true, admin.address);
    const cmtat = await deployCCTStandalone(admin.address, await pe.getAddress());
    expect(await cmtat.version()).to.equal(CCT_VERSION);
  });

  it('Lite reports the CMTAT-ACE integration version', async function () {
    const { admin } = await loadFixture(fixture);
    const pe = await deployPolicyEngine(true, admin.address);
    const cmtat = await deployCCTLiteStandalone(admin.address, await pe.getAddress());
    expect(await cmtat.version()).to.equal(CCT_VERSION);
  });
});
