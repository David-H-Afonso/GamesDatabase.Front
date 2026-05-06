import {
	selectGameViews,
	selectPublicGameViews,
	selectCurrentGameView,
	selectGameViewsLoading,
	selectGameViewsError,
	selectGameViewsFilters,
	selectGameViewsState,
	selectGameViewById,
} from '../selector'
import type { RootState } from '@/store'

const views = [
	{ id: 1, name: 'GOTY 2025', isPublic: true },
	{ id: 2, name: 'Next Up', isPublic: false },
]

const makeState = (overrides: Partial<RootState['gameViews']> = {}): RootState =>
	({
		gameViews: {
			gameViews: views,
			publicGameViews: [views[0]],
			currentGameView: null,
			loading: false,
			error: null,
			filters: {},
			...overrides,
		},
	}) as unknown as RootState

describe('gameViews selectors', () => {
	it('selectGameViews returns all views', () => {
		expect(selectGameViews(makeState())).toEqual(views)
	})

	it('selectPublicGameViews returns public views', () => {
		expect(selectPublicGameViews(makeState())).toEqual([views[0]])
	})

	it('selectCurrentGameView returns current view', () => {
		expect(selectCurrentGameView(makeState({ currentGameView: views[0] } as any))).toEqual(views[0])
	})

	it('selectGameViewsLoading returns loading', () => {
		expect(selectGameViewsLoading(makeState({ loading: true } as any))).toBe(true)
	})

	it('selectGameViewsError returns error', () => {
		expect(selectGameViewsError(makeState({ error: 'err' } as any))).toBe('err')
	})

	it('selectGameViewsFilters returns filters', () => {
		expect(selectGameViewsFilters(makeState())).toEqual({})
	})

	it('selectGameViewsState returns full slice', () => {
		expect(selectGameViewsState(makeState())).toEqual(expect.objectContaining({ gameViews: views }))
	})

	it('selectGameViewById finds in gameViews', () => {
		expect(selectGameViewById(2)(makeState())).toEqual(views[1])
	})

	it('selectGameViewById finds in publicGameViews fallback', () => {
		const state = makeState({ gameViews: [] } as any)
		expect(selectGameViewById(1)(state)).toEqual(views[0])
	})

	it('selectGameViewById returns undefined for missing', () => {
		expect(selectGameViewById(999)(makeState())).toBeUndefined()
	})
})
