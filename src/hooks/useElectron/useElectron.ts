import { useState, useEffect } from 'react'

/**
 * Hook para detectar si la app está corriendo en Electron
 */
export function useIsElectron() {
	return typeof window !== 'undefined' && window.electronAPI?.isElectron === true
}

/**
 * Hook para obtener la versión de la aplicación
 */
export function useAppVersion() {
	const [version, setVersion] = useState<string>('')
	const isElectron = useIsElectron()

	useEffect(() => {
		if (isElectron && window.electronAPI) {
			window.electronAPI.getAppVersion().then(setVersion)
		}
	}, [isElectron])

	return version
}

/**
 * Hook para obtener la URL del API (funciona tanto en web como en Electron)
 */
export function useApiUrl() {
	const [apiUrl, setApiUrl] = useState<string>(import.meta.env.VITE_API_URL || 'http://localhost:8080/api')
	const isElectron = useIsElectron()

	useEffect(() => {
		if (isElectron && window.electronAPI) {
			window.electronAPI.getApiUrl().then(setApiUrl)
		}
	}, [isElectron])

	return apiUrl
}

/**
 * Hook para obtener información del entorno
 */
export function useElectronEnv() {
	const isElectron = useIsElectron()
	const [env, setEnv] = useState({
		isDevelopment: import.meta.env.DEV,
		platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
	})

	useEffect(() => {
		if (isElectron && window.electronAPI && window.env) {
			setEnv({
				isDevelopment: window.env.isDevelopment,
				platform: window.electronAPI.platform,
			})
		}
	}, [isElectron])

	return { isElectron, ...env }
}

/**
 * Hook para abrir links externos (funciona en web y Electron)
 */
export function useOpenExternal() {
	const isElectron = useIsElectron()

	return (url: string) => {
		if (isElectron && window.electronAPI) {
			window.electronAPI.openExternal(url)
		} else {
			window.open(url, '_blank', 'noopener,noreferrer')
		}
	}
}
