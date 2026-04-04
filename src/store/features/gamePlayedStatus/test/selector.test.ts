import {
	selectPlayedStatuses,
	selectActivePlayedStatuses,
	selectPlayedLoading,
	selectPlayedError,
	selectPlayedPagination,
	selectPlayedFilters,
	selectPlayedState,
	selectPlayedById,
} from '../selector'
import type { RootState } from '@/store'

const played = [
	{ id: 1, name: 'Not Played' },
	{ id: 2, name: '100%' },
]

const makeState = (overrides: Partial<RootState['gamePlayedStatus']> = {}): RootState =>
	({
		gamePlayedStatus: {
			playedStatuses: played,
			activePlayedStatuses: played,
			loading: false,
			error: null,
			pagination: { page: 1, pageSize: 50, totalCount: 2 },
			filters: {},
			...overrides,
		},
	}) as unknown as RootState

describe('gamePlayedStatus selectors', () => {
	it('selectPlayedStatuses returns all', () => {
		expect(selectPlayedStatuses(makeState())).toEqual(played)
	})

	it('selectActivePlayedStatuses returns active', () => {
		expect(selectActivePlayedStatuses(makeState())).toEqual(played)
	})

	it('selectPlayedLoading returns loading', () => {
		expect(selectPlayedLoading(makeState({ loading: true } as any))).toBe(true)
	})

	it('selectPlayedError returns error', () => {
		expect(selectPlayedError(makeState({ error: 'err' } as any))).toBe('err')
	})

	it('selectPlayedPagination returns pagination', () => {
		expect(selectPlayedPagination(makeState())).toEqual(expect.objectContaining({ totalCount: 2 }))
	})

	it('selectPlayedFilters returns filters', () => {
		expect(selectPlayedFilters(makeState())).toEqual({})
	})

	it('selectPlayedState returns full slice', () => {
		expect(selectPlayedState(makeState())).toEqual(expect.objectContaining({ playedStatuses: played }))
	})

	it('selectPlayedById finds status', () => {
		expect(selectPlayedById(makeState(), 2)).toEqual(played[1])
	})

	it('selectPlayedById returns null for missing', () => {
		expect(selectPlayedById(makeState(), 999)).toBeNull()
	})
})
