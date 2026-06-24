const fs = require('fs');
const path = require('path');

module.exports = {
  istanbulFolder: 'doc/coverage',
  skipFiles: ['modules/chainlink-ace/mocks/PolicyProtectedUpgradeableMocks.sol'],
  onIstanbulComplete: async function () {
    const rootCoverageJson = path.join(process.cwd(), 'coverage.json');
    if (fs.existsSync(rootCoverageJson)) {
      fs.unlinkSync(rootCoverageJson);
    }
  },
};
