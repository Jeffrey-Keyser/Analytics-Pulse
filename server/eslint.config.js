// ESLint v9 configuration for TypeScript
// Note: Requires @typescript-eslint/parser and @typescript-eslint/eslint-plugin
// Install with: npm install --save-dev @typescript-eslint/parser@^8.0.0 @typescript-eslint/eslint-plugin@^8.0.0

const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'writable',
        // ES2020 globals
        globalThis: 'readonly',
        BigInt: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Recommended TypeScript rules
      ...tsPlugin.configs.recommended.rules,

      // Custom overrides
      'no-console': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '*.js', // Ignore JS files in root (like this config)
      'coverage/**',
      'jest.config.js',
    ],
  },
];
