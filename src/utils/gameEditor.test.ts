import { describe, expect, it } from 'vitest'
import { createGame } from '@/test/factories'
import { gameEditorDraft, gameEditorPatch } from './gameEditor'

describe('Gallery game editor dirty patches', () => {
	it('does not resubmit unchanged fields, stored full date strings, or calculated scores', () => {
		const game = createGame({ name: 'Pokémon', released: '2026-03-01T00:00:00', score: 8.5, critic: 90, story: 20, manualPlaytimeMinutes: 0 })
		expect(gameEditorPatch(game, gameEditorDraft(game))).toEqual({})
	})
	it('only submits an edited comment without overwriting concurrent metadata', () => {
		const game = createGame({ comment: 'Before', critic: 90, steamAppId: 100 })
		expect(gameEditorPatch(game, { ...gameEditorDraft(game), comment: 'After' })).toEqual({ comment: 'After' })
	})
	it('keeps zero grades but restores automatic Steam when manual time is cleared or zero', () => {
		const game = createGame({ developer: 'Studio', grade: 80, manualPlaytimeMinutes: 90 })
		expect(gameEditorPatch(game, { ...gameEditorDraft(game), developer: '', grade: '0', manualHours: '0', manualMinutes: '0' })).toEqual({ developer: null, grade: 0, manualPlaytimeMinutes: null })
		expect(gameEditorPatch(game, { ...gameEditorDraft(game), manualHours: '', manualMinutes: '' })).toEqual({ manualPlaytimeMinutes: null })
	})
	it('persists additive mode as a sparse choice without changing Steam totals or estimates', () => {
		const game = createGame({ manualPlaytimeMinutes: 90, steamPlaytimeForever: 120, story: 20 })
		expect(gameEditorPatch(game, { ...gameEditorDraft(game), manualPlaytimeIsAdditive: true })).toEqual({ manualPlaytimeIsAdditive: true })
	})
	it('preserves independent artwork roles and only changes play-with membership, not selection order', () => {
		const game = createGame({ playWithIds: [1, 2], hero: 'horizontal', cover: 'vertical' })
		expect(gameEditorPatch(game, { ...gameEditorDraft(game), playWithIds: [2, 1] })).toEqual({})
		expect(gameEditorPatch(game, { ...gameEditorDraft(game), cover: '' })).toEqual({ cover: null })
	})
})
