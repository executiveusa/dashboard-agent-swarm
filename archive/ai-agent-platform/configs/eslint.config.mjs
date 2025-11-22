import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['dist', 'node_modules'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: await import('typescript-eslint').then((m) => m.parser),
      parserOptions: {
        project: false,
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': await import('typescript-eslint').then((m) => m.plugin),
    },
    rules: {
      ...prettier.rules,
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error'
    },
  },
];
