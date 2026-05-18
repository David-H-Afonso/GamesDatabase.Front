import { apiRoutes } from '../apiRoutes'

// Función para obtener la URL base del API
function getApiBaseUrl(): string {
	// Si estamos en Electron, usar la variable global establecida
	if (typeof window !== 'undefined' && (window as any).API_BASE_URL) {
		return (window as any).API_BASE_URL
	}

	// En modo dev de Vite (npm run dev) siempre usar localhost.
	// Debe ir ANTES del check de window.ENV porque public/env-config.js
	// puede tener la URL de producción y este fichero solo se usa en dev.
	if (import.meta.env.DEV) {
		return 'https://localhost:7245/api'
	}

	// Configuración de runtime (Docker dev)
	if (typeof window !== 'undefined' && (window as any).ENV && (window as any).ENV.VITE_API_URL) {
		return (window as any).ENV.VITE_API_URL
	}

	return 'https://localhost:7245/api'
}

export const environment = {
	production: false,
	baseUrl: getApiBaseUrl(),
	fallbackUrl: 'http://localhost:5011/api',
	apiRoutes,
	api: {
		timeout: 30000,
		retryAttempts: 3,
	},
	pagination: {
		defaultPageSize: 200,
		maxPageSize: 200,
	},
	cors: {
		allowedOrigins: ['localhost:3000', 'localhost:4200', 'localhost:8080', '192.168.0.32:3000', '192.168.0.32:4200', '192.168.0.32:8080'],
	},
	auth: {
		defaultUsername: 'Admin',
		defaultPassword: '',
	},
}
