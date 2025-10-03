// environment.prod.ts
import { apiRoutes } from '../apiRoutes'

function getApiBaseUrl(): string {
	// Si estamos en Electron
	if (typeof window !== 'undefined' && (window as any).API_BASE_URL) {
		return (window as any).API_BASE_URL
	}

	// Si tenemos configuración en runtime (Docker)
	if (typeof window !== 'undefined' && (window as any).ENV && (window as any).ENV.VITE_API_URL) {
		return (window as any).ENV.VITE_API_URL
	}

	// Si definimos la URL en tiempo de build (Docker/Vite)
	if (import.meta.env.VITE_API_URL) {
		return import.meta.env.VITE_API_URL as string
	}

	// Fallback - en producción usaríamos HTTPS por defecto
	return 'https://localhost:7245/api'
}

export const environment = {
	production: true,
	baseUrl: getApiBaseUrl(),
	fallbackUrl: 'http://localhost:5011/api',
	apiRoutes,
	api: {
		timeout: 30000,
		retryAttempts: 2,
	},
	pagination: {
		defaultPageSize: 200,
		maxPageSize: 200,
	},
	cors: {
		allowedOrigins: [], // Se configura desde el backend en producción
	},
	auth: {
		defaultUsername: 'Admin',
		defaultPassword: '',
	},
}
