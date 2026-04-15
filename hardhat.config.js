require('@nomicfoundation/hardhat-foundry');
require('@nomicfoundation/hardhat-chai-matchers');
require('@openzeppelin/hardhat-upgrades');

const { silenceWarnings } = require('@openzeppelin/upgrades-core');
silenceWarnings();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.30',
        settings: {
          optimizer: {
            enabled: true,
            runs: 50,
          },
          evmVersion: 'prague',
        },
      },
      {
        version: '0.8.26',
        settings: {
          optimizer: {
            enabled: true,
            runs: 50,
          },
          evmVersion: 'cancun',
        },
      },
    ],
  },
  paths: {
    sources: './contracts',
    tests: './test',
  },
};
