import { beforeEach, describe, expect, it, vi } from 'vitest'
import { customFetch } from '@/utils/customFetch'
import { applyGameMetadata, previewGameMetadata } from './GameMetadataService'

vi.mock('@/utils/customFetch', () => ({ customFetch: vi.fn() }))
const request = vi.mocked(customFetch)
const lookup = { overwrite: true, includeArtwork: true, includeDurations: true, includeCritic: true, reviewVersion: 2 as const }
const critic = { field: 'critic', current: 87, value: 89, source: 'dekudeals', url: 'https://www.dekudeals.com/items/hollow-knight', criticProvider: 'OpenCritic', currentCriticProvider: 'Metacritic', criticScope: 'listed-platform', criticUrl: 'https://opencritic.com/game/3985/hollow-knight' }
const preview = { overwrite: true, reviewVersion: 2, fields: [critic], matches: [], notices: [], token: 'fixture-review-not-authentication' }

describe('critic provenance transport contracts, not live-source proof', () => {
	beforeEach(() => vi.clearAllMocks())
	it('preserves a real OpenCritic attribution and the current provider in a v2 review', async () => {
		request.mockResolvedValue(preview); expect(await previewGameMetadata(51, lookup)).toBe(preview); expect(request).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('/51/metadata/preview'), { method: 'POST', body: lookup, signal: undefined, timeout: 30000 })
	})
	it('accepts a canonical Metacritic badge from Deku while retaining its listed-platform warning', async () => {
		const attributed = { ...preview, fields: [{ ...critic, criticProvider: 'Metacritic', value: 93, criticUrl: 'https://www.metacritic.com/game/hades/' }] }
		request.mockResolvedValue(attributed); expect(await previewGameMetadata(51, lookup)).toBe(attributed)
	})
	it.each([
		{ criticProvider: 'SteamDB' }, { criticProvider: undefined }, { criticScope: undefined }, { criticScope: 'steam-edition' },
		{ criticUrl: 'https://www.metacritic.com/game/hollow-knight/' }, { criticUrl: 'https://opencritic.com.evil.invalid/game/3985/hollow-knight' },
		{ criticUrl: 'javascript:alert(1)' }, { criticUrl: 'https://fixture:password@opencritic.com/game/3985/hollow-knight' },
		{ criticUrl: 'https://opencritic.com/game/3985/hollow-knight?redirect=1' }, { criticUrl: undefined },
		{ source: 'wikidata' }, { source: 'steam', criticScope: 'steam-edition' }, { value: 8.9 }, { value: 101 },
		{ current: 89, unchanged: true, currentCriticProvider: 'Metacritic' },
	])('rejects invalid provider, URL, edition or no-op evidence %#', overrides => {
		request.mockResolvedValue({ ...preview, fields: [{ ...critic, ...overrides }] }); return expect(previewGameMetadata(51, lookup)).rejects.toThrow('Invalid metadata preview')
	})
	it('keeps new critic/artwork/duration groups opted out even if an old server ignores switches', async () => {
		request.mockResolvedValue({ ...preview, fields: [critic, { field: 'hero', current: null, value: 'https://shared.akamai.steamstatic.com/hero.jpg', source: 'steam', url: 'https://store.steampowered.com/app/100/' }, { field: 'story', current: null, value: 24, sourceHours: 23.5, source: 'dekudeals', url: critic.url }] })
		expect((await previewGameMetadata(51, { ...lookup, includeCritic: false, includeArtwork: false, includeDurations: false })).fields).toEqual([])
	})
	it('accepts legacy Steam-Metacritic reviews without inventing a Deku v1 capability', async () => {
		request.mockResolvedValueOnce({ ...preview, reviewVersion: undefined, fields: [{ field: 'critic', current: null, value: 87, source: 'steam', url: 'https://store.steampowered.com/app/367520/' }] }).mockResolvedValueOnce({ ...preview, reviewVersion: 1 })
		expect((await previewGameMetadata(51, lookup)).fields[0].value).toBe(87); await expect(previewGameMetadata(51, lookup)).rejects.toThrow('Invalid metadata preview')
	})
	it('does not present a different overwrite scope than the explicitly requested review', async () => {
		request.mockResolvedValue({ ...preview, overwrite: false }); await expect(previewGameMetadata(51, lookup)).rejects.toThrow('Invalid metadata preview')
	})
	it('bounds a protected save without adding an automatic mutation retry', async () => {
		const signal = new AbortController().signal
		request.mockRejectedValue(new Error('Synthetic uncertain save'))
		await expect(applyGameMetadata(51, preview.token, ['critic'], signal)).rejects.toThrow('Synthetic uncertain save')
		expect(request).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('/51/metadata/apply'), { method: 'POST', body: { token: preview.token, fields: ['critic'] }, signal, timeout: 30000 })
	})
	it.each(['launchbox', 'steamgriddb', 'nintendo'])('accepts %s artwork but does not let an artwork source invent a critic or catalog fact', async source => {
		const image = { field: 'cover', current: null, value: 'https://images.launchbox-app.com/11111111-1111-4111-8111-111111111111.png', source, url: 'https://www.steamgriddb.com/game/10' }
		request.mockResolvedValueOnce({ ...preview, fields: [image] }); expect((await previewGameMetadata(51, lookup)).fields).toEqual([image])
		for (const field of ['critic', 'developer', 'released']) { request.mockResolvedValueOnce({ ...preview, fields: [{ ...image, field }] }); await expect(previewGameMetadata(51, lookup)).rejects.toThrow('Invalid metadata preview') }
	})
	it.each([{ releaseYear: '2026' }, { releaseYear: 0 }, { platforms: [''] }, { platforms: [3] }, { platforms: 'PlayStation 5' }])('rejects malformed edition evidence %#', overrides => {
		request.mockResolvedValue({ ...preview, matches: [{ source: 'wikidata', name: 'Verified game', url: 'https://www.wikidata.org/wiki/Q123', ...overrides }] }); return expect(previewGameMetadata(51, lookup)).rejects.toThrow('Invalid metadata preview')
	})
})
