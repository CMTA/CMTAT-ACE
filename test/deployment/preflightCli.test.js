const { expect } = require('chai');
const { ethers } = require('hardhat');
const {
  loadFixture,
  deployCCTStandalone,
  deployCCTLiteStandalone,
  deployPolicyEngine,
  createStandardFixture,
} = require('../deploymentUtils');
const preflight = require('../../scripts/preflight');

/**
 * Exercises the CLI entry point `main()` of scripts/preflight.js end-to-end (env-var parsing,
 * getContractAt, report rendering, exit code) in-process against deployed contracts — no
 * subprocess or separate node required, since main() uses the same hardhat ethers runtime.
 */
const standardFixture = createStandardFixture(deployCCTStandalone);

/** Run preflight `main()` with a given env, capturing console output and the returned exit code. */
async function runCli(env) {
  const KEYS = ['POLICY_ENGINE', 'TOKEN', 'TOKEN_CONTRACT'];
  const saved = {};
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  Object.assign(process.env, env);

  const lines = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...a) => lines.push(a.join(' '));
  console.error = (...a) => lines.push(a.join(' '));
  const prevExit = process.exitCode;

  let code;
  try {
    code = await preflight.main();
  } finally {
    console.log = origLog;
    console.error = origErr;
    process.exitCode = prevExit;
    for (const k of KEYS) {
      delete process.env[k];
      if (saved[k] !== undefined) process.env[k] = saved[k];
    }
  }
  return { code, out: lines.join('\n') };
}

describe('Preflight CLI (main)', function () {
  it('exits 1 and prints usage when env vars are missing', async function () {
    const { code, out } = await runCli({});
    expect(code).to.equal(1);
    expect(out).to.match(/Usage:/);
  });

  it('exits 0 and prints OK for a healthy deployment', async function () {
    const { cmtat, policyEngine } = await loadFixture(standardFixture);
    const { code, out } = await runCli({
      POLICY_ENGINE: await policyEngine.getAddress(),
      TOKEN: await cmtat.getAddress(),
      TOKEN_CONTRACT: 'ComplianceTokenCMTATStandalone',
    });
    expect(code).to.equal(0);
    expect(out).to.match(/Result:.*OK/);
  });

  it('exits 1 and prints the defaultAllow error for a bricked deployment', async function () {
    const [, admin] = await ethers.getSigners();
    const policyEngine = await deployPolicyEngine(false, admin.address);
    const cmtat = await deployCCTStandalone(admin.address, await policyEngine.getAddress());
    const { code, out } = await runCli({
      POLICY_ENGINE: await policyEngine.getAddress(),
      TOKEN: await cmtat.getAddress(),
    });
    expect(code).to.equal(1);
    expect(out).to.match(/defaultAllow is FALSE/i);
    expect(out).to.match(/Result:.*FAIL/);
  });

  it('honors TOKEN_CONTRACT to read a Lite deployment', async function () {
    const [, admin] = await ethers.getSigners();
    const policyEngine = await deployPolicyEngine(true, admin.address);
    const cmtat = await deployCCTLiteStandalone(admin.address, await policyEngine.getAddress());
    const { code, out } = await runCli({
      POLICY_ENGINE: await policyEngine.getAddress(),
      TOKEN: await cmtat.getAddress(),
      TOKEN_CONTRACT: 'ComplianceTokenCMTATLiteStandalone',
    });
    expect(code).to.equal(0);
    expect(out).to.match(/\(lite\)/);
  });
});
