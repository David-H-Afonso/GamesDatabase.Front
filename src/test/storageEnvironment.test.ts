import { describe, expect, it } from 'vitest'
import { testLocalStorage, testSessionStorage } from './utils/storageEnvironment'

describe('isolated native browser Storage', () => {
	it('exposes the jsdom instances, not Node host storage', () => {
		expect(globalThis.localStorage).toBe(testLocalStorage)
		expect(window.localStorage).toBe(testLocalStorage)
		expect(window.sessionStorage).toBe(testSessionStorage)
	})
	it('preserves actual Storage semantics and string conversion', () => {
		localStorage.setItem('key', String(42))
		expect(localStorage.length).toBe(1)
		expect(localStorage.key(0)).toBe('key')
		expect(localStorage.getItem('key')).toBe('42')
		expect(localStorage.getItem('missing')).toBeNull()
		localStorage.removeItem('key')
		expect(localStorage.length).toBe(0)
	})
	it('keeps local and session stores separate', () => {
		localStorage.setItem('shared', 'local')
		sessionStorage.setItem('shared', 'session')
		expect(localStorage.getItem('shared')).toBe('local')
		expect(sessionStorage.getItem('shared')).toBe('session')
	})
	it('starts without data from earlier tests', () => {
		expect(localStorage.length).toBe(0)
		expect(sessionStorage.length).toBe(0)
	})
})
