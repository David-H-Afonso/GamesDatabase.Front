/// <reference types="vitest/config" />
import { defineConfig, mergeConfig } from 'vite'
import viteConfig from './vite.config'

export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			globals: true,
			environment: 'jsdom',
			// Cold ESM transform of heavy component graphs (Admin + @dnd-kit + Steam)
			// under parallel worker contention can exceed the default 5s budget on a
			// fresh cache/CI, causing spurious timeouts and cascading DOM-cleanup
			// artifacts. Give realistic headroom so the suite is deterministic.
			testTimeout: 20000,
			hookTimeout: 20000,
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
					lines: 45,
					branches: 30,
					functions: 40,
					statements: 45,
				},
			},
		},
	})
)
