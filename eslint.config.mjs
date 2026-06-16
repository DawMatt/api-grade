import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'packages/*/src/**/*.ts', 'packages/*/src/**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    files: ['**/tests/**/*.ts', '**/tests/**/*.tsx'],
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      '@typescript-eslint/no-unsafe-function-type': 'off',
    },
  },
  {
    ignores: [
      'dist/**',
      'packages/*/dist/**',
      'node_modules/**',
      'coverage/**',
      'packages/*/coverage/**',
      'scripts/**',
      '**/*.config.ts',
      '**/*.config.mjs',
    ],
  },
);
