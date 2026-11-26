import { describe, expect, it } from 'vitest'
import { gameResearchLink } from './gameResearchLinks'

const game = { name: 'Pokémon & "Test"', platformName: 'Steam' }
describe('original game research destinations', () => {
	it.each([['logo', 'logo'], ['hero', 'header'], ['cover', 'cover art']])('restores the %s image query', (field, additive) => {
		expect(gameResearchLink(field, game)?.href).toBe(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`"${game.name}" ${additive}`)}`)
	})
	it('uses the game provider before the user preference, and the preference before Metacritic', () => {
		expect(gameResearchLink('critic', { ...game, criticProvider: 'SteamDB' }, 'OpenCritic')).toEqual({ provider: 'SteamDB', href: `https://steamdb.info/instantsearch/?query=${encodeURIComponent(game.name)}` })
		expect(gameResearchLink('critic', game, 'OpenCritic')?.href).toBe(`https://www.google.com/search?q=${encodeURIComponent(`site:opencritic.com ${game.name}`)}`)
		expect(gameResearchLink('critic', game)?.provider).toBe('Metacritic')
	})
	it.each(['story', 'completion'])('keeps %s in HowLongToBeat rather than inventing a time', field => {
		expect(gameResearchLink(field, game)?.href).toBe(`https://howlongtobeat.com/?q=${encodeURIComponent(game.name)}`)
	})
	it('uses a valid Steam App ID and otherwise searches the title', () => {
		expect(gameResearchLink('platformId', { ...game, steamAppId: 100 })?.href).toBe('https://store.steampowered.com/app/100/')
		for (const steamAppId of [undefined, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) expect(gameResearchLink('platformId', { ...game, steamAppId })?.href).toBe(`https://store.steampowered.com/search/?term=${encodeURIComponent(game.name).replace(/%20/g, '+')}`)
	})
	it('retains the Epic destination without treating arbitrary platforms as links', () => {
		expect(gameResearchLink('platformId', { ...game, platformName: 'Epic Games' })?.href).toContain('https://store.epicgames.com/es-ES/browse?q=')
		expect(gameResearchLink('platformId', { ...game, platformName: 'PlayStation' })).toBeNull()
	})
	it('does not make up a provider for the personal grade, calculated score or comment', () => {
		for (const field of ['grade', 'score', 'comment']) expect(gameResearchLink(field, game)).toBeNull()
		expect(gameResearchLink('cover', { name: '  ' })).toBeNull()
	})
})
