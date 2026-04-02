import { describe, it, expect } from 'vitest'
import { getCriticScoreUrl, getCriticProviderIdFromName, getCriticProviderNameFromId, resolveEffectiveProvider } from './criticScoreHelper'

describe('getCriticScoreUrl', () => {
	it('returns Metacritic search URL for Metacritic provider', () => {
		const url = getCriticScoreUrl('The Legend of Zelda', 'Metacritic')
		expect(url).toContain('metacritic.com/search/')
		expect(url).toContain(encodeURIComponent('The Legend of Zelda'))
	})

	it('returns Google site:opencritic.com URL for OpenCritic provider', () => {
		const url = getCriticScoreUrl('Hades', 'OpenCritic')
		expect(url).toContain('google.com/search')
		expect(url).toContain('opencritic.com')
		expect(url).toContain(encodeURIComponent('Hades'))
	})

	it('returns SteamDB instantsearch URL for SteamDB provider', () => {
		const url = getCriticScoreUrl('Dark Souls', 'SteamDB')
		expect(url).toContain('steamdb.info/instantsearch/')
		expect(url).toContain(encodeURIComponent('Dark Souls'))
	})

	it('encodes special characters in game name', () => {
		const url = getCriticScoreUrl('Elden Ring: Shadow of the Erdtree', 'Metacritic')
		expect(url).toContain(encodeURIComponent('Elden Ring: Shadow of the Erdtree'))
	})

	it('trims whitespace from game name before encoding', () => {
		const urlWithSpaces = getCriticScoreUrl('  Zelda  ', 'Metacritic')
		const urlClean = getCriticScoreUrl('Zelda', 'Metacritic')
		expect(urlWithSpaces).toBe(urlClean)
	})

	it('defaults to Metacritic when provider falls through (default case)', () => {
		const url = getCriticScoreUrl('Game', 'Metacritic')
		expect(url).toContain('metacritic.com')
	})
})

describe('getCriticProviderIdFromName', () => {
	it('returns 1 for Metacritic', () => {
		expect(getCriticProviderIdFromName('Metacritic')).toBe(1)
	})

	it('returns 2 for OpenCritic', () => {
		expect(getCriticProviderIdFromName('OpenCritic')).toBe(2)
	})

	it('returns 3 for SteamDB', () => {
		expect(getCriticProviderIdFromName('SteamDB')).toBe(3)
	})

	it('returns undefined for null', () => {
		expect(getCriticProviderIdFromName(null)).toBeUndefined()
	})

	it('returns undefined for undefined', () => {
		expect(getCriticProviderIdFromName(undefined)).toBeUndefined()
	})

	it('returns undefined for unknown provider', () => {
		expect(getCriticProviderIdFromName('IGN')).toBeUndefined()
	})
})

describe('getCriticProviderNameFromId', () => {
	it('returns Metacritic for id 1', () => {
		expect(getCriticProviderNameFromId(1)).toBe('Metacritic')
	})

	it('returns OpenCritic for id 2', () => {
		expect(getCriticProviderNameFromId(2)).toBe('OpenCritic')
	})

	it('returns SteamDB for id 3', () => {
		expect(getCriticProviderNameFromId(3)).toBe('SteamDB')
	})

	it('returns null for id 0', () => {
		expect(getCriticProviderNameFromId(0)).toBeNull()
	})

	it('returns null for null', () => {
		expect(getCriticProviderNameFromId(null)).toBeNull()
	})

	it('returns null for undefined', () => {
		expect(getCriticProviderNameFromId(undefined)).toBeNull()
	})

	it('returns null for unknown id', () => {
		expect(getCriticProviderNameFromId(99)).toBeNull()
	})
})

describe('resolveEffectiveProvider', () => {
	it('uses game provider when both are defined', () => {
		const result = resolveEffectiveProvider('OpenCritic', 'Metacritic')
		expect(result).toBe('OpenCritic')
	})

	it('falls back to user provider when game provider is undefined', () => {
		const result = resolveEffectiveProvider(undefined, 'SteamDB')
		expect(result).toBe('SteamDB')
	})

	it('defaults to Metacritic when both are undefined', () => {
		const result = resolveEffectiveProvider(undefined, undefined)
		expect(result).toBe('Metacritic')
	})

	it('uses game provider even if it is the same as default', () => {
		const result = resolveEffectiveProvider('Metacritic', undefined)
		expect(result).toBe('Metacritic')
	})
})
