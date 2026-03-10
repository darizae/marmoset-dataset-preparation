import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['dist', 'node_modules', '.husky']
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.{ts,tsx}'],
        plugins: {
            'react-hooks': reactHooks
        },
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node
            }
        },
        rules: {
            ...reactHooks.configs['recommended-latest'].rules,
            '@typescript-eslint/no-explicit-any': 'off'
        }
    }
);
