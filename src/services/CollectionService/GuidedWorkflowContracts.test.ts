import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { changeTutorialSamples, createTutorialSamples, getOnboarding, saveOnboarding, startOnboarding } from './OnboardingService'
import { applyGameMetadata, previewGameMetadata } from '@/services/GamesService/GameMetadataService'

const API = 'https://localhost:7245/api'
const state = { version: '3.0.0', revision: 7, enabled: true, step: 'library', sampleGames: [], samplePlaylists: 0, sampleLists: [] }
const preview = { overwrite: false, token: 'fixture-review-not-authentication', matches: [], notices: ['durationUnavailable'], fields: [{ field: 'developer', current: null, value: 'Verified fixture studio', source: 'steam', url: 'https://store.steampowered.com/app/100/' }] }
const review = { revision: 7, confirm: true as const, removeEditedSamples: false, expectedGames: [], expectedPlaylists: [] }

describe('guided workflow transport contracts (not backend authorization proof)', () => {
	beforeEach(() => {
		server.use(http.get(`${API}/onboarding`, () => HttpResponse.json(state)), http.post(`${API}/games/51/metadata/preview`, () => HttpResponse.json(preview)))
	})
	it('reads the owned guide without creating sample records', async () => {
		expect(await getOnboarding()).toEqual(state)
	})
	it.each([
		{ ...state, revision: -1 }, { ...state, revision: 1.5 }, { ...state, enabled: 'yes' }, { ...state, step: 'unknown' },
		{ ...state, sampleGames: null }, { ...state, sampleGames: Array(65).fill({}) }, { ...state, samplePlaylists: -1 }, { ...state, sampleLists: undefined }, { ...state, samplePlaylists: 1 },
	])('rejects malformed guide state instead of showing a false chapter or cleanup scope', async value => {
		server.use(http.get(`${API}/onboarding`, () => HttpResponse.json(value)))
		await expect(getOnboarding()).rejects.toThrow('Invalid guide response')
	})
	it('sends exact explicit start, progress and sample-creation requests', async () => {
		const seen: unknown[] = []
		server.use(
			http.post(`${API}/onboarding/start`, async ({ request }) => { seen.push(await request.json()); return HttpResponse.json(state) }),
			http.put(`${API}/onboarding`, async ({ request }) => { seen.push(await request.json()); return HttpResponse.json(state) }),
			http.post(`${API}/onboarding/samples`, async ({ request }) => { seen.push(await request.json()); return HttpResponse.json(state) }),
		)
		await startOnboarding(7, false); await saveOnboarding(7, 'progress', false, false); await createTutorialSamples(7)
		expect(seen).toEqual([{ revision: 7, restart: false }, { revision: 7, step: 'progress', enabled: false, complete: false }, { revision: 7, confirm: true }])
	})
	it.each([false, true])('keeps the reviewed cleanup body and distinct keep/remove endpoint (remove=%s)', async remove => {
		server.use(http[remove ? 'delete' : 'post'](`${API}/onboarding/samples${remove ? '' : '/keep'}`, async ({ request }) => { expect(await request.json()).toEqual(review); return HttpResponse.json({ state, removedGames: 0, keptGames: 0, removedPlaylists: 0, keptPlaylists: 0 }) }))
		expect((await changeTutorialSamples(review, remove)).state).toEqual(state)
	})
	it('sends metadata choices and returns a review without applying it', async () => {
		server.use(http.post(`${API}/games/51/metadata/preview`, async ({ request }) => { expect(await request.json()).toEqual({ overwrite: false, includeArtwork: true }); return HttpResponse.json(preview) }))
		expect(await previewGameMetadata(51, { overwrite: false, includeArtwork: true })).toEqual(preview)
	})
	it.each([
		{ ...preview, overwrite: 'yes' }, { ...preview, fields: null }, { ...preview, fields: Array(8).fill(preview.fields[0]) }, { ...preview, matches: Array(13).fill({}) },
		{ ...preview, fields: [{ ...preview.fields[0], field: 'story', value: 999 }] }, { ...preview, fields: [{ ...preview.fields[0], current: {} }] },
		{ ...preview, fields: [preview.fields[0], preview.fields[0]] }, { ...preview, fields: [{ ...preview.fields[0], source: 'unverified' }] },
		{ ...preview, matches: [{ source: 'unverified', name: 'Wrong identity', url: 'https://invalid.test' }] }, { ...preview, notices: [null] },
	])('rejects malformed or unsupported metadata rather than inventing estimates or rendering unsafe values', async value => {
		server.use(http.post(`${API}/games/51/metadata/preview`, () => HttpResponse.json(value)))
		await expect(previewGameMetadata(51, { overwrite: false, includeArtwork: false })).rejects.toThrow('Invalid metadata preview')
	})
	it('applies only the signed review token and selected fields, not a stale game snapshot', async () => {
		server.use(http.post(`${API}/games/51/metadata/apply`, async ({ request }) => { expect(await request.json()).toEqual({ token: preview.token, fields: ['developer'] }); return HttpResponse.json({ game: { id: 51 }, appliedFields: ['developer'] }) }))
		expect((await applyGameMetadata(51, preview.token, ['developer'])).appliedFields).toEqual(['developer'])
	})
	it('preserves an HTTP conflict as a typed error for a visible re-review', async () => {
		server.use(http.post(`${API}/games/51/metadata/apply`, () => HttpResponse.json({ message: 'Fixture conflict' }, { status: 409 })))
		await expect(applyGameMetadata(51, preview.token, ['developer'])).rejects.toMatchObject({ status: 409 })
	})
})
