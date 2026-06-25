const { ethers } = require('hardhat');
const { expect } = require('chai');

const PARAM_ACCOUNT = ethers.keccak256(ethers.toUtf8Bytes('account'));
const PARAM_AMOUNT = ethers.keccak256(ethers.toUtf8Bytes('amount'));
const PARAM_FROM = ethers.keccak256(ethers.toUtf8Bytes('from'));
const PARAM_TO = ethers.keccak256(ethers.toUtf8Bytes('to'));
const ZERO = ethers.ZeroAddress;

/**
 * Direct unit tests for MintBurnExtractor.extract(): exercise every supported selector branch and
 * the unsupported-selector revert. Specifically covers `burn(address,uint256)` (0x9dc29fac), the
 * primary BURNER_ROLE operator burn (NM-4) that the extractor previously did not handle.
 */
describe('MintBurnExtractor.extract() (unit)', function () {
  const coder = ethers.AbiCoder.defaultAbiCoder();
  const SENDER = '0x00000000000000000000000000000000000000A1';
  const ACCOUNT = '0x00000000000000000000000000000000000000B2';

  function payload(selector, sender, data) {
    return { selector, sender, data, context: '0x' };
  }

  beforeEach(async function () {
    this.extractor = await ethers.deployContract('MintBurnExtractor');
    this.mintSelector = ethers.id('mint(address,uint256)').slice(0, 10);
    this.burnSelector = ethers.id('burn(address,uint256)').slice(0, 10); // 0x9dc29fac
    this.burnFromSelector = ethers.id('burnFrom(address,uint256)').slice(0, 10);
    this.selfBurnSelector = ethers.id('burn(uint256)').slice(0, 10);
  });

  it('reports version 1.2.0', async function () {
    expect(await this.extractor.typeAndVersion()).to.equal('MintBurnExtractor 1.2.0');
  });

  it('exposes the burn(address,uint256) selector as 0x9dc29fac', function () {
    expect(this.burnSelector).to.equal('0x9dc29fac');
  });

  function assertParams(params, { account, amount, from, to }) {
    expect(params[0].name).to.equal(PARAM_ACCOUNT);
    expect(coder.decode(['address'], params[0].value)[0]).to.equal(ethers.getAddress(account));
    expect(params[1].name).to.equal(PARAM_AMOUNT);
    expect(coder.decode(['uint256'], params[1].value)[0]).to.equal(amount);
    expect(params[2].name).to.equal(PARAM_FROM);
    expect(coder.decode(['address'], params[2].value)[0]).to.equal(ethers.getAddress(from));
    expect(params[3].name).to.equal(PARAM_TO);
    expect(coder.decode(['address'], params[3].value)[0]).to.equal(ethers.getAddress(to));
  }

  it('maps mint(account,amount) to from = 0, to = account', async function () {
    const data = coder.encode(['address', 'uint256'], [ACCOUNT, 100n]);
    const params = await this.extractor.extract(payload(this.mintSelector, SENDER, data));
    assertParams(params, { account: ACCOUNT, amount: 100n, from: ZERO, to: ACCOUNT });
  });

  it('maps burn(account,amount) (0x9dc29fac) to from = account, to = 0 (NM-4)', async function () {
    const data = coder.encode(['address', 'uint256'], [ACCOUNT, 70n]);
    const params = await this.extractor.extract(payload(this.burnSelector, SENDER, data));
    assertParams(params, { account: ACCOUNT, amount: 70n, from: ACCOUNT, to: ZERO });
  });

  it('maps burnFrom(account,amount) to from = account, to = 0', async function () {
    const data = coder.encode(['address', 'uint256'], [ACCOUNT, 50n]);
    const params = await this.extractor.extract(payload(this.burnFromSelector, SENDER, data));
    assertParams(params, { account: ACCOUNT, amount: 50n, from: ACCOUNT, to: ZERO });
  });

  it('maps self-burn(amount) to account = sender, from = sender, to = 0', async function () {
    const data = coder.encode(['uint256'], [25n]);
    const params = await this.extractor.extract(payload(this.selfBurnSelector, SENDER, data));
    assertParams(params, { account: SENDER, amount: 25n, from: SENDER, to: ZERO });
  });

  it('reverts UnsupportedSelector for an unknown selector', async function () {
    const data = coder.encode(['address', 'uint256'], [ACCOUNT, 1n]);
    await expect(this.extractor.extract(payload('0xdeadbeef', SENDER, data))).to.be.reverted;
  });
});
