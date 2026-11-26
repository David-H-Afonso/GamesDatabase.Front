import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
	globalIgnores(['dist', 'coverage', 'cypress']),
	{
		files: ['**/*.{ts,tsx}'],
		extends: [js.configs.recommended, tseslint.configs.recommended, reactRefresh.configs.vite],
		plugins: { 'react-hooks': reactHooks },
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser,
		},
		rules: {
			// Preserve the established hook policy; adopting React Compiler rules is a separate change.
			'react-hooks/rules-of-hooks': 'error',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
			'react-hooks/exhaustive-deps': 'off',
			'prefer-const': 'error',
		},
	},
])
