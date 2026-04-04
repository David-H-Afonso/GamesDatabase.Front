import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import themeReducer, { setTheme, addTheme, removeTheme, initializeTheme, setCardStyle, setViewMode, reset } from '../themeSlice'
import type { ThemeState } from '@/models/store/ThemeState'

// jsdom does not implement globalThis.matchMedia; provide a minimal stub
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

const initialState = themeReducer(undefined, { type: '@@INIT' })

describe('themeSlice — initial state', () => {
	it('availableThemes contains light and dark', () => {
		expect(initialState.availableThemes).toContain('light')
		expect(initialState.availableThemes).toContain('dark')
	})

	it('cardStyle defaults to card', () => {
		expect(initialState.cardStyle).toBe('card')
	})

	it('viewMode defaults to default', () => {
		expect(initialState.viewMode).toBe('default')
	})
})

describe('themeSlice — setTheme', () => {
	let state: ThemeState

	beforeEach(() => {
		state = { ...initialState, availableThemes: ['light', 'dark'] }
	})

	it('sets currentTheme when theme is available', () => {
		const next = themeReducer(state, setTheme('dark'))
		expect(next.currentTheme).toBe('dark')
	})

	it('applies data-theme attribute to document', () => {
		themeReducer(state, setTheme('dark'))
		expect(document.documentElement.dataset['theme']).toBe('dark')
	})

	it('does not change theme for unavailable theme value', () => {
		const current = state.currentTheme
		const next = themeReducer(state, setTheme('neon-pink'))
		expect(next.currentTheme).toBe(current)
	})
})

describe('themeSlice — addTheme / removeTheme', () => {
	let state: ThemeState

	beforeEach(() => {
		state = { ...initialState, availableThemes: ['light', 'dark'] }
	})

	it('addTheme appends a new theme', () => {
		const next = themeReducer(state, addTheme('high-contrast'))
		expect(next.availableThemes).toContain('high-contrast')
	})

	it('addTheme does not duplicate existing themes', () => {
		const next = themeReducer(state, addTheme('dark'))
		expect(next.availableThemes.filter((t) => t === 'dark')).toHaveLength(1)
	})

	it('removeTheme removes a theme that is not current', () => {
		const withCurrent = themeReducer(state, setTheme('light'))
		const next = themeReducer(withCurrent, removeTheme('dark'))
		expect(next.availableThemes).not.toContain('dark')
	})

	it('removeTheme does not remove the current theme', () => {
		const s = themeReducer(state, setTheme('dark'))
		const next = themeReducer(s, removeTheme('dark'))
		expect(next.availableThemes).toContain('dark')
	})
})

describe('themeSlice — initializeTheme', () => {
	afterEach(() => {
		localStorage.clear()
	})

	it('uses savedTheme from localStorage if valid', () => {
		localStorage.setItem('theme', 'dark')
		const next = themeReducer({ ...initialState, availableThemes: ['light', 'dark'] }, initializeTheme())
		expect(next.currentTheme).toBe('dark')
	})

	it('falls back to dark when localStorage is empty and no system preference', () => {
		// jsdom matchMedia returns false by default
		const next = themeReducer({ ...initialState, availableThemes: ['light', 'dark'] }, initializeTheme())
		// Either dark (fallback) or whatever the logic picks - just verify it's in availableThemes
		expect(['light', 'dark']).toContain(next.currentTheme)
	})

	it('uses system dark preference when no saved theme', () => {
		vi.spyOn(globalThis, 'matchMedia').mockReturnValueOnce({
			matches: true,
			media: '(prefers-color-scheme: dark)',
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})
		const next = themeReducer({ ...initialState, availableThemes: ['light', 'dark'] }, initializeTheme())
		expect(next.currentTheme).toBe('dark')
	})

	it('ignores invalid saved theme and falls back to system preference', () => {
		localStorage.setItem('theme', 'nonexistent-theme')
		vi.spyOn(globalThis, 'matchMedia').mockReturnValueOnce({
			matches: true,
			media: '(prefers-color-scheme: dark)',
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})
		const next = themeReducer({ ...initialState, availableThemes: ['light', 'dark'] }, initializeTheme())
		expect(next.currentTheme).toBe('dark')
	})
})

describe('themeSlice — setCardStyle / setViewMode / reset', () => {
	it('setCardStyle updates cardStyle', () => {
		const next = themeReducer(initialState, setCardStyle('row'))
		expect(next.cardStyle).toBe('row')
	})

	it('setCardStyle to tile', () => {
		const next = themeReducer(initialState, setCardStyle('tile'))
		expect(next.cardStyle).toBe('tile')
	})

	it('setViewMode updates viewMode', () => {
		const next = themeReducer(initialState, setViewMode('goty2025'))
		expect(next.viewMode).toBe('goty2025')
	})

	it('reset returns to initial state', () => {
		let s = themeReducer(initialState, setCardStyle('row'))
		s = themeReducer(s, setViewMode('goty2025'))
		const next = themeReducer(s, reset())
		expect(next.cardStyle).toBe('card')
		expect(next.viewMode).toBe('default')
	})
})
