import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createTestStore } from '@/test/utils/createTestStore'
import { createWrapperWithStore } from '@/test/utils/createWrapperWithStore'
import { useTheme } from './useTheme'

// jsdom does not implement globalThis.matchMedia — provide a minimal stub
Object.defineProperty(globalThis, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
})

describe('useTheme', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		store = createTestStore()
		localStorage.clear()
	})

	afterEach(() => {
		localStorage.clear()
	})

	// ── Initial state ──────────────────────────────────────────────────────────

	it('returns correct initial state shape', () => {
		const { result } = renderHook(() => useTheme(), {
			wrapper: createWrapperWithStore(store),
		})

		expect(result.current.currentTheme).toBeDefined()
		expect(result.current.availableThemes).toBeInstanceOf(Array)
		expect(result.current.availableThemes.length).toBeGreaterThan(0)
		expect(result.current.cardStyle).toBeDefined()
		expect(result.current.viewMode).toBeDefined()
		expect(typeof result.current.setViewMode).toBe('function')
	})

	it('availableThemes includes light and dark', () => {
		const { result } = renderHook(() => useTheme(), {
			wrapper: createWrapperWithStore(store),
		})

		expect(result.current.availableThemes).toContain('light')
		expect(result.current.availableThemes).toContain('dark')
	})

	// ── setViewMode ────────────────────────────────────────────────────────────

	it('setViewMode() dispatches action and updates viewMode in store', () => {
		const { result } = renderHook(() => useTheme(), {
			wrapper: createWrapperWithStore(store),
		})

		act(() => {
			result.current.setViewMode('goty2025')
		})

		expect(store.getState().theme.viewMode).toBe('goty2025')
		expect(result.current.viewMode).toBe('goty2025')
	})

	it('setViewMode() accepts all valid ViewMode values', () => {
		const { result } = renderHook(() => useTheme(), {
			wrapper: createWrapperWithStore(store),
		})

		const validModes = ['default', 'goty2025', 'goal2025', 'noStartedByScore'] as const
		for (const mode of validModes) {
			act(() => {
				result.current.setViewMode(mode)
			})
			expect(result.current.viewMode).toBe(mode)
		}
	})

	// ── localStorage persistence ───────────────────────────────────────────────

	it('reads saved theme from localStorage on mount', () => {
		localStorage.setItem('theme', 'dark')

		const { result } = renderHook(() => useTheme(), {
			wrapper: createWrapperWithStore(store),
		})

		// After the effect fires, theme should be 'dark'
		expect(result.current.currentTheme).toBe('dark')
	})

	it('reads saved cardStyle from localStorage on mount', () => {
		localStorage.setItem('cardStyle', 'row')

		const { result } = renderHook(() => useTheme(), {
			wrapper: createWrapperWithStore(store),
		})

		expect(result.current.cardStyle).toBe('row')
	})

	it('reads saved viewMode from localStorage on mount', () => {
		localStorage.setItem('viewMode', 'goty2025')

		const { result } = renderHook(() => useTheme(), {
			wrapper: createWrapperWithStore(store),
		})

		expect(result.current.viewMode).toBe('goty2025')
	})

	it('ignores invalid cardStyle value from localStorage', () => {
		localStorage.setItem('cardStyle', 'invalid-style')

		const { result } = renderHook(() => useTheme(), {
			wrapper: createWrapperWithStore(store),
		})

		// cardStyle should remain at default, not 'invalid-style'
		expect(['card', 'row', 'tile']).toContain(result.current.cardStyle)
	})

	it('ignores invalid viewMode value from localStorage', () => {
		localStorage.setItem('viewMode', 'invalid-mode')

		const { result } = renderHook(() => useTheme(), {
			wrapper: createWrapperWithStore(store),
		})

		// viewMode should remain at a valid value
		expect(['default', 'goty2025', 'goal2025', 'noStartedByScore']).toContain(result.current.viewMode)
	})

	// ── System preference fallback ─────────────────────────────────────────────

	it('uses dark theme when system prefers dark and no localStorage value set', () => {
		// Override matchMedia to simulate prefers-color-scheme: dark
		Object.defineProperty(globalThis, 'matchMedia', {
			writable: true,
			value: vi.fn().mockImplementation((query: string) => ({
				matches: query === '(prefers-color-scheme: dark)',
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		})

		const darkStore = createTestStore()
		const { result } = renderHook(() => useTheme(), {
			wrapper: createWrapperWithStore(darkStore),
		})

		// initializeTheme should detect dark system preference
		expect(result.current.currentTheme).toBe('dark')

		// Restore default stub (prefers-color-scheme: light)
		Object.defineProperty(globalThis, 'matchMedia', {
			writable: true,
			value: vi.fn().mockImplementation((query: string) => ({
				matches: false,
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		})
	})
})
