import eslint from '@eslint/js';
import astro from 'eslint-plugin-astro';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '.astro/**',
      'dist*/**',
      'public/generated/**',
      'src/generated/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs['flat/recommended'],
  ...svelte.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        FocusEvent: 'readonly',
        HTMLElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLDialogElement: 'readonly',
        HTMLImageElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLLIElement: 'readonly',
        KeyboardEvent: 'readonly',
        Node: 'readonly',
        NodeListOf: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        clearTimeout: 'readonly',
        document: 'readonly',
        history: 'readonly',
        location: 'readonly',
        process: 'readonly',
        requestAnimationFrame: 'readonly',
        setTimeout: 'readonly',
        window: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.svelte'],
      },
    },
  },
);
