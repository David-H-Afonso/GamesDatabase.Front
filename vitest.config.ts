/// <reference types="vitest/config" />
import { defineConfig, mergeConfig } from 'vite'
import viteConfig from './vite.config'

export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			globals: true,
			environment: 'jsdom',
			setupFiles: ['./src/test/setup.ts'],
			include: ['src/**/*.{test,spec}.{ts,tsx}'],
			exclude: ['node_modules', 'dist', 'cypress'],
			css: false,
			coverage: {
				provider: 'v8',
				reporter: ['text', 'text-summary', 'lcov', 'html'],
				reportsDirectory: './coverage',
				include: ['src/**/*.{ts,tsx}'],
				exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}', 'src/test/**', 'src/vite-env.d.ts', 'src/main.tsx', 'src/types/**'],
				thresholds: {
					lines: 70,
					branches: 60,
					functions: 70,
					statements: 70,
				},
			},
		},
	})
)
