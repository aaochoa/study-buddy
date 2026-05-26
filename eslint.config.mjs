import { configs, plugins } from 'eslint-config-airbnb-extended';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
    // 1. Global Ignores
    {
        ignores: ['.next/**', 'out/**', 'build/**', 'node_modules/**', 'agent/**', 'next-env.d.ts', 'commitlint.config.js'],
    },

    // 2. Load the plugin configuration objects
    plugins.react,
    plugins.reactHooks,
    plugins.reactA11y,
    plugins.importX,
    plugins.stylistic,
    plugins.typescriptEslint,
    plugins.next,

    // 3. Airbnb Extended Configs
    ...configs.react.recommended,
    ...configs.react.typescript,
    ...configs.next.recommended,

    // 4. Project settings and overrides
    {
        files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
        languageOptions: {
            parserOptions: {
                project: './tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            // Custom overrides for React 19 & Next.js compatibility
            'react/react-in-jsx-scope': 'off',
            'react/jsx-filename-extension': ['error', { extensions: ['.tsx', '.jsx'] }],
            'react/function-component-definition': 'off',
            'react/jsx-props-no-spreading': 'off',
            'react/require-default-props': 'off',
            'import/prefer-default-export': 'off',
            'no-console': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn',
            'react/no-array-index-key': 'off',
            'react-hooks/set-state-in-effect': 'off',
        },
    },

    // 5. Prettier integration
    eslintPluginPrettierRecommended,
];
