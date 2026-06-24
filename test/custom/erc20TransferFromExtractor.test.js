const { ethers } = require('hardhat');
const { expect } = require('chai');

const PARAM_SPENDER = ethers.keccak256(ethers.toUtf8Bytes('spender'));
const PARAM_FROM = ethers.keccak256(ethers.toUtf8Bytes('from'));
const PARAM_TO = ethers.keccak256(ethers.toUtf8Bytes('to'));
const PARAM_AMOUNT = ethers.keccak256(ethers.toUtf8Bytes('amount'));

/**
 * Direct unit tests for ERC20TransferFromExtractor.extract(): exercise both selector branches
 * (transfer / transferFrom) and the unsupported-selector revert, which the policy/transfer
 * integration tests do not reach.
 */
describe('ERC20TransferFromExtractor.extract() (unit)', function () {
  const coder = ethers.AbiCoder.defaultAbiCoder();
  const SENDER = '0x00000000000000000000000000000000000000A1';
  const FROM = '0x00000000000000000000000000000000000000B2';
  const TO = '0x00000000000000000000000000000000000000C3';

  function payload(selector, sender, data) {
    return { selector, sender, data, context: '0x' };
  }

  beforeEach(async function () {
    this.extractor = await ethers.deployContract('ERC20TransferFromExtractor');
    this.transferSelector = ethers.id('transfer(address,uint256)').slice(0, 10);
    this.transferFromSelector = ethers.id('transferFrom(address,address,uint256)').slice(0, 10);
  });

  it('maps transfer to [spender = sender, from = sender, to, amount]', async function () {
    const data = coder.encode(['address', 'uint256'], [TO, 100n]);
    const params = await this.extractor.extract(payload(this.transferSelector, SENDER, data));

    expect(params[0].name).to.equal(PARAM_SPENDER);
    expect(coder.decode(['address'], params[0].value)[0]).to.equal(ethers.getAddress(SENDER));
    expect(params[1].name).to.equal(PARAM_FROM);
    expect(coder.decode(['address'], params[1].value)[0]).to.equal(ethers.getAddress(SENDER));
    expect(params[2].name).to.equal(PARAM_TO);
    expect(coder.decode(['address'], params[2].value)[0]).to.equal(ethers.getAddress(TO));
    expect(params[3].name).to.equal(PARAM_AMOUNT);
    expect(coder.decode(['uint256'], params[3].value)[0]).to.equal(100n);
  });

  it('maps transferFrom to [spender = sender, from, to, amount]', async function () {
    const data = coder.encode(['address', 'address', 'uint256'], [FROM, TO, 50n]);
    const params = await this.extractor.extract(payload(this.transferFromSelector, SENDER, data));

    expect(coder.decode(['address'], params[0].value)[0]).to.equal(ethers.getAddress(SENDER));
    expect(coder.decode(['address'], params[1].value)[0]).to.equal(ethers.getAddress(FROM));
    expect(coder.decode(['address'], params[2].value)[0]).to.equal(ethers.getAddress(TO));
    expect(coder.decode(['uint256'], params[3].value)[0]).to.equal(50n);
  });

  it('reverts UnsupportedSelector for an unknown selector', async function () {
    const data = coder.encode(['address', 'uint256'], [TO, 1n]);
    const badSelector = ethers.id('foo(uint256)').slice(0, 10);
    await expect(this.extractor.extract(payload(badSelector, SENDER, data)))
      .to.be.revertedWithCustomError(this.extractor, 'UnsupportedSelector')
      .withArgs(badSelector);
  });
});
