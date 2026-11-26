import { describe, expect, it } from 'vitest'
import { collectionTemplateRules, homeRowFromTemplate, playlistFromTemplate } from './collectionTemplates'
import { describePlaylistRules } from './playlistRules'

const t = (key: string) => key
describe('opt-in collection template drafts', () => {
	it('uses real favorites and fresh independent rule arrays', () => {
		const first = collectionTemplateRules('favorites'), second = collectionTemplateRules('favorites')
		expect(first.favorite).toBe(true)
		first.statusIds.push(7)
		expect(second.statusIds).toEqual([])
		expect(second.nameSearch).toBeUndefined()
	})
	it('uses a semantic playing rule rather than translated labels, fixed catalog IDs or Focus', () => {
		const rules = collectionTemplateRules('playingNow')
		expect(rules.playingNow).toBe(true)
		expect(rules.statusIds).toEqual([])
		expect(rules.search).toBeUndefined()
		expect(homeRowFromTemplate('playingNow', 'test-row', t).source).toEqual({ kind: 'playingNow' })
	})
	it('saves a rolling release rule and timezone, never a fixed date or a year/window/limit', () => {
		const rules = collectionTemplateRules('upcoming', 'Pacific/Kiritimati')
		expect(rules).toMatchObject({ upcomingReleases: true, releaseTimeZone: 'Pacific/Kiritimati', sortBy: 'Released', sortDescending: false })
		expect(rules.releasedFromYear).toBeUndefined()
		expect(rules.releasedToYear).toBeUndefined()
		expect(rules.limit).toBeUndefined()
		expect(JSON.stringify(rules)).not.toMatch(/\d{4}-\d{2}-\d{2}/)
	})
	it.each(['favorites', 'playingNow', 'upcoming'] as const)('creates an editable unlimited %s playlist draft with no sample games or fixed IDs', id => {
		const draft = playlistFromTemplate(id, t, 'UTC')
		expect(draft.isAutomatic).toBe(true)
		expect(draft.maxLength).toBeNull()
		expect(draft.name).toBe(`gallery.templates.${id}.title`)
		expect(draft.rules?.orderedGameIds).toEqual([])
		expect(draft.rules?.limit).toBeUndefined()
	})
	it('makes Home filters independent of playlists and keeps preview size out of the membership rule', () => {
		const row = homeRowFromTemplate('upcoming', 'upcoming-row', t, 'Europe/Madrid')
		expect(row).toMatchObject({ id: 'upcoming-row', enabled: true, previewCount: 12, source: { kind: 'filter', rules: { upcomingReleases: true, releaseTimeZone: 'Europe/Madrid' } } })
		expect('playlistId' in row.source).toBe(false)
		if (row.source.kind === 'filter') expect(row.source.rules.limit).toBeUndefined()
	})
	it('describes the semantic rules rather than incorrectly reporting all library', () => {
		expect(describePlaylistRules(collectionTemplateRules('playingNow'), t)).toContain('gallery.rules.playingNow')
		expect(describePlaylistRules(collectionTemplateRules('upcoming', 'UTC'), t)).toContain('gallery.rules.upcomingSummary')
	})
})
