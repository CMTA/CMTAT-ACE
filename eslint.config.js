const js = require('@eslint/js');
const prettier = require('eslint-config-prettier');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'submodules/**',
      'artifacts/**',
      'cache_hardhat/**',
      'typechain-types/**',
      'cct/**',
      'doc/**',
    ],
  },
  js.configs.recommended,
  prettier,
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        before: 'readonly',
        after: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        context: 'readonly',
      },
    },
  },
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        console: 'readonly',
        ethers: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
