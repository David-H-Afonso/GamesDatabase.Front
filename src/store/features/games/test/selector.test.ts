import {
	selectGames,
	selectCurrentGame,
	selectGamesLoading,
	selectGamesError,
	selectGamesPagination,
	selectGamesFilters,
	selectLastAppliedFilters,
	selectIsDataFresh,
	selectNeedsRefresh,
	selectGamesState,
	selectGameById,
	selectGamesByStatus,
	selectGamesByPlatform,
} from '../selector'
import type { RootState } from '@/store'

const games = [
	{ id: 1, name: 'Zelda', statusId: 10, platformId: 20 },
	{ id: 2, name: 'Mario', statusId: 10, platformId: 30 },
	{ id: 3, name: 'Halo', statusId: 11, platformId: 20 },
]

const makeState = (overrides: Partial<RootState['games']> = {}): RootState =>
	({
		games: {
			games,
			currentGame: null,
			loading: false,
			error: null,
			pagination: { page: 1, pageSize: 50, totalCount: 3 },
			filters: {},
			lastAppliedFilters: null,
			isDataFresh: true,
			needsRefresh: false,
			...overrides,
		},
	}) as unknown as RootState

describe('games selectors', () => {
	it('selectGames returns games array', () => {
		expect(selectGames(makeState())).toEqual(games)
	})

	it('selectCurrentGame returns null by default', () => {
		expect(selectCurrentGame(makeState())).toBeNull()
	})

	it('selectGamesLoading returns loading flag', () => {
		expect(selectGamesLoading(makeState({ loading: true }))).toBe(true)
	})

	it('selectGamesError returns error', () => {
		expect(selectGamesError(makeState({ error: 'fail' }))).toBe('fail')
	})

	it('selectGamesPagination returns pagination', () => {
		expect(selectGamesPagination(makeState())).toEqual({ page: 1, pageSize: 50, totalCount: 3 })
	})

	it('selectGamesFilters returns filters', () => {
		expect(selectGamesFilters(makeState({ filters: { search: 'test' } as any }))).toEqual({ search: 'test' })
	})

	it('selectLastAppliedFilters returns lastAppliedFilters', () => {
		expect(selectLastAppliedFilters(makeState())).toBeNull()
	})

	it('selectIsDataFresh returns isDataFresh', () => {
		expect(selectIsDataFresh(makeState())).toBe(true)
	})

	it('selectNeedsRefresh returns needsRefresh', () => {
		expect(selectNeedsRefresh(makeState({ needsRefresh: true }))).toBe(true)
	})

	it('selectGamesState returns full slice', () => {
		expect(selectGamesState(makeState())).toEqual(expect.objectContaining({ games }))
	})

	it('selectGameById finds game by id', () => {
		expect(selectGameById(2)(makeState())).toEqual(games[1])
	})

	it('selectGameById returns undefined for missing id', () => {
		expect(selectGameById(999)(makeState())).toBeUndefined()
	})

	it('selectGamesByStatus filters by statusId', () => {
		const result = selectGamesByStatus(10)(makeState())
		expect(result).toHaveLength(2)
		expect(result.map((g: any) => g.name)).toEqual(['Zelda', 'Mario'])
	})

	it('selectGamesByPlatform filters by platformId', () => {
		const result = selectGamesByPlatform(20)(makeState())
		expect(result).toHaveLength(2)
		expect(result.map((g: any) => g.name)).toEqual(['Zelda', 'Halo'])
	})
})
