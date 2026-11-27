import { describe, expect, it, vi } from 'vitest'
import { readCreateSteamPreference, saveCreateSteamPreference } from './createGamePreferences'

describe('owner-scoped creation source preference', () => {
	it('retains explicit on and off without inheriting another account or storing drafts', () => {
		expect(readCreateSteamPreference(1)).toBe(false); saveCreateSteamPreference(1, true)
		expect(readCreateSteamPreference(1)).toBe(true); expect(readCreateSteamPreference(2)).toBe(false)
		saveCreateSteamPreference(2, true); saveCreateSteamPreference(1, false)
		expect(readCreateSteamPreference(1)).toBe(false); expect(readCreateSteamPreference(2)).toBe(true)
		expect(localStorage.getItem('gdb:create-game:steam-search:v1:1')).toBe('false')
	})
	it.each([undefined, 0, -1, 1.5, Number.NaN])('does not persist or reuse an invalid/anonymous owner %s', owner => {
		saveCreateSteamPreference(owner, true); expect(readCreateSteamPreference(owner)).toBe(false)
	})
	it('treats inaccessible browser storage as optional rather than breaking creation', () => {
		const storage = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('Storage unavailable') })
		try { expect(readCreateSteamPreference(1)).toBe(false); expect(() => saveCreateSteamPreference(1, true)).not.toThrow() } finally { storage.mockRestore() }
	})
})
