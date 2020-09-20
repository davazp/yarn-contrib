module.exports = {
  root: true,
  env: {
    es2017: true,
    node: true,
  },
  processor: 'disable/disable',
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaFeatures: {
      jsx: false,
      modules: true,
    },
    project: ['./tsconfig.eslint.json', './packages/*/tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: [
    '@typescript-eslint',
    'import',
    'eslint-comments',
    'disable',
    'modules-newline',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
    'prettier/@typescript-eslint',
  ],
  rules: {
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/require-await': 'off',
    '@typescript-eslint/promise-function-async': 'error',
    '@typescript-eslint/indent': ['error', 2],
    'object-property-newline': [
      'error',
      { allowAllPropertiesOnSameLine: false },
    ],
    'object-curly-newline': [
      'error',
      {
        ObjectExpression: {
          multiline: true,
          minProperties: 2,
        },
        ObjectPattern: 'always',
        ExportDeclaration: 'always',
        ImportDeclaration: 'always',
      },
    ],
    'brace-style': ['error', 'stroustrup'],
    'comma-dangle': ['error', 'only-multiline'],
    '@typescript-eslint/no-misused-promises': 'warn',

    //
    // eslint-plugin-eslint-comment
    //

    // require a eslint-enable comment for every eslint-disable comment
    'eslint-comments/disable-enable-pair': ['error', { allowWholeFile: true }],
    // disallow a eslint-enable comment for multiple eslint-disable comments
    'eslint-comments/no-aggregating-enable': 'error',
    // disallow duplicate eslint-disable comments
    'eslint-comments/no-duplicate-disable': 'error',
    // disallow eslint-disable comments without rule names
    'eslint-comments/no-unlimited-disable': 'error',
    // disallow unused eslint-disable comments
    'eslint-comments/no-unused-disable': 'error',
    // disallow unused eslint-enable comments
    'eslint-comments/no-unused-enable': 'error',
    // disallow ESLint directive-comments
    'eslint-comments/no-use': [
      'error',
      {
        allow: [
          'eslint-disable',
          'eslint-disable-line',
          'eslint-disable-next-line',
          'eslint-enable',
        ],
      },
    ],

    //
    // eslint-plugin-import
    //

    // disallow non-import statements appearing before import statements
    'import/first': 'error',
    // Require a newline after the last import/require in a group
    'import/newline-after-import': 'error',
    // Forbid import of modules using absolute paths
    'import/no-absolute-path': 'error',
    // disallow AMD require/define
    'import/no-amd': 'error',
    // Forbid the use of extraneous packages
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: true,
        peerDependencies: true,
        optionalDependencies: false,
      },
    ],
    // Forbid mutable exports
    'import/no-mutable-exports': 'error',
    // Prevent importing the default as if it were named
    'import/no-named-default': 'error',
    // Prohibit named exports
    'import/no-named-export': 'off', // we want everything to be a named export
    // Forbid a module from importing itself
    'import/no-self-import': 'error',
    // Require modules with a single export to use a default export
    'import/prefer-default-export': 'off', // we want everything to be named

    //
    // eslint-plugin-modules-newline
    //

    'modules-newline/import-declaration-newline': 'error',
    'modules-newline/export-declaration-newline': 'error',
  },
  overrides: [
    {
      files: ['**/*.js'],
      settings: { 'disable/plugins': ['@typescript-eslint'] },
      parserOptions: { project: ['./tsconfig.eslint.json'] },
    },
  ],
}
