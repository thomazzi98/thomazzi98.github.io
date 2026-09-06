import eslintJs from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import astroPlugin from 'eslint-plugin-astro';
import { defineConfig, globalIgnores } from 'eslint/config';
import typescriptEslint from 'typescript-eslint';

const abbreviatedIdentifiers = [
  'acc',
  'arr',
  'buf',
  'cb',
  'cfg',
  'ctx',
  'el',
  'elem',
  'err',
  'evt',
  'fn',
  'idx',
  'len',
  'msg',
  'num',
  'obj',
  'opts',
  'pos',
  'prev',
  'req',
  'res',
  'ret',
  'str',
  'tmp',
  'val',
];

export default defineConfig([
  globalIgnores(['dist/', '.astro/', 'node_modules/']),
  eslintJs.configs.recommended,
  typescriptEslint.configs.strictTypeChecked,
  typescriptEslint.configs.stylisticTypeChecked,
  astroPlugin.configs['flat/recommended'],
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      'no-else-return': ['error', { allowElseIf: false }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'IfStatement > .alternate',
          message: 'Use a guard clause, an early return, or a lookup instead of else.',
        },
      ],
      'no-nested-ternary': 'error',
      'id-length': ['error', { min: 3, properties: 'never', exceptions: ['id', 'z'] }],
      'id-denylist': ['error', ...abbreviatedIdentifiers],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
    },
  },
  {
    files: ['**/*.astro'],
    extends: [typescriptEslint.configs.disableTypeChecked],
  },
  eslintConfigPrettier,
]);
