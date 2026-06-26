require('@nomicfoundation/hardhat-foundry');
require('@nomicfoundation/hardhat-chai-matchers');
require('@openzeppelin/hardhat-upgrades');
require('hardhat-dependency-compiler');
require('solidity-coverage');

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
  dependencyCompiler: {
    paths: [
      '@chainlink/contracts/src/v0.8/tests/MockV3Aggregator.sol',
      '@chainlink/policy-management/core/PolicyEngine.sol',
      '@chainlink/policy-management/policies/PausePolicy.sol',
      '@chainlink/policy-management/policies/RoleBasedAccessControlPolicy.sol',
      '@chainlink/policy-management/policies/SecureMintPolicy.sol',
      '@chainlink/policy-management/policies/VolumePolicy.sol',
      '@chainlink/policy-management/policies/MaxPolicy.sol',
      '@chainlink/policy-management/policies/VolumeRatePolicy.sol',
      '@chainlink/policy-management/policies/OnlyOwnerPolicy.sol',
      '@chainlink/policy-management/policies/OnlyAuthorizedSenderPolicy.sol',
      '@chainlink/policy-management/policies/RejectPolicy.sol',
      '@chainlink/policy-management/policies/IntervalPolicy.sol',
      '@chainlink/policy-management/extractors/ERC20TransferExtractor.sol',
      'CMTAT/mocks/SnapshotEngineMock.sol',
      'CMTAT/mocks/DocumentEngineMock.sol',
    ],
  },
};
