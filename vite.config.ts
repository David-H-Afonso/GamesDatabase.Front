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
						/<!-- Load runtime environment configuration \(for Docker\) -->[\s\S]*?<script[^>]*src="[^"]*env-config\.js"[^>]*><\/script>\s*/,
						'<!-- env-config.js not needed in Electron -->\n\t\t'
					)
				}
				return html
			},
		},
		{
			name: 'verify-static-chunk-order',
			generateBundle(_options, bundle) {
				const complete = new Set<string>(), active = new Set<string>()
				const visit = (file: string, path: string[]) => {
					if (complete.has(file)) return
					if (active.has(file)) this.error(`Static chunk cycle can break module initialization: ${[...path, file].join(' -> ')}`)
					const chunk = bundle[file]
					if (!chunk || chunk.type !== 'chunk') return
					active.add(file)
					for (const dependency of chunk.imports) visit(dependency, [...path, file])
					active.delete(file); complete.add(file)
				}
				for (const file of Object.keys(bundle)) visit(file, [])
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
					// Leaf translation catalogs cache independently without enlarging the application chunk.
					const locale = /src\/i18n\/locales\/(?:gallery\.|guide\.|metadata\.)?(en|es)\.json$/.exec(id)
					if (locale) return `locale-${locale[1]}`
					// Rollup's shared CJS helpers must not be assigned to Formik and imported back by React.
					if (id.includes('commonjsHelpers')) return 'vendor-runtime'
					if (!id.includes('node_modules')) return undefined
					if (id.includes('react-dom') || (id.includes('/react/') && !id.includes('react-router'))) return 'vendor-react'
					if (id.includes('react-router')) return 'vendor-router'
					if (id.includes('@reduxjs') || id.includes('react-redux') || id.includes('redux-persist')) return 'vendor-redux'
					if (id.includes('formik')) return 'vendor-formik'
					if (id.includes('i18next')) return 'vendor-i18n'
					return undefined
				},
			},
		},
	},
	server: {
		port: 5173,
		strictPort: false, // Vite increments to 5174, 5175… when 5173 is busy — keep in sync with API CORS
		host: true,
		// Browser evidence and other scratch files are not application sources.
		// Chromium may briefly lock downloads on Windows while finalizing them.
		watch: { ignored: ['**/.tmp/**', '**/.playwright-mcp/**'] },
		proxy: {
			// Forward /game-images requests to the local API in dev.
			// OptimizedImage strips the origin from all game-image URLs so they
			// become relative paths — Vite must proxy them to the API which serves
			// ImageProxyController at /game-images.
			'/game-images': {
				target: 'http://localhost:5011',
				changeOrigin: true,
			},
		},
	},
})
