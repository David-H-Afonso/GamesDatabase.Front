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
		// Plugin para eliminar env-config.js cuando se compila para Electron
		{
			name: 'remove-env-config-for-electron',
			transformIndexHtml(html) {
				if (process.env.ELECTRON === 'true') {
					// Eliminar la línea que carga env-config.js
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
	// Usar rutas relativas para Electron, absolutas para web
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
		// Ensure a single copy of React is used across all chunks (prevents
		// the "Cannot set properties of undefined (setting 'Activity')" crash
		// that occurs in React 19+ when react-dom and react-router initialise
		// in different chunk scopes)
		dedupe: ['react', 'react-dom', 'react-router-dom'],
	},
	optimizeDeps: {
		include: ['react', 'react-dom'],
	},
	build: {
		outDir: 'dist',
		assetsDir: 'assets',
		sourcemap: false,
		rollupOptions: {
			output: {
				manualChunks: (id) => {
					// React runtime + router in one chunk: react-dom registers
					// React.Activity during init; react-router-dom reads it
					// immediately, so they must live in the same scope.
					if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router') || id.includes('node_modules/@remix-run')) {
						return 'react-vendor'
					}
					// Redux / state management
					if (id.includes('node_modules/@reduxjs') || id.includes('node_modules/react-redux') || id.includes('node_modules/redux')) {
						return 'redux-vendor'
					}
					// Form library
					if (id.includes('node_modules/formik') || id.includes('node_modules/yup')) {
						return 'forms-vendor'
					}
					// All remaining node_modules go to a shared vendor chunk
					if (id.includes('node_modules')) {
						return 'vendor'
					}
				},
			},
		},
	},
	server: {
		port: 5173,
		host: true,
	},
})
