/**
 * Definiciones de TypeScript para las APIs de Electron expuestas via preload
 */

export interface ElectronAPI {
	// Información de la aplicación
	getAppVersion: () => Promise<string>
	getAppPath: (name: string) => Promise<string>
	getApiUrl: () => Promise<string>

	// Información del sistema
	platform: NodeJS.Platform
	isElectron: boolean

	// Utilidades
	openExternal: (url: string) => Promise<void>
}

export interface Env {
	NODE_ENV: string
	isDevelopment: boolean
}

declare global {
	interface Window {
		electronAPI?: ElectronAPI
		env?: Env
	}
}

export {}
