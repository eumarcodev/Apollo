import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const sameSlice = { slice: '{{ from.element.captured.slice }}' };

/** Element types of the architecture (README "Architecture"). Order matters: the first match wins. */
const elements = [
  { type: 'app', pattern: 'src/app' },
  { type: 'pages', pattern: 'src/pages' },
  { type: 'kernel', pattern: 'src/shared/kernel' },
  { type: 'server-config', pattern: 'src/shared/infrastructure/server-config' },
  { type: 'shared-infrastructure', pattern: 'src/shared/infrastructure' },
  { type: 'shared-i18n', pattern: 'src/shared/i18n' },
  { type: 'shared-ui', pattern: 'src/shared/ui' },
  { type: 'shared-testing', pattern: 'src/shared/testing' },
  { type: 'domain', pattern: 'src/features/*/domain', capture: ['slice'] },
  { type: 'application', pattern: 'src/features/*/application', capture: ['slice'] },
  { type: 'infrastructure', pattern: 'src/features/*/infrastructure', capture: ['slice'] },
  { type: 'ui', pattern: 'src/features/*/ui', capture: ['slice'] },
  { type: 'slice', pattern: 'src/features/*', capture: ['slice'] },
];

const to = (type, captured) => ({ to: { element: captured ? { type, captured } : { type } } });

/** Dependency policies (allow-list; everything else is an error). */
const policies = [
  { from: { element: { type: 'kernel' } }, allow: [to('kernel')] },
  {
    from: { element: { type: 'shared-infrastructure' } },
    allow: [to('kernel'), to('shared-infrastructure')],
  },
  {
    from: { element: { type: 'server-config' } },
    allow: [to('kernel'), to('shared-infrastructure'), to('server-config')],
  },
  {
    from: { element: { type: 'shared-i18n' } },
    allow: [to('kernel'), to('shared-infrastructure'), to('shared-i18n')],
  },
  { from: { element: { type: 'shared-ui' } }, allow: [to('kernel'), to('shared-i18n'), to('shared-ui')] },
  {
    from: { element: { type: 'shared-testing' } },
    allow: [to('kernel'), to('shared-infrastructure'), to('server-config'), to('shared-i18n'), to('shared-ui')],
  },
  // domain -> nothing outside shared/kernel (and its own slice's domain)
  { from: { element: { type: 'domain' } }, allow: [to('kernel'), to('domain', sameSlice)] },
  // application -> domain, kernel, its own ports/hooks, the shared server-config hook, other slices' index.ts
  {
    from: { element: { type: 'application' } },
    allow: [to('kernel'), to('server-config'), to('domain', sameSlice), to('application', sameSlice), to('slice')],
  },
  // infrastructure -> application ports, domain, shared infrastructure
  {
    from: { element: { type: 'infrastructure' } },
    allow: [
      to('kernel'),
      to('shared-infrastructure'),
      to('server-config'),
      to('domain', sameSlice),
      to('application', sameSlice),
      to('infrastructure', sameSlice),
    ],
  },
  // ui -> application, domain, shared ui, shared i18n (never infrastructure)
  {
    from: { element: { type: 'ui' } },
    allow: [
      to('kernel'),
      to('shared-ui'),
      to('shared-i18n'),
      to('domain', sameSlice),
      to('application', sameSlice),
      to('ui', sameSlice),
      to('slice'),
    ],
  },
  // slice index.ts: public API and composition of its own layers
  {
    from: { element: { type: 'slice' } },
    allow: [
      to('kernel'),
      to('shared-ui'),
      to('shared-i18n'),
      to('shared-infrastructure'),
      to('server-config'),
      to('domain', sameSlice),
      to('application', sameSlice),
      to('infrastructure', sameSlice),
      to('ui', sameSlice),
      to('slice'),
    ],
  },
  {
    from: { element: { type: 'app' } },
    allow: [
      to('app'),
      to('kernel'),
      to('shared-infrastructure'),
      to('server-config'),
      to('shared-i18n'),
      to('shared-ui'),
      to('slice'),
    ],
  },
  { from: { element: { type: 'pages' } }, allow: [to('app'), to('slice')] },
];

const NO_FETCH = [
  { name: 'fetch', message: 'Use an infrastructure adapter (httpClient) instead of fetch.' },
  { name: 'XMLHttpRequest', message: 'Use an infrastructure adapter (httpClient).' },
];

const UI_LIBRARIES = [
  { group: ['@heroui/*'], message: 'UI libraries belong to the ui layer.' },
  { group: ['lucide-react'], message: 'Icons belong to the ui layer.' },
];

const FRAMEWORKS = [
  { group: ['react', 'react-dom', 'react-dom/*'], message: 'Domain and kernel code is framework-free.' },
  {
    group: ['@tanstack/*', 'i18next', 'react-i18next', 'qrcode.react'],
    message: 'Domain and kernel code is framework-free.',
  },
];

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'cypress/screenshots/**', 'cypress/videos/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': elements,
      'boundaries/include': ['src/**/*'],
      'import/resolver': {
        typescript: { project: './tsconfig.json', alwaysTryTypes: true },
      },
    },
    rules: {
      'boundaries/dependencies': ['error', { default: 'disallow', policies }],
      'boundaries/no-unknown-files': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*', '../**'],
              message: 'Import across folders through the "@/" alias so the architecture rules can check it.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/shared/kernel/**', 'src/features/*/domain/**'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [...FRAMEWORKS, ...UI_LIBRARIES] }],
      'no-restricted-globals': ['error', ...NO_FETCH],
    },
  },
  {
    files: ['src/features/*/application/**'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: UI_LIBRARIES }],
      'no-restricted-globals': ['error', ...NO_FETCH],
    },
  },
  {
    files: ['src/features/*/ui/**', 'src/shared/ui/**', 'src/pages/**'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: { 'no-restricted-globals': ['error', ...NO_FETCH] },
  },
  {
    // Tests may reach into the code under test and the testing helpers.
    files: ['**/*.test.{ts,tsx}', 'src/shared/testing/**'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'boundaries/dependencies': 'off' },
  },
  {
    files: ['vite-plugins/**', 'scripts/**', '*.config.{js,ts}', 'tests/**', 'cypress/**'],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
);
