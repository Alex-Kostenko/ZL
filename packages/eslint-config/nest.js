import globals from 'globals';
import base from './base.js';

/** NestJS: Node globals; type-only imports would break DI metadata, so the rule is relaxed. */
export default [
  ...base,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
];
