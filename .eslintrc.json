export default [
  {
    ignores: ['node_modules/**', 'logs/**', 'sessions/**', 'Outputs/**', 'Backup/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'prefer-const': 'warn',
      'no-var': 'error',
      'eqeqeq': ['warn', 'always'],
      'curly': 'warn',
      'brace-style': ['warn', '1tbs'],
      'no-debugger': 'warn',
      'semi': ['warn', 'always'],
    },
  },
];
