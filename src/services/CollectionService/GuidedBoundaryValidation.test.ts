import { beforeEach, describe, expect, it, vi } from 'vitest'
import { customFetch } from '@/utils/customFetch'
import { previewGameMetadata } from '@/services/GamesService/GameMetadataService'
import { createTutorialSamples, createTutorialViews, getOnboarding } from './OnboardingService'

vi.mock('@/utils/customFetch', () => ({ customFetch: vi.fn() }))
const request = vi.mocked(customFetch)
const guide = { version: '3.0.0', revision: 3, enabled: true, step: 'views', sampleGames: [], samplePlaylists: 0, sampleLists: [], exampleViews: [] }
const field = { field: 'story', value: 24, current: null, source: 'dekudeals', url: 'https://www.dekudeals.com/items/hades', sourceHours: 23.5 }
const identity = { source: 'dekudeals', name: 'Hades', dekuDealsSlug: 'hades', url: 'https://www.dekudeals.com/items/hades' }
const preview = { overwrite: false, token: 'synthetic-review-not-authentication', matches: [identity], notices: [], fields: [field] }

describe('untrusted guided-workflow response boundaries', () => {
	beforeEach(() => vi.clearAllMocks())
	it('accepts a source-attributed fractional estimate without silently changing its precision', async () => {
		request.mockResolvedValue(preview)
		const controller = new AbortController()
		expect(await previewGameMetadata(51, { overwrite: false, includeArtwork: false, includeDurations: true }, controller.signal)).toBe(preview)
		expect(request).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('/51/metadata/preview'), { method: 'POST', body: { overwrite: false, includeArtwork: false, includeDurations: true }, signal: controller.signal, timeout: 30000 })
		expect(field.sourceHours).toBe(23.5)
	})
	it.each([
		{ label: 'null field', candidate: null },
		{ label: 'unknown writable field', candidate: { ...field, field: 'manualPlaytimeMinutes' } },
		{ label: 'null proposed value', candidate: { ...field, value: null } },
		{ label: 'structured proposed value', candidate: { ...field, value: {} } },
		{ label: 'structured current value', candidate: { ...field, current: [] } },
		{ label: 'non-string source URL', candidate: { ...field, url: 42 } },
		{ label: 'text source hours', candidate: { ...field, sourceHours: '23.5' } },
		{ label: 'zero source hours', candidate: { ...field, sourceHours: 0 } },
		{ label: 'negative source hours', candidate: { ...field, sourceHours: -1 } },
		{ label: 'out-of-bounds source hours', candidate: { ...field, sourceHours: 100001 } },
		{ label: 'wrong duration provider', candidate: { ...field, source: 'steam' } },
		{ label: 'fractional storage proposal', candidate: { ...field, value: 23.5 } },
		{ label: 'non-positive storage proposal', candidate: { ...field, value: 0 } },
		{ label: 'missing duration evidence', candidate: { ...field, sourceHours: undefined } },
	])('rejects $label before a metadata review can present or save it', async ({ candidate }) => {
		request.mockResolvedValue({ ...preview, fields: [candidate] })
		await expect(previewGameMetadata(51, { overwrite: false, includeArtwork: false })).rejects.toThrow('Invalid metadata preview')
		expect(request).toHaveBeenCalledTimes(1)
	})
	it.each([
		{ label: 'null identity', candidate: null },
		{ label: 'missing identity name', candidate: { ...identity, name: null } },
		{ label: 'non-string identity URL', candidate: { ...identity, url: [] } },
		{ label: 'unsupported identity source', candidate: { ...identity, source: 'unverified' } },
		{ label: 'missing duration slug', candidate: { ...identity, dekuDealsSlug: undefined } },
		{ label: 'unbounded duration slug', candidate: { ...identity, dekuDealsSlug: 'a'.repeat(161) } },
		{ label: 'path-traversal duration slug', candidate: { ...identity, dekuDealsSlug: '../hades' } },
		{ label: 'noncanonical duration URL', candidate: { ...identity, url: 'https://unrelated.invalid/items/hades' } },
	])('rejects $label instead of offering an unsafe edition choice', async ({ candidate }) => {
		request.mockResolvedValue({ ...preview, matches: [candidate] })
		await expect(previewGameMetadata(51, { overwrite: false, includeArtwork: true })).rejects.toThrow('Invalid metadata preview')
	})
	it.each([
		null, Array(65).fill({ id: 1, name: 'View', isPublic: true }), [null],
		[{ id: 0, name: 'View', isPublic: true }], [{ id: 1.5, name: 'View', isPublic: true }],
		[{ id: 1, name: false, isPublic: true }], [{ id: 1, name: 'View', isPublic: 'yes' }],
	])('rejects malformed retained-view capability %# rather than rendering a false tutorial action', async exampleViews => {
		request.mockResolvedValue({ ...guide, exampleViews })
		await expect(getOnboarding()).rejects.toThrow('Invalid guide response')
	})
	it('requires the views capability for its chapter while accepting older API chapters without it', async () => {
		request.mockResolvedValueOnce({ ...guide, exampleViews: undefined }).mockResolvedValueOnce({ ...guide, step: 'library', exampleViews: undefined }).mockResolvedValueOnce(guide)
		await expect(getOnboarding()).rejects.toThrow('Invalid guide response')
		expect((await getOnboarding()).exampleViews).toBeUndefined()
		expect((await getOnboarding()).exampleViews).toEqual([])
	})
	it.each([
		{ locale: undefined, expected: 'en' }, { locale: 'es-MX', expected: 'es' }, { locale: 'fr-FR', expected: 'en' },
	])('creates views and samples only through exact explicit requests for locale $locale', async ({ locale, expected }) => {
		request.mockResolvedValue(guide)
		const controller = new AbortController()
		await createTutorialViews(3, controller.signal, locale)
		await createTutorialSamples(3, controller.signal, locale)
		expect(request).toHaveBeenNthCalledWith(1, expect.stringContaining('/onboarding/views'), { method: 'POST', body: { revision: 3, confirm: true, locale: expected }, signal: controller.signal })
		expect(request).toHaveBeenNthCalledWith(2, expect.stringContaining('/onboarding/samples'), { method: 'POST', body: { revision: 3, confirm: true, locale: expected }, signal: controller.signal })
	})
})
