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
