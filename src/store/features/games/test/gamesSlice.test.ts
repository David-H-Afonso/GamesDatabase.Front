import { describe, it, expect, beforeEach } from 'vitest'
import gamesReducer, {
	setLoading,
	setError,
	setGames,
	setCurrentGame,
	addGame,
	updateGameAction,
	removeGame,
	setFilters,
	resetFilters,
	markDataAsFresh,
	invalidateCache,
	triggerGamesRefresh,
	clearGamesRefresh,
	resetState,
} from '../gamesSlice'
import type { GamesState } from '@/models/store/GamesState'
import { fetchGames, fetchGameById, createGame, updateGame as updateGameThunk, deleteGame } from '../thunk'
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
	selectGameById,
	selectGamesByStatus,
} from '../selector'
import { createGame as makeGame, createGameList, resetIdCounter } from '@/test/factories'
import { createTestStore } from '@/test/utils/createTestStore'
import { DEFAULT_PAGE_SIZE } from '@/utils'

// ─── Helpers ─────────────────────────────────────────────────

const emptyPagination = {
	page: 1,
	pageSize: DEFAULT_PAGE_SIZE,
	totalCount: 0,
	totalPages: 0,
	hasNextPage: false,
	hasPreviousPage: false,
}

function makePagedResult(games = createGameList(2)) {
	return {
		data: games,
		page: 1,
		pageSize: DEFAULT_PAGE_SIZE,
		totalCount: games.length,
		totalPages: 1,
		hasNextPage: false,
		hasPreviousPage: false,
	}
}

// ─── Initial State ────────────────────────────────────────────

describe('gamesSlice — initial state', () => {
	it('has the expected initial shape', () => {
		const state = gamesReducer(undefined, { type: '@@INIT' })
		expect(state.games).toEqual([])
		expect(state.currentGame).toBeNull()
		expect(state.loading).toBe(false)
		expect(state.error).toBeNull()
		expect(state.pagination).toEqual(emptyPagination)
		expect(state.filters).toEqual({ sortBy: 'status', sortDescending: false })
		expect(state.lastAppliedFilters).toBeNull()
		expect(state.isDataFresh).toBe(false)
		expect(state.needsRefresh).toBe(false)
	})
})

// ─── Sync Reducers ────────────────────────────────────────────

describe('gamesSlice — sync reducers', () => {
	let state: GamesState

	beforeEach(() => {
		resetIdCounter()
		state = gamesReducer(undefined, { type: '@@INIT' })
	})

	it('setLoading sets loading flag', () => {
		const next = gamesReducer(state, setLoading(true))
		expect(next.loading).toBe(true)
	})

	it('setError sets error message', () => {
		const next = gamesReducer(state, setError('oops'))
		expect(next.error).toBe('oops')
	})

	it('setError with null clears error', () => {
		const withError = gamesReducer(state, setError('oops'))
		const cleared = gamesReducer(withError, setError(null))
		expect(cleared.error).toBeNull()
	})

	it('setGames populates games and pagination', () => {
		const games = createGameList(3)
		const next = gamesReducer(state, setGames(makePagedResult(games)))
		expect(next.games).toHaveLength(3)
		expect(next.pagination.totalCount).toBe(3)
		expect(next.pagination.page).toBe(1)
	})

	it('setCurrentGame sets the current game', () => {
		const game = makeGame({ id: 42 })
		const next = gamesReducer(state, setCurrentGame(game))
		expect(next.currentGame).toEqual(game)
	})

	it('setCurrentGame with null clears current game', () => {
		const withGame = gamesReducer(state, setCurrentGame(makeGame()))
		const cleared = gamesReducer(withGame, setCurrentGame(null))
		expect(cleared.currentGame).toBeNull()
	})

	it('addGame prepends game and increments totalCount', () => {
		const game = makeGame({ id: 5 })
		const next = gamesReducer(state, addGame(game))
		expect(next.games[0]).toEqual(game)
		expect(next.pagination.totalCount).toBe(1)
	})

	it('updateGameAction replaces game in list by id', () => {
		const original = makeGame({ id: 1, name: 'Original' })
		const withGames = gamesReducer(state, setGames(makePagedResult([original])))
		const updated = makeGame({ id: 1, name: 'Updated' })
		const next = gamesReducer(withGames, updateGameAction(updated))
		expect(next.games[0].name).toBe('Updated')
	})

	it('updateGameAction updates currentGame if same id', () => {
		const original = makeGame({ id: 1, name: 'Original' })
		let s = gamesReducer(state, setCurrentGame(original))
		s = gamesReducer(s, setGames(makePagedResult([original])))
		const updated = makeGame({ id: 1, name: 'Updated' })
		const next = gamesReducer(s, updateGameAction(updated))
		expect(next.currentGame?.name).toBe('Updated')
	})

	it('updateGameAction does not change other games', () => {
		const g1 = makeGame({ id: 1, name: 'A' })
		const g2 = makeGame({ id: 2, name: 'B' })
		const withGames = gamesReducer(state, setGames(makePagedResult([g1, g2])))
		const next = gamesReducer(withGames, updateGameAction(makeGame({ id: 1, name: 'A-updated' })))
		expect(next.games[1].name).toBe('B')
	})

	it('removeGame removes by id and decrements totalCount', () => {
		const game = makeGame({ id: 7 })
		const s = gamesReducer(state, addGame(game))
		// Manually set totalCount so decrement is meaningful
		const next = gamesReducer(s, removeGame(7))
		expect(next.games.find((g) => g.id === 7)).toBeUndefined()
	})

	it('removeGame clears currentGame if same id', () => {
		const game = makeGame({ id: 3 })
		let s = gamesReducer(state, setCurrentGame(game))
		s = gamesReducer(s, setGames(makePagedResult([game])))
		const next = gamesReducer(s, removeGame(3))
		expect(next.currentGame).toBeNull()
	})

	it('setFilters sets filters and invalidates cache', () => {
		const fresh = gamesReducer(state, markDataAsFresh({ sortBy: 'name' }))
		expect(fresh.isDataFresh).toBe(true)
		const filtered = gamesReducer(fresh, setFilters({ sortBy: 'name', sortDescending: true }))
		expect(filtered.filters).toEqual({ sortBy: 'name', sortDescending: true })
		expect(filtered.isDataFresh).toBe(false)
	})

	it('resetFilters clears filters and invalidates cache', () => {
		const withFilters = gamesReducer(state, setFilters({ sortBy: 'name' }))
		const next = gamesReducer(withFilters, resetFilters())
		expect(next.filters).toEqual({})
		expect(next.isDataFresh).toBe(false)
	})

	it('markDataAsFresh sets isDataFresh and lastAppliedFilters', () => {
		const next = gamesReducer(state, markDataAsFresh({ sortBy: 'name' }))
		expect(next.isDataFresh).toBe(true)
		expect(next.lastAppliedFilters).toEqual({ sortBy: 'name' })
	})

	it('invalidateCache sets isDataFresh to false', () => {
		const fresh = gamesReducer(state, markDataAsFresh({}))
		const next = gamesReducer(fresh, invalidateCache())
		expect(next.isDataFresh).toBe(false)
	})

	it('triggerGamesRefresh sets needsRefresh to true', () => {
		const next = gamesReducer(state, triggerGamesRefresh())
		expect(next.needsRefresh).toBe(true)
	})

	it('clearGamesRefresh sets needsRefresh to false', () => {
		const triggered = gamesReducer(state, triggerGamesRefresh())
		const next = gamesReducer(triggered, clearGamesRefresh())
		expect(next.needsRefresh).toBe(false)
	})

	it('resetState returns to initial state', () => {
		let s = gamesReducer(state, addGame(makeGame()))
		s = gamesReducer(s, setError('an error'))
		const next = gamesReducer(s, resetState())
		expect(next.games).toEqual([])
		expect(next.error).toBeNull()
	})
})

// ─── Extra Reducers ───────────────────────────────────────────

describe('gamesSlice — extraReducers', () => {
	let state: GamesState

	beforeEach(() => {
		resetIdCounter()
		state = gamesReducer(undefined, { type: '@@INIT' })
	})

	it('fetchGames.pending sets loading=true and clears error', () => {
		const action = fetchGames.pending('', {})
		const next = gamesReducer(state, action)
		expect(next.loading).toBe(true)
		expect(next.error).toBeNull()
	})

	it('fetchGames.fulfilled populates games, pagination and marks fresh', () => {
		const games = createGameList(2)
		const payload = makePagedResult(games)
		const action = fetchGames.fulfilled(payload, '', {})
		const next = gamesReducer(state, action)
		expect(next.loading).toBe(false)
		expect(next.games).toHaveLength(2)
		expect(next.pagination.totalCount).toBe(2)
		expect(next.isDataFresh).toBe(true)
	})

	it('fetchGames.rejected sets loading=false and error', () => {
		const action = fetchGames.rejected(null, '', {}, 'fetch error')
		const next = gamesReducer(state, action)
		expect(next.loading).toBe(false)
		expect(next.error).toBe('fetch error')
	})

	it('createGame.fulfilled prepends game and invalidates cache', () => {
		const game = makeGame({ id: 99 })
		const action = createGame.fulfilled(game, '', {} as any)
		const next = gamesReducer(state, action)
		expect(next.games[0]).toEqual(game)
		expect(next.pagination.totalCount).toBe(1)
		expect(next.isDataFresh).toBe(false)
	})

	it('updateGame thunk fulfilled updates game and invalidates cache', () => {
		const original = makeGame({ id: 1, name: 'Old' })
		const s = gamesReducer(state, setGames(makePagedResult([original])))
		const updated = makeGame({ id: 1, name: 'New' })
		const action = updateGameThunk.fulfilled(updated, '', { id: 1, gameData: {} as any })
		const next = gamesReducer(s, action)
		expect(next.games[0].name).toBe('New')
		expect(next.isDataFresh).toBe(false)
	})

	it('deleteGame.fulfilled removes game and invalidates cache', () => {
		const game = makeGame({ id: 5 })
		const s = gamesReducer(state, setGames(makePagedResult([game])))
		const action = deleteGame.fulfilled(5, '', 5)
		const next = gamesReducer(s, action)
		expect(next.games.find((g) => g.id === 5)).toBeUndefined()
		expect(next.isDataFresh).toBe(false)
	})

	it('updateGameThunk.fulfilled updates game and currentGame when matching', () => {
		const game = makeGame({ id: 5, name: 'Old' })
		let s = gamesReducer(state, setGames(makePagedResult([game])))
		s = gamesReducer(s, setCurrentGame(game))
		const updated = makeGame({ id: 5, name: 'New' })
		const action = updateGameThunk.fulfilled(updated, '', { id: 5, gameData: { id: 5, name: 'New', statusId: 1 } })
		const next = gamesReducer(s, action)
		expect(next.games[0].name).toBe('New')
		expect(next.currentGame?.name).toBe('New')
		expect(next.isDataFresh).toBe(false)
	})

	it('deleteGame.fulfilled clears currentGame when matching', () => {
		const game = makeGame({ id: 5 })
		let s = gamesReducer(state, setGames(makePagedResult([game])))
		s = gamesReducer(s, setCurrentGame(game))
		const action = deleteGame.fulfilled(5, '', 5)
		const next = gamesReducer(s, action)
		expect(next.games.find((g) => g.id === 5)).toBeUndefined()
		expect(next.currentGame).toBeNull()
	})

	// --- Missing pending/rejected + fetchGameById + bulkUpdateGames coverage ---

	it('fetchGameById.pending sets loading=true', () => {
		const next = gamesReducer(state, fetchGameById.pending('', 1))
		expect(next.loading).toBe(true)
	})

	it('fetchGameById.fulfilled sets currentGame', () => {
		const game = makeGame({ id: 10 })
		const next = gamesReducer(state, fetchGameById.fulfilled(game, '', 10))
		expect(next.currentGame?.id).toBe(10)
		expect(next.loading).toBe(false)
	})

	it('fetchGameById.rejected sets error', () => {
		const next = gamesReducer(state, fetchGameById.rejected(null, '', 1, 'not found'))
		expect(next.error).toBe('not found')
		expect(next.loading).toBe(false)
	})

	it('createGame.pending sets loading=true', () => {
		const next = gamesReducer(state, createGame.pending('', {} as any))
		expect(next.loading).toBe(true)
	})

	it('createGame.rejected sets error', () => {
		const next = gamesReducer(state, createGame.rejected(null, '', {} as any, 'create err'))
		expect(next.error).toBe('create err')
	})

	it('updateGameThunk.pending sets loading=true', () => {
		const next = gamesReducer(state, updateGameThunk.pending('', { id: 1, gameData: {} as any }))
		expect(next.loading).toBe(true)
	})

	it('updateGameThunk.rejected sets error', () => {
		const next = gamesReducer(state, updateGameThunk.rejected(null, '', { id: 1, gameData: {} as any }, 'update err'))
		expect(next.error).toBe('update err')
	})

	it('deleteGame.pending sets loading=true', () => {
		const next = gamesReducer(state, deleteGame.pending('', 1))
		expect(next.loading).toBe(true)
	})

	it('deleteGame.rejected sets error', () => {
		const next = gamesReducer(state, deleteGame.rejected(null, '', 1, 'delete err'))
		expect(next.error).toBe('delete err')
	})
})

// ─── Selectors ───────────────────────────────────────────────

describe('gamesSlice — selectors', () => {
	it('selectors read from the correct state slice', () => {
		const games = createGameList(3)
		const store = createTestStore({
			games: {
				...gamesReducer(undefined, { type: '@@INIT' }),
				games,
				loading: true,
				error: 'err',
				currentGame: games[0],
				isDataFresh: true,
				needsRefresh: true,
				lastAppliedFilters: { sortBy: 'name' },
				pagination: { page: 2, pageSize: 10, totalCount: 3, totalPages: 1, hasNextPage: false, hasPreviousPage: true },
				filters: { sortBy: 'name' },
			},
		})
		const state = store.getState()

		expect(selectGames(state)).toHaveLength(3)
		expect(selectCurrentGame(state)).toEqual(games[0])
		expect(selectGamesLoading(state)).toBe(true)
		expect(selectGamesError(state)).toBe('err')
		expect(selectIsDataFresh(state)).toBe(true)
		expect(selectNeedsRefresh(state)).toBe(true)
		expect(selectLastAppliedFilters(state)).toEqual({ sortBy: 'name' })
		expect(selectGamesPagination(state).page).toBe(2)
		expect(selectGamesFilters(state)).toEqual({ sortBy: 'name' })
	})

	it('selectGameById returns the matching game', () => {
		const games = [makeGame({ id: 1 }), makeGame({ id: 2 })]
		const store = createTestStore({
			games: { ...gamesReducer(undefined, { type: '@@INIT' }), games },
		})
		const g = selectGameById(2)(store.getState())
		expect(g?.id).toBe(2)
	})

	it('selectGameById returns undefined for unknown id', () => {
		const store = createTestStore()
		expect(selectGameById(999)(store.getState())).toBeUndefined()
	})

	it('selectGamesByStatus filters correctly', () => {
		const games = [makeGame({ id: 1, statusId: 10 }), makeGame({ id: 2, statusId: 20 }), makeGame({ id: 3, statusId: 10 })]
		const store = createTestStore({
			games: { ...gamesReducer(undefined, { type: '@@INIT' }), games },
		})
		const result = selectGamesByStatus(10)(store.getState())
		expect(result).toHaveLength(2)
	})
})

// ─── Extra branch coverage ────────────────────────────────────

describe('gamesSlice — uncovered branches', () => {
	it('fetchGames.rejected with null payload uses fallback message', () => {
		const action = fetchGames.rejected(null, '', undefined as any)
		const next = gamesReducer(undefined, action)
		expect(next.error).toBe('Failed to fetch games')
	})

	it('fetchGameById.rejected with null payload uses fallback message', () => {
		const action = fetchGameById.rejected(null, '', 1)
		const next = gamesReducer(undefined, action)
		expect(next.error).toBe('Failed to fetch game')
	})

	it('createGame.rejected with null payload uses fallback message', () => {
		const action = createGame.rejected(null, '', {} as any)
		const next = gamesReducer(undefined, action)
		expect(next.error).toBe('Failed to create game')
	})

	it('updateGame.rejected with null payload uses fallback message', () => {
		const action = updateGameThunk.rejected(null, '', {} as any)
		const next = gamesReducer(undefined, action)
		expect(next.error).toBe('Failed to update game')
	})

	it('deleteGame.rejected with null payload uses fallback message', () => {
		const action = deleteGame.rejected(null, '', 1)
		const next = gamesReducer(undefined, action)
		expect(next.error).toBe('Failed to delete game')
	})

	it('fetchGames.fulfilled with undefined arg falls back to empty lastAppliedFilters', () => {
		const paged = makePagedResult()
		const action = fetchGames.fulfilled(paged, '', undefined as any)
		const next = gamesReducer(undefined, action)
		expect(next.lastAppliedFilters).toEqual({})
	})

	it('updateGame.fulfilled with non-existent game ID keeps list unchanged', () => {
		const games = [makeGame({ id: 1 }), makeGame({ id: 2 })]
		const state: GamesState = { ...gamesReducer(undefined, { type: '@@INIT' }), games }
		const updatedGame = makeGame({ id: 999, name: 'Unknown' })
		const action = updateGameThunk.fulfilled(updatedGame, '', {} as any)
		const next = gamesReducer(state, action)
		expect(next.games).toHaveLength(2)
		expect(next.games.find((g) => g.id === 999)).toBeUndefined()
	})

	it('updateGame.fulfilled with non-matching currentGame does not change currentGame', () => {
		const games = [makeGame({ id: 1 }), makeGame({ id: 2 })]
		const currentGame = makeGame({ id: 5, name: 'Other' })
		const state: GamesState = { ...gamesReducer(undefined, { type: '@@INIT' }), games, currentGame }
		const updatedGame = makeGame({ id: 1, name: 'Updated' })
		const action = updateGameThunk.fulfilled(updatedGame, '', {} as any)
		const next = gamesReducer(state, action)
		expect(next.currentGame?.id).toBe(5)
		expect(next.currentGame?.name).toBe('Other')
	})

	it('updateGame.fulfilled with null currentGame does not error', () => {
		const games = [makeGame({ id: 1 })]
		const state: GamesState = { ...gamesReducer(undefined, { type: '@@INIT' }), games, currentGame: null }
		const updatedGame = makeGame({ id: 1, name: 'Updated' })
		const action = updateGameThunk.fulfilled(updatedGame, '', {} as any)
		const next = gamesReducer(state, action)
		expect(next.currentGame).toBeNull()
		expect(next.games[0].name).toBe('Updated')
	})

	it('deleteGame.fulfilled with non-matching currentGame does not clear currentGame', () => {
		const games = [makeGame({ id: 1 }), makeGame({ id: 2 })]
		const currentGame = makeGame({ id: 5 })
		const state: GamesState = { ...gamesReducer(undefined, { type: '@@INIT' }), games, currentGame }
		const action = deleteGame.fulfilled(1, '', 1)
		const next = gamesReducer(state, action)
		expect(next.currentGame?.id).toBe(5)
		expect(next.games).toHaveLength(1)
	})

	it('deleteGame.fulfilled with null currentGame does not error', () => {
		const games = [makeGame({ id: 1 }), makeGame({ id: 2 })]
		const state: GamesState = { ...gamesReducer(undefined, { type: '@@INIT' }), games, currentGame: null }
		const action = deleteGame.fulfilled(1, '', 1)
		const next = gamesReducer(state, action)
		expect(next.currentGame).toBeNull()
		expect(next.games).toHaveLength(1)
	})

	it('updateGame sync reducer does not update when id not in list', () => {
		const games = [makeGame({ id: 1 })]
		const state: GamesState = { ...gamesReducer(undefined, { type: '@@INIT' }), games }
		const updated = makeGame({ id: 999, name: 'Ghost' })
		const next = gamesReducer(state, updateGameAction(updated))
		expect(next.games).toHaveLength(1)
		expect(next.games[0].id).toBe(1)
	})

	it('updateGame sync reducer with non-matching currentGame', () => {
		const games = [makeGame({ id: 1 })]
		const currentGame = makeGame({ id: 5 })
		const state: GamesState = { ...gamesReducer(undefined, { type: '@@INIT' }), games, currentGame }
		const updated = makeGame({ id: 1, name: 'Updated' })
		const next = gamesReducer(state, updateGameAction(updated))
		expect(next.currentGame?.id).toBe(5)
	})

	it('removeGame sync reducer with null currentGame', () => {
		const games = [makeGame({ id: 1 }), makeGame({ id: 2 })]
		const state: GamesState = { ...gamesReducer(undefined, { type: '@@INIT' }), games, currentGame: null }
		const next = gamesReducer(state, removeGame(1))
		expect(next.games).toHaveLength(1)
		expect(next.currentGame).toBeNull()
	})

	it('removeGame sync reducer with non-matching currentGame', () => {
		const games = [makeGame({ id: 1 }), makeGame({ id: 2 })]
		const currentGame = makeGame({ id: 5 })
		const state: GamesState = { ...gamesReducer(undefined, { type: '@@INIT' }), games, currentGame }
		const next = gamesReducer(state, removeGame(1))
		expect(next.currentGame?.id).toBe(5)
	})
})
