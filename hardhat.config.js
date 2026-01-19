require('@openzeppelin/hardhat-upgrades')

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.30',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          },
          evmVersion: 'prague'
        }
      },
      {
        version: '0.8.26',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          },
          evmVersion: 'cancun'
        }
      }
    ]
  },
  paths: {
    sources: "./contracts",
    tests: "./test"
  },
};
