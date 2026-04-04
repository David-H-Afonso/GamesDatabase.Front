import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsElectron, useAppVersion, useApiUrl, useElectronEnv, useOpenExternal } from './useElectron'

// ── Helpers ────────────────────────────────────────────────────────────────────

function clearElectronAPI() {
	Object.defineProperty(globalThis, 'electronAPI', {
		writable: true,
		configurable: true,
		value: undefined,
	})
	Object.defineProperty(globalThis, 'env', {
		writable: true,
		configurable: true,
		value: undefined,
	})
}

function setElectronAPI(overrides: Partial<typeof window.electronAPI> = {}) {
	Object.defineProperty(globalThis, 'electronAPI', {
		writable: true,
		configurable: true,
		value: {
			isElectron: true,
			platform: 'linux',
			getAppVersion: vi.fn().mockResolvedValue('1.2.3'),
			getApiUrl: vi.fn().mockResolvedValue('http://electron-api:8080/api'),
			openExternal: vi.fn(),
			...overrides,
		},
	})
}

describe('useIsElectron', () => {
	afterEach(() => {
		clearElectronAPI()
	})

	it('returns false when electronAPI is undefined', () => {
		clearElectronAPI()
		const { result } = renderHook(() => useIsElectron())
		expect(result.current).toBe(false)
	})

	it('returns false when electronAPI.isElectron is false', () => {
		setElectronAPI({ isElectron: false })
		const { result } = renderHook(() => useIsElectron())
		expect(result.current).toBe(false)
	})

	it('returns true when electronAPI.isElectron is true', () => {
		setElectronAPI({ isElectron: true })
		const { result } = renderHook(() => useIsElectron())
		expect(result.current).toBe(true)
	})
})

describe('useAppVersion', () => {
	beforeEach(() => {
		clearElectronAPI()
	})

	afterEach(() => {
		clearElectronAPI()
	})

	it('returns empty string when not running in Electron', () => {
		clearElectronAPI()
		const { result } = renderHook(() => useAppVersion())
		expect(result.current).toBe('')
	})

	it('returns version string when running in Electron', async () => {
		setElectronAPI({ isElectron: true, getAppVersion: vi.fn().mockResolvedValue('2.0.1') })

		const { result } = renderHook(() => useAppVersion())

		await act(async () => {
			// allow the useEffect to resolve the promise
			await Promise.resolve()
		})

		expect(result.current).toBe('2.0.1')
	})
})

describe('useApiUrl', () => {
	beforeEach(() => {
		clearElectronAPI()
	})

	afterEach(() => {
		clearElectronAPI()
	})

	it('returns the VITE_API_URL env value or fallback when not in Electron', () => {
		clearElectronAPI()
		const { result } = renderHook(() => useApiUrl())
		// Should return a non-empty string (env var or fallback)
		expect(typeof result.current).toBe('string')
		expect(result.current.length).toBeGreaterThan(0)
	})

	it('returns Electron API URL when running in Electron', async () => {
		setElectronAPI({ isElectron: true, getApiUrl: vi.fn().mockResolvedValue('http://electron-api:9090/api') })

		const { result } = renderHook(() => useApiUrl())

		await act(async () => {
			await Promise.resolve()
		})

		expect(result.current).toBe('http://electron-api:9090/api')
	})
})

describe('useElectronEnv', () => {
	afterEach(() => {
		clearElectronAPI()
	})

	it('returns isElectron: false when not in Electron', () => {
		clearElectronAPI()
		const { result } = renderHook(() => useElectronEnv())
		expect(result.current.isElectron).toBe(false)
	})

	it('returns isElectron: true when in Electron', () => {
		setElectronAPI({ isElectron: true })
		const { result } = renderHook(() => useElectronEnv())
		expect(result.current.isElectron).toBe(true)
	})

	it('returns platform information', () => {
		const { result } = renderHook(() => useElectronEnv())
		expect(typeof result.current.platform).toBe('string')
	})
})

describe('useOpenExternal', () => {
	const originalWindowOpen = globalThis.window.open

	afterEach(() => {
		clearElectronAPI()
		globalThis.window.open = originalWindowOpen
	})

	it('calls window.open when not in Electron', () => {
		clearElectronAPI()
		const openSpy = vi.fn()
		globalThis.window.open = openSpy

		const { result } = renderHook(() => useOpenExternal())
		result.current('https://example.com')

		expect(openSpy).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer')
	})

	it('calls electronAPI.openExternal when in Electron', () => {
		const openExternal = vi.fn()
		setElectronAPI({ isElectron: true, openExternal })

		const { result } = renderHook(() => useOpenExternal())
		result.current('https://example.com')

		expect(openExternal).toHaveBeenCalledWith('https://example.com')
	})
})
