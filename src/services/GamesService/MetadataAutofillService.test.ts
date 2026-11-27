import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createGame } from '@/test/factories'
import type { MetadataCandidate, MetadataPreview } from '@/models/api/GameMetadata'
import { autofillGameMetadata, metadataAutofillTargets, refreshGameMetadataArtwork } from './MetadataAutofillService'

const calls = vi.hoisted(() => ({ preview: vi.fn(), apply: vi.fn(), details: vi.fn() }))
vi.mock('./GameMetadataService', () => ({ previewGameMetadata: calls.preview, applyGameMetadata: calls.apply }))
vi.mock('./GamesService', () => ({ getGameById: calls.details }))
const target = { id: 51, name: 'Public catalog fixture' }
const steam = { source: 'steam', name: target.name, steamAppId: 100, url: 'https://store.steampowered.com/app/100/' }
const developer: MetadataCandidate = { field: 'developer', current: null, value: 'Verified studio', source: 'steam', url: steam.url }
const critic: MetadataCandidate = { field: 'critic', current: null, value: 91, criticProvider: 'OpenCritic', criticUrl: 'https://opencritic.com/game/100/public-fixture', criticScope: 'listed-platform', source: 'dekudeals', url: 'https://www.dekudeals.com/items/public-fixture' }
const preview = (fields: MetadataCandidate[] = [developer], overrides: Partial<MetadataPreview> = {}): MetadataPreview => ({ reviewVersion: 2, overwrite: false, token: 'fixture-review-not-authentication', matches: [steam], fields, notices: [], ...overrides })
const receipt = (fields: MetadataCandidate[], overrides: Record<string, unknown> = {}) => ({ game: createGame({ id: target.id, ...Object.fromEntries(fields.map(field => [field.field, field.value])), ...(fields.some(field => field.field === 'critic') ? { criticProvider: fields.find(field => field.field === 'critic')!.criticProvider ?? 'Metacritic' } : {}) }), appliedFields: fields.map(field => field.field), unchangedFields: [], ...overrides })
const controller = () => new AbortController()

class ImageFixture {
	static fail = false
	static hold = false
	static instances: ImageFixture[] = []
	onload: (() => void) | null = null
	onerror: (() => void) | null = null
	naturalWidth = 100
	naturalHeight = 100
	constructor() { ImageFixture.instances.push(this) }
	set src(_url: string) { if (!ImageFixture.hold) queueMicrotask(() => ImageFixture.fail ? this.onerror?.() : this.onload?.()) }
	removeAttribute = vi.fn()
}

beforeEach(() => {
	Object.values(calls).forEach(call => call.mockReset())
	calls.preview.mockResolvedValue(preview()); calls.apply.mockResolvedValue(receipt([developer])); calls.details.mockResolvedValue(createGame({ id: target.id, steamAppId: 100, cover: 'https://saved.invalid/kept.jpg' }))
	ImageFixture.fail = false; ImageFixture.hold = false; ImageFixture.instances = []; vi.stubGlobal('Image', ImageFixture)
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('explicit metadata-only autofill scope', () => {
	it('copies the exact IDs and names instead of retaining a mutable selection', () => {
		const input = [{ ...target }], scope = metadataAutofillTargets(input)
		input[0].id = 999; input[0].name = 'Changed'; input.push({ id: 1000, name: 'Added later' })
		expect(scope).toEqual([target]); expect(scope[0]).not.toBe(input[0])
	})
	it.each([
		[], Array.from({ length: 1001 }, (_, index) => ({ id: index + 1, name: 'Over limit' })), [target, target],
		[{ ...target, id: 0 }], [{ ...target, id: -1 }], [{ ...target, id: 1.5 }], [{ ...target, id: NaN }],
		[{ ...target, name: '  ' }], [{ ...target, name: 'x'.repeat(501) }], [null],
	].map(input => ({ input })))('rejects invalid or ambiguous batch scope %#', ({ input }) => { expect(() => metadataAutofillTargets(input as typeof target[])).toThrow('Invalid autofill scope') })
	it.each([false, true])('uses one exact v2 lookup and applies every reliable proposal (overwrite=%s)', async overwrite => {
		const fields = [developer, critic, { field: 'story', current: null, value: 24, sourceHours: 23.5, source: 'dekudeals', url: critic.url } as MetadataCandidate]
		calls.preview.mockResolvedValue(preview(fields, { overwrite })); calls.apply.mockResolvedValue(receipt(fields))
		const signal = controller().signal, phase = vi.fn()
		expect(await autofillGameMetadata(target, overwrite, signal, phase)).toMatchObject({ ...target, status: 'updated', appliedFields: ['developer', 'critic', 'story'] })
		expect(calls.preview).toHaveBeenCalledExactlyOnceWith(target.id, { overwrite, includeArtwork: true, includeDurations: true, includeCritic: true, reviewVersion: 2 }, signal)
		expect(calls.apply).toHaveBeenCalledExactlyOnceWith(target.id, 'fixture-review-not-authentication', ['developer', 'critic', 'story'], signal)
		expect(phase.mock.calls.flat()).toEqual(['looking', 'saving']); expect(calls.details).not.toHaveBeenCalled()
	})
	it('leaves a platform-uncertain Metacritic badge for deliberate review while saving reliable facts', async () => {
		const platformCritic: MetadataCandidate = { ...critic, criticProvider: 'Metacritic', criticUrl: 'https://www.metacritic.com/game/public-fixture/' }
		calls.preview.mockResolvedValue(preview([developer, platformCritic])); calls.apply.mockResolvedValue(receipt([developer]))
		expect(await autofillGameMetadata(target, true, controller().signal, vi.fn())).toMatchObject({ status: 'review', appliedFields: ['developer'], notices: ['criticPlatformScope'] })
		expect(calls.apply.mock.calls[0][2]).toEqual(['developer'])
	})
	it('does not apply anything when the only proposal needs a platform review', async () => {
		calls.preview.mockResolvedValue(preview([{ ...critic, criticProvider: 'Metacritic', criticUrl: 'https://www.metacritic.com/game/public-fixture/' }]))
		expect((await autofillGameMetadata(target, false, controller().signal, vi.fn())).status).toBe('review'); expect(calls.apply).not.toHaveBeenCalled()
	})
	it.each(['chooseIdentity', 'chooseDurationIdentity'])('never automatically chooses a fuzzy edition after %s', async notice => {
		calls.preview.mockResolvedValue(preview([], { token: null, notices: [notice], matches: [{ ...steam, name: 'Similar but different edition', steamAppId: 200 }] }))
		expect((await autofillGameMetadata(target, false, controller().signal, vi.fn())).status).toBe('review'); expect(calls.preview).toHaveBeenCalledOnce(); expect(calls.apply).not.toHaveBeenCalled()
	})
	it('acknowledges a verified no-op receipt without reporting an edit', async () => {
		calls.apply.mockResolvedValue(receipt([developer], { unchangedFields: ['developer'] }))
		expect((await autofillGameMetadata(target, true, controller().signal, vi.fn())).status).toBe('unchanged')
	})
	it('does not demand a platform review for an already-identical attributed rating', async () => {
		const same: MetadataCandidate = { ...critic, criticProvider: 'Metacritic', currentCriticProvider: 'Metacritic', current: 91, value: 91, unchanged: true, criticUrl: 'https://www.metacritic.com/game/public-fixture/' }
		calls.preview.mockResolvedValue(preview([same], { overwrite: true })); calls.apply.mockResolvedValue(receipt([same], { unchangedFields: ['critic'] }))
		expect(await autofillGameMetadata(target, true, controller().signal, vi.fn())).toMatchObject({ status: 'unchanged', notices: [] })
	})
	it('distinguishes no new information from a source outage', async () => {
		calls.preview.mockResolvedValueOnce(preview([], { token: null, notices: ['noChanges', 'durationUnavailable', 'criticUnavailable'] })).mockResolvedValueOnce(preview([], { token: null, notices: ['steamUnavailable'] }))
		expect((await autofillGameMetadata(target, false, controller().signal, vi.fn())).status).toBe('unchanged')
		expect((await autofillGameMetadata(target, false, controller().signal, vi.fn())).status).toBe('failed'); expect(calls.apply).not.toHaveBeenCalled()
	})
	it('keeps partially saved information retryable when a different provider failed', async () => {
		calls.preview.mockResolvedValue(preview([developer], { notices: ['durationSourceUnavailable'] }))
		expect(await autofillGameMetadata(target, false, controller().signal, vi.fn())).toMatchObject({ status: 'partial', appliedFields: ['developer'], notices: ['durationSourceUnavailable'] })
	})
	it('requires a signed plan and never retries an uncertain write automatically', async () => {
		calls.preview.mockResolvedValueOnce(preview([developer], { token: null }))
		await expect(autofillGameMetadata(target, false, controller().signal, vi.fn())).rejects.toThrow('Missing reviewed autofill plan'); expect(calls.apply).not.toHaveBeenCalled()
		calls.apply.mockRejectedValueOnce(new Error('Uncertain transport result'))
		await expect(autofillGameMetadata(target, false, controller().signal, vi.fn())).rejects.toThrow('Uncertain transport result'); expect(calls.apply).toHaveBeenCalledOnce()
	})
	it.each([
		{ label: 'wrong game', result: () => receipt([developer], { game: createGame({ id: 99, developer: 'Verified studio' }) }) },
		{ label: 'missing field receipt', result: () => receipt([developer], { appliedFields: [] }) },
		{ label: 'unrequested field', result: () => receipt([developer], { appliedFields: ['name'] }) },
		{ label: 'wrong saved value', result: () => receipt([developer], { game: createGame({ id: target.id, developer: 'Not saved' }) }) },
		{ label: 'duplicate unchanged field', result: () => receipt([developer], { unchangedFields: ['developer', 'developer'] }) },
		{ label: 'unrequested unchanged field', result: () => receipt([developer], { unchangedFields: ['name'] }) },
		{ label: 'malformed unchanged fields', result: () => receipt([developer], { unchangedFields: 'developer' }) },
	])('does not claim success for $label', async ({ result }) => {
		calls.apply.mockResolvedValue(result()); await expect(autofillGameMetadata(target, false, controller().signal, vi.fn())).rejects.toThrow('Invalid autofill save receipt')
	})
	it('binds a saved critic score to the actual provider, not only the numeric value', async () => {
		calls.preview.mockResolvedValue(preview([critic])); calls.apply.mockResolvedValue(receipt([critic], { game: createGame({ id: target.id, critic: 91, criticProvider: 'Metacritic' }) }))
		await expect(autofillGameMetadata(target, false, controller().signal, vi.fn())).rejects.toThrow('Invalid autofill save receipt')
	})
	it('cancels before starting and after a late lookup without applying any fields', async () => {
		const first = controller(); first.abort(); await expect(autofillGameMetadata(target, false, first.signal, vi.fn())).rejects.toMatchObject({ name: 'AbortError' }); expect(calls.preview).not.toHaveBeenCalled()
		const second = controller(); calls.preview.mockImplementation(async () => { second.abort(); return preview() })
		await expect(autofillGameMetadata(target, false, second.signal, vi.fn())).rejects.toMatchObject({ name: 'AbortError' }); expect(calls.apply).not.toHaveBeenCalled()
	})
	it('honors one bounded read-only 429 wait and cleans its timer', async () => {
		vi.useFakeTimers(); calls.preview.mockRejectedValueOnce({ status: 429, retryAfterSeconds: 2 })
		const phase = vi.fn(), pending = autofillGameMetadata(target, false, controller().signal, phase)
		await vi.advanceTimersByTimeAsync(1999); expect(calls.preview).toHaveBeenCalledOnce(); expect(calls.apply).not.toHaveBeenCalled()
		await vi.advanceTimersByTimeAsync(1); await expect(pending).resolves.toMatchObject({ status: 'updated' })
		expect(phase.mock.calls.flat()).toEqual(['looking', 'waiting', 'looking', 'saving']); expect(calls.preview).toHaveBeenCalledTimes(2); expect(vi.getTimerCount()).toBe(0)
	})
	it('does not loop indefinitely after another 429 or wait past cancellation', async () => {
		vi.useFakeTimers(); calls.preview.mockRejectedValue({ status: 429, retryAfterSeconds: 60 })
		const pending = autofillGameMetadata(target, false, controller().signal, vi.fn()), failed = expect(pending).rejects.toMatchObject({ status: 429 })
		await vi.advanceTimersByTimeAsync(60000); await failed; expect(calls.preview).toHaveBeenCalledTimes(2)
		const stop = controller(), cancelled = autofillGameMetadata(target, false, stop.signal, vi.fn()), aborted = expect(cancelled).rejects.toMatchObject({ name: 'AbortError' })
		await vi.advanceTimersByTimeAsync(0); stop.abort(); await aborted; expect(vi.getTimerCount()).toBe(0); expect(calls.apply).not.toHaveBeenCalled()
	})
	it('does not shorten a source Retry-After longer than the interactive wait budget', async () => {
		vi.useFakeTimers(); calls.preview.mockRejectedValue({ status: 429, retryAfterSeconds: 120 })
		await expect(autofillGameMetadata(target, false, controller().signal, vi.fn())).rejects.toMatchObject({ status: 429 }); expect(calls.preview).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0); expect(calls.apply).not.toHaveBeenCalled()
	})
})

describe('non-destructive role-only Steam artwork refresh', () => {
	const cover: MetadataCandidate = { field: 'cover', current: 'https://saved.invalid/kept.jpg', value: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/100/library_600x900.jpg', source: 'steam', url: steam.url }
	it('reads the current linked identity, loads a candidate and saves just the requested role', async () => {
		calls.preview.mockResolvedValue(preview([developer, cover])); calls.apply.mockResolvedValue(receipt([cover]))
		const signal = controller().signal
		expect(await refreshGameMetadataArtwork(target, 'cover', signal, vi.fn())).toMatchObject({ status: 'updated', appliedFields: ['cover'] })
		expect(calls.details).toHaveBeenCalledExactlyOnceWith(target.id, signal)
		expect(calls.preview).toHaveBeenCalledExactlyOnceWith(target.id, { overwrite: true, includeArtwork: true, includeDurations: false, includeCritic: false, reviewVersion: 2, steamAppId: 100 }, signal)
		expect(calls.apply).toHaveBeenCalledExactlyOnceWith(target.id, 'fixture-review-not-authentication', ['cover'], signal)
	})
	it.each([{ id: 99, steamAppId: 100 }, { id: target.id, steamAppId: undefined }, { id: target.id, steamAppId: 0 }, { id: target.id, steamAppId: 1.5 }])('refuses an unavailable or mismatched linked identity %#', async game => {
		calls.details.mockResolvedValue(createGame(game)); await expect(refreshGameMetadataArtwork(target, 'cover', controller().signal, vi.fn())).rejects.toThrow('Missing owned Steam artwork identity'); expect(calls.preview).not.toHaveBeenCalled(); expect(calls.apply).not.toHaveBeenCalled()
	})
	it.each(['failed-load', 'no-role', 'wrong-source', 'wrong-identity', 'no-token'])('retains the saved URL without any clear/restore writes for %s', async mode => {
		ImageFixture.fail = mode === 'failed-load'
		calls.preview.mockResolvedValue(preview(mode === 'no-role' ? [developer] : [{ ...cover, source: mode === 'wrong-source' ? 'wikidata' : 'steam' }], { ...(mode === 'wrong-identity' ? { matches: [{ ...steam, steamAppId: 200 }] } : {}), ...(mode === 'no-token' ? { token: null } : {}) }))
		expect(await refreshGameMetadataArtwork(target, 'cover', controller().signal, vi.fn())).toMatchObject({ status: 'failed', appliedFields: [], notices: ['artworkUnavailable'] }); expect(calls.apply).not.toHaveBeenCalled()
	})
	it('bounds a hanging image read and allows it to be stopped without a save', async () => {
		vi.useFakeTimers(); ImageFixture.hold = true; calls.preview.mockResolvedValue(preview([cover]))
		const pending = refreshGameMetadataArtwork(target, 'cover', controller().signal, vi.fn())
		await vi.advanceTimersByTimeAsync(10000); expect((await pending).status).toBe('failed'); expect(calls.apply).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0)
		const stop = controller(), cancelled = refreshGameMetadataArtwork(target, 'cover', stop.signal, vi.fn()), aborted = expect(cancelled).rejects.toMatchObject({ name: 'AbortError' })
		await vi.advanceTimersByTimeAsync(0); stop.abort(); await aborted; expect(vi.getTimerCount()).toBe(0)
	})
	it('acknowledges a same-URL role receipt instead of creating a fake edit', async () => {
		calls.preview.mockResolvedValue(preview([cover])); calls.apply.mockResolvedValue(receipt([cover], { unchangedFields: ['cover'] }))
		expect((await refreshGameMetadataArtwork(target, 'cover', controller().signal, vi.fn())).status).toBe('unchanged')
	})
})
