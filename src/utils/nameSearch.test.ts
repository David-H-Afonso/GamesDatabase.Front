import { describe, expect, it } from 'vitest'
import { createNameSearch, matchesNameSearch } from './nameSearch'

describe('shared literal Unicode search', () => {
	it.each([['Pokémon', 'Pokemon'], ['POKÉMON', 'pokemon'], ['Poke\u0301mon', 'Pokémon'], ['METAL GEAR SOLID', 'metal gear'], ['a.*?[]', '.*?[]'], ['ゼルダの伝説', 'ゼルダ']])('matches %s by the literal phrase %s', (name, term) => expect(matchesNameSearch(name, { includeTerms: [term] })).toBe(true))
	it('keeps accent and case sensitivity independent', () => {
		expect(matchesNameSearch('Pokémon', { includeTerms: ['pokemon'], accentSensitive: true })).toBe(false)
		expect(matchesNameSearch('Pokémon', { includeTerms: ['Pokemon'], caseSensitive: true })).toBe(true)
		expect(matchesNameSearch('Pokémon', { includeTerms: ['pokemon'], caseSensitive: true })).toBe(false)
	})
	it('combines inclusions with any/all, while any exclusion wins', () => {
		const rule = createNameSearch({ includeTerms: ['metal gear', 'solid'], matchMode: 'all', excludeTerms: ['survive'] })
		expect(matchesNameSearch('Metal Gear Solid', rule)).toBe(true); expect(matchesNameSearch('Metal Gear Survive Solid', rule)).toBe(false)
		expect(matchesNameSearch('Metal Gear', rule)).toBe(false); expect(matchesNameSearch('Metal Gear', { ...rule, matchMode: 'any' })).toBe(true)
		expect(matchesNameSearch('Anything', { includeTerms: [] })).toBe(true)
		expect(matchesNameSearch('Pokémon Blue', { includeTerms: ['Pokemon'], matchType: 'exact' })).toBe(false)
	})
})
