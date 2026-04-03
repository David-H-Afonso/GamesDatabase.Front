import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import sonarjs from 'eslint-plugin-sonarjs'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
	globalIgnores(['dist', 'coverage', 'cypress']),
	{
		files: ['**/*.{ts,tsx}'],
		extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs['recommended-latest'], reactRefresh.configs.vite, sonarjs.configs.recommended],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser,
		},
		rules: {
			// TypeScript
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
			'react-hooks/exhaustive-deps': 'off',

			// SonarQube rules — errors (must fix)
			'sonarjs/no-redundant-boolean': 'error', // S1125
			'sonarjs/no-identical-expressions': 'error', // S1764
			'sonarjs/no-duplicate-string': 'off', // S1192 — too noisy for UI code
			'sonarjs/cognitive-complexity': ['warn', 20], // S3776 — warn only, threshold 20
			'sonarjs/no-nested-template-literals': 'warn', // S4624
			'no-constant-binary-expression': 'error', // S6638
			'no-nested-ternary': 'error', // S3358
			'prefer-const': 'error', // S1854

			// SonarQube rules — intentionally off (patterns that are standard in this codebase)
			'sonarjs/todo-tag': 'off', // TODO comments are dev aids, not code defects
			'sonarjs/no-os-command-from-path': 'off', // vite.config.ts uses git for version hash
			'sonarjs/no-hardcoded-ip': 'off', // AdminDataExport intentionally detects local IPs
			'sonarjs/no-nested-functions': 'off', // React JSX event handlers require nested functions
			'sonarjs/use-type-alias': 'off', // too opinionated for existing code style
			'sonarjs/redundant-type-aliases': 'off', // example/legacy files
		},
	},
	// Relax some rules for test files
	{
		files: ['**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
		rules: {},
	},
])
