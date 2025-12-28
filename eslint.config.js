import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

import globals from 'globals';

export default [
    {
        ignores: ['**/dist/**', '**/.venv/**', '**/node_modules/**']
    },
    js.configs.recommended,
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tsparser,
            globals: {
                ...globals.browser,
                ...globals.node
            },
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: true
                }
            }
        },
        plugins: {
            '@typescript-eslint': tseslint
        },
        rules: {
            // TypeScript handles 'no-undef' better than ESLint
            'no-undef': 'off',

            // ========== AI-MAINTAINABILITY FRAMEWORK RULES ==========

            // 1. THE 50-LINE RULE: Functions must be under 150 lines (User Request)
            'max-lines-per-function': ['error', {
                max: 150,
                skipBlankLines: true,
                skipComments: true,
                IIFEs: true
            }],

            // 2. COMPLEXITY LIMIT: Keep cognitive complexity low
            'complexity': ['warn', 10],

            // 3. MAX NESTING: No more than 3 levels deep
            'max-depth': ['error', 3],

            // 4. MAGIC NUMBERS: Warn on magic numbers (allow common ones)
            'no-magic-numbers': ['warn', {
                ignore: [0, 1, -1, 2],
                ignoreArrayIndexes: true,
                ignoreDefaultValues: true,
                enforceConst: true
            }],

            // 5. MAX PARAMETERS: Functions should not have too many parameters
            'max-params': ['warn', 4],

            // 6. MAX STATEMENTS: Limit statements per function
            'max-statements': ['warn', 20],

            // 7. CONSISTENT RETURN: All code paths should return
            'consistent-return': 'error',

            // 8. NO UNUSED VARS: Clean up unused variables
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_'
            }],

            // 9. EXPLICIT FUNCTION RETURN TYPES: For better AI understanding
            '@typescript-eslint/explicit-function-return-type': ['warn', {
                allowExpressions: true,
                allowTypedFunctionExpressions: true,
                allowHigherOrderFunctions: true
            }],

            // 10. NO ANY TYPE: Encourage proper typing
            '@typescript-eslint/no-explicit-any': 'warn',

            // ========== CODE QUALITY RULES ==========

            // Prefer const over let when possible
            'prefer-const': 'error',

            // Require strict equality
            'eqeqeq': ['error', 'always'],

            // No console.log in production (allow console.error, console.warn)
            'no-console': ['warn', { allow: ['warn', 'error'] }],

            // Consistent naming conventions
            '@typescript-eslint/naming-convention': ['warn',
                {
                    selector: 'variable',
                    modifiers: ['const'],
                    format: ['camelCase', 'UPPER_CASE', 'PascalCase']
                },
                {
                    selector: 'function',
                    format: ['camelCase', 'PascalCase']
                },
                {
                    selector: 'typeLike',
                    format: ['PascalCase']
                }
            ]
        }
    },
    {
        files: ['**/*.tsx'],
        rules: {
            // Relax 50-line rule for React components (markup takes space)
            'max-lines-per-function': ['error', {
                max: 150,
                skipBlankLines: true,
                skipComments: true,
                IIFEs: true
            }]
        }
    },
    {
        // Ignore patterns
        ignores: [
            'dist/**',
            'build/**',
            'node_modules/**',
            '*.config.js',
            '*.config.ts',
            'vite.config.ts'
        ]
    }
];
