import { apiRoutes } from '../apiRoutes'

// Función para obtener la URL base del API
function getApiBaseUrl(): string {
	// Si estamos en Electron, usar la variable global establecida
	if (typeof window !== 'undefined' && (window as any).API_BASE_URL) {
		return (window as any).API_BASE_URL
	}

	// Si tenemos configuración en runtime (Docker)
	if (typeof window !== 'undefined' && (window as any).ENV && (window as any).ENV.VITE_API_URL) {
		return (window as any).ENV.VITE_API_URL
	}

	// Si estamos en desarrollo web normal - usando las URLs de la documentación
	if (import.meta.env.DEV) {
		return 'https://localhost:7245/api'
	}

	// Fallback para producción web
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
		defaultPageSize: 10,
		maxPageSize: 100,
	},
	cors: {
		allowedOrigins: [
			'localhost:3000',
			'localhost:4200',
			'localhost:8080',
			'192.168.0.32:3000',
			'192.168.0.32:4200',
			'192.168.0.32:8080',
		],
	},
}
