import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import pkg from './package.json'

const commitHash = (() => {
	try {
		return execSync('git rev-parse --short HEAD').toString().trim()
	} catch {
		return 'unknown'
	}
})()
const buildDate = new Date().toISOString().split('T')[0]

export default defineConfig({
	plugins: [
		react(),
		svgr({
			svgrOptions: {
				exportType: 'default',
			},
			include: '**/*.svg?react',
		}),
		{
			name: 'remove-env-config-for-electron',
			transformIndexHtml(html) {
				if (process.env.ELECTRON === 'true') {
					return html.replace(
						/<!-- Load runtime environment configuration \(for Docker\) -->\s*<script src="[^"]*env-config\.js"><\/script>\s*/,
						'<!-- env-config.js not needed in Electron -->\n\t\t'
					)
				}
				return html
			},
		},
	],
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version),
		__COMMIT_HASH__: JSON.stringify(commitHash),
		__BUILD_DATE__: JSON.stringify(buildDate),
	},
	base: process.env.ELECTRON === 'true' ? './' : '/',
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
		dedupe: ['react', 'react-dom', 'react-router-dom'],
	},
	optimizeDeps: {
		include: ['react', 'react-dom'],
	},
	css: {
		preprocessorOptions: {
			scss: {
				silenceDeprecations: ['import'],
			},
		},
	},
	build: {
		outDir: 'dist',
		assetsDir: 'assets',
		sourcemap: false,
		target: 'es2020',
		minify: 'esbuild',
		cssMinify: true,
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (!id.includes('node_modules')) return undefined
					if (id.includes('react-dom') || (id.includes('/react/') && !id.includes('react-router'))) return 'vendor-react'
					if (id.includes('react-router')) return 'vendor-router'
					if (id.includes('@reduxjs') || id.includes('react-redux') || id.includes('redux-persist')) return 'vendor-redux'
					if (id.includes('formik')) return 'vendor-formik'
					return undefined
				},
			},
		},
	},
	server: {
		port: 5173,
		host: true,
	},
})
