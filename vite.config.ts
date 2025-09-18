import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'
import react from '@vitejs/plugin-react'

export default defineConfig({
	plugins: [
		react(),
		svgr({
			svgrOptions: {
				exportType: 'default',
			},
			include: '**/*.svg?react',
		}),
	],
	base: './',
	resolve: {
		alias: {
			'@': '/src',
			'@/assets': '/src/assets',
			'@/components': '/src/components',
			'@/environments': '/src/environments',
			'@/hooks': '/src/hooks',
			'@/layouts': '/src/layouts',
			'@/models': '/src/models',
			'@/navigation': '/src/navigation',
			'@/providers': '/src/providers',
			'@/services': '/src/services',
			'@/store': '/src/store',
			'@/utils': '/src/utils',
		},
	},
	build: {
		outDir: 'dist',
		assetsDir: 'assets',
		sourcemap: false,
		rollupOptions: {
			output: {
				manualChunks: undefined,
			},
		},
	},
	server: {
		port: 5173,
		host: true,
	},
})
