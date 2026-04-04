import { describe, it, expect, beforeEach } from 'vitest'
import gameViewReducer, { setLoading, setError, updateGameView, removeGameView, setFilters, resetFilters } from './gameViewSlice'
import type { GameViewState } from '@/models/store/GameViewState'
import { fetchGameViews, fetchPublicGameViews, fetchGameViewById, createGameViewThunk, updateGameViewThunk, deleteGameViewThunk, updateGameViewConfiguration } from './thunk'
import { selectGameViews, selectPublicGameViews, selectCurrentGameView, selectGameViewsLoading, selectGameViewsError, selectGameViewById } from './selector'
import { createGameView, resetIdCounter } from '@/test/factories'
import { createTestStore } from '@/test/utils/createTestStore'

const initialState = gameViewReducer(undefined, { type: '@@INIT' }) as GameViewState

describe('gameViewSlice — initial state', () => {
	it('starts with empty lists', () => {
		expect(initialState.gameViews).toEqual([])
		expect(initialState.publicGameViews).toEqual([])
		expect(initialState.currentGameView).toBeNull()
		expect(initialState.loading).toBe(false)
		expect(initialState.error).toBeNull()
	})
})

describe('gameViewSlice — sync reducers', () => {
	beforeEach(() => resetIdCounter())

	it('setCurrentGameView sets the current view', () => {
		const view = createGameView({ id: 1 })
		const next = gameViewReducer(initialState, { type: 'gameViews/setCurrentGameView', payload: view })
		expect(next.currentGameView?.id).toBe(1)
	})

	it('addGameView prepends to gameViews', () => {
		const view = createGameView({ id: 2, isPublic: false })
		const next = gameViewReducer(initialState, { type: 'gameViews/addGameView', payload: view })
		expect(next.gameViews[0].id).toBe(2)
		expect(next.publicGameViews).toHaveLength(0)
	})

	it('addGameView also prepends to publicGameViews when isPublic=true', () => {
		const view = createGameView({ id: 3, isPublic: true })
		const next = gameViewReducer(initialState, { type: 'gameViews/addGameView', payload: view })
		expect(next.publicGameViews).toHaveLength(1)
	})

	it('removeGameView removes from both lists and clears currentGameView', () => {
		const view = createGameView({ id: 5, isPublic: true })
		let state = gameViewReducer(initialState, { type: 'gameViews/setCurrentGameView', payload: view })
		state = gameViewReducer(state, { type: 'gameViews/addGameView', payload: view })
		state = gameViewReducer(state, { type: 'gameViews/removeGameView', payload: 5 })
		expect(state.gameViews.find((v) => v.id === 5)).toBeUndefined()
		expect(state.publicGameViews.find((v) => v.id === 5)).toBeUndefined()
		expect(state.currentGameView).toBeNull()
	})

	it('resetState returns to initial state', () => {
		const view = createGameView({ id: 1 })
		let state = gameViewReducer(initialState, { type: 'gameViews/addGameView', payload: view })
		state = gameViewReducer(state, { type: 'gameViews/resetState' })
		expect(state.gameViews).toEqual([])
	})
})

describe('gameViewSlice — extraReducers', () => {
	beforeEach(() => resetIdCounter())

	it('fetchGameViews.pending sets loading=true', () => {
		expect(gameViewReducer(initialState, fetchGameViews.pending('', {})).loading).toBe(true)
	})

	it('fetchGameViews.fulfilled populates gameViews', () => {
		const items = [createGameView({ id: 1 }), createGameView({ id: 2 })]
		const next = gameViewReducer(initialState, fetchGameViews.fulfilled(items, '', {}))
		expect(next.gameViews).toHaveLength(2)
		expect(next.loading).toBe(false)
	})

	it('fetchGameViews.rejected sets error', () => {
		const next = gameViewReducer(initialState, fetchGameViews.rejected(null, '', {}, 'err'))
		expect(next.error).toBe('err')
	})

	it('fetchPublicGameViews.fulfilled populates publicGameViews', () => {
		const items = [createGameView({ id: 3, isPublic: true })]
		const next = gameViewReducer(initialState, fetchPublicGameViews.fulfilled(items, '', undefined))
		expect(next.publicGameViews).toHaveLength(1)
	})

	it('createGameViewThunk.fulfilled prepends view', () => {
		const view = createGameView({ id: 10, isPublic: false })
		const next = gameViewReducer(initialState, createGameViewThunk.fulfilled(view, '', { name: view.name, isPublic: false, configuration: view.configuration! }))
		expect(next.gameViews[0].id).toBe(10)
	})

	it('updateGameViewThunk.fulfilled updates view in list', () => {
		const original = createGameView({ id: 1, name: 'Old', isPublic: false })
		const state = gameViewReducer(initialState, fetchGameViews.fulfilled([original], '', {}))
		const updated = createGameView({ id: 1, name: 'New', isPublic: false })
		const next = gameViewReducer(state, updateGameViewThunk.fulfilled(updated, '', { id: 1, gameViewData: { id: 1, name: 'New', configuration: updated.configuration! } }))
		expect(next.gameViews[0].name).toBe('New')
	})

	it('deleteGameViewThunk.fulfilled removes view', () => {
		const view = createGameView({ id: 7 })
		const state = gameViewReducer(initialState, fetchGameViews.fulfilled([view], '', {}))
		const next = gameViewReducer(state, deleteGameViewThunk.fulfilled(7, '', 7))
		expect(next.gameViews.find((v) => v.id === 7)).toBeUndefined()
	})

	// --- Missing pending/rejected coverage ---

	it('fetchGameViewById.pending sets loading=true', () => {
		const next = gameViewReducer(initialState, fetchGameViewById.pending('', 1))
		expect(next.loading).toBe(true)
		expect(next.error).toBeNull()
	})

	it('fetchGameViewById.fulfilled sets currentGameView', () => {
		const view = createGameView({ id: 5 })
		const next = gameViewReducer(initialState, fetchGameViewById.fulfilled(view, '', 5))
		expect(next.currentGameView?.id).toBe(5)
		expect(next.loading).toBe(false)
	})

	it('fetchGameViewById.rejected sets error', () => {
		const next = gameViewReducer(initialState, fetchGameViewById.rejected(null, '', 1, 'not found'))
		expect(next.error).toBe('not found')
		expect(next.loading).toBe(false)
	})

	it('createGameViewThunk.pending sets loading=true', () => {
		const next = gameViewReducer(initialState, createGameViewThunk.pending('', { name: 'X', isPublic: true, configuration: {} as any }))
		expect(next.loading).toBe(true)
	})

	it('createGameViewThunk.rejected sets error', () => {
		const next = gameViewReducer(initialState, createGameViewThunk.rejected(null, '', { name: 'X', isPublic: true, configuration: {} as any }, 'create err'))
		expect(next.error).toBe('create err')
	})

	it('createGameViewThunk.fulfilled adds public view to publicGameViews', () => {
		const view = createGameView({ id: 20, isPublic: true })
		const next = gameViewReducer(initialState, createGameViewThunk.fulfilled(view, '', { name: view.name, isPublic: true, configuration: view.configuration! }))
		expect(next.publicGameViews[0].id).toBe(20)
	})

	it('updateGameViewThunk.pending sets loading=true', () => {
		const next = gameViewReducer(initialState, updateGameViewThunk.pending('', { id: 1, gameViewData: { id: 1, name: 'X', configuration: {} as any } }))
		expect(next.loading).toBe(true)
	})

	it('updateGameViewThunk.rejected sets error', () => {
		const next = gameViewReducer(initialState, updateGameViewThunk.rejected(null, '', { id: 1, gameViewData: { id: 1, name: 'X', configuration: {} as any } }, 'update err'))
		expect(next.error).toBe('update err')
	})

	it('updateGameViewThunk.fulfilled updates publicGameViews when isPublic changes', () => {
		const view = createGameView({ id: 1, isPublic: false })
		let state = gameViewReducer(initialState, fetchGameViews.fulfilled([view], '', {}))
		const updated = createGameView({ id: 1, isPublic: true, name: 'Now Public' })
		state = gameViewReducer(state, updateGameViewThunk.fulfilled(updated, '', { id: 1, gameViewData: { id: 1, name: 'Now Public', configuration: updated.configuration! } }))
		expect(state.publicGameViews).toHaveLength(1)
	})

	it('updateGameViewThunk.fulfilled removes from publicGameViews when no longer public', () => {
		const view = createGameView({ id: 1, isPublic: true })
		let state = gameViewReducer(initialState, fetchGameViews.fulfilled([view], '', {}))
		state = gameViewReducer(state, fetchPublicGameViews.fulfilled([view], '', undefined))
		const updated = createGameView({ id: 1, isPublic: false })
		state = gameViewReducer(state, updateGameViewThunk.fulfilled(updated, '', { id: 1, gameViewData: { id: 1, name: updated.name, configuration: updated.configuration! } }))
		expect(state.publicGameViews).toHaveLength(0)
	})

	it('updateGameViewThunk.fulfilled updates currentGameView when matching', () => {
		const view = createGameView({ id: 1 })
		let state = gameViewReducer(initialState, fetchGameViewById.fulfilled(view, '', 1))
		const updated = createGameView({ id: 1, name: 'Updated' })
		state = gameViewReducer(state, updateGameViewThunk.fulfilled(updated, '', { id: 1, gameViewData: { id: 1, name: 'Updated', configuration: updated.configuration! } }))
		expect(state.currentGameView?.name).toBe('Updated')
	})

	it('deleteGameViewThunk.pending sets loading=true', () => {
		const next = gameViewReducer(initialState, deleteGameViewThunk.pending('', 1))
		expect(next.loading).toBe(true)
	})

	it('deleteGameViewThunk.rejected sets error', () => {
		const next = gameViewReducer(initialState, deleteGameViewThunk.rejected(null, '', 1, 'delete err'))
		expect(next.error).toBe('delete err')
	})

	it('deleteGameViewThunk.fulfilled clears currentGameView when matching', () => {
		const view = createGameView({ id: 3 })
		let state = gameViewReducer(initialState, fetchGameViewById.fulfilled(view, '', 3))
		state = gameViewReducer(state, fetchGameViews.fulfilled([view], '', {}))
		state = gameViewReducer(state, deleteGameViewThunk.fulfilled(3, '', 3))
		expect(state.currentGameView).toBeNull()
	})

	it('updateGameViewConfiguration.fulfilled updates currentGameView', () => {
		const view = createGameView({ id: 8 })
		let state = gameViewReducer(initialState, fetchGameViewById.fulfilled(view, '', 8))
		state = gameViewReducer(state, fetchGameViews.fulfilled([view], '', {}))
		const updated = createGameView({ id: 8, name: 'Configured' })
		state = gameViewReducer(state, updateGameViewConfiguration.fulfilled(updated, '', { id: 8, configuration: {} }))
		expect(state.currentGameView?.name).toBe('Configured')
		expect(state.gameViews[0].name).toBe('Configured')
	})
})

describe('gameViewSlice — selectors', () => {
	it('selectors read correct state', () => {
		const items = [createGameView({ id: 1, isPublic: true }), createGameView({ id: 2, isPublic: false })]
		const store = createTestStore({
			gameViews: {
				...initialState,
				gameViews: items,
				publicGameViews: [items[0]],
				currentGameView: items[0],
				loading: true,
				error: 'e',
			},
		})
		const s = store.getState()
		expect(selectGameViews(s)).toHaveLength(2)
		expect(selectPublicGameViews(s)).toHaveLength(1)
		expect(selectCurrentGameView(s)?.id).toBe(1)
		expect(selectGameViewsLoading(s)).toBe(true)
		expect(selectGameViewsError(s)).toBe('e')
		expect(selectGameViewById(1)(s)?.id).toBe(1)
		expect(selectGameViewById(99)(s)).toBeUndefined()
	})
})

// ─── Uncovered branch tests ──────────────────────────────────

describe('gameViewSlice — uncovered branches', () => {
	beforeEach(() => resetIdCounter())

	it('setLoading sets loading', () => {
		const next = gameViewReducer(initialState, setLoading(true))
		expect(next.loading).toBe(true)
	})

	it('setError sets error', () => {
		const next = gameViewReducer(initialState, setError('problem'))
		expect(next.error).toBe('problem')
	})

	it('setFilters sets filters', () => {
		const next = gameViewReducer(initialState, setFilters({ isPublic: true }))
		expect(next.filters).toEqual({ isPublic: true })
	})

	it('resetFilters clears filters', () => {
		let state = gameViewReducer(initialState, setFilters({ isPublic: true }))
		state = gameViewReducer(state, resetFilters())
		expect(state.filters).toEqual({})
	})

	it('updateGameView updates existing public view in publicGameViews', () => {
		const view = createGameView({ id: 1, isPublic: true })
		let state: GameViewState = { ...initialState, gameViews: [view], publicGameViews: [view] }
		const updated = createGameView({ id: 1, isPublic: true, name: 'Updated' })
		state = gameViewReducer(state, updateGameView(updated))
		expect(state.gameViews[0].name).toBe('Updated')
		expect(state.publicGameViews[0].name).toBe('Updated')
	})

	it('updateGameView pushes to publicGameViews when newly public', () => {
		const view = createGameView({ id: 1, isPublic: false })
		let state: GameViewState = { ...initialState, gameViews: [view], publicGameViews: [] }
		const updated = createGameView({ id: 1, isPublic: true, name: 'Now Public' })
		state = gameViewReducer(state, updateGameView(updated))
		expect(state.publicGameViews).toHaveLength(1)
		expect(state.publicGameViews[0].name).toBe('Now Public')
	})

	it('updateGameView removes from publicGameViews when no longer public', () => {
		const view = createGameView({ id: 1, isPublic: true })
		let state: GameViewState = { ...initialState, gameViews: [view], publicGameViews: [view] }
		const updated = createGameView({ id: 1, isPublic: false })
		state = gameViewReducer(state, updateGameView(updated))
		expect(state.publicGameViews).toHaveLength(0)
	})

	it('updateGameView when id not found in main list', () => {
		const view = createGameView({ id: 1 })
		let state: GameViewState = { ...initialState, gameViews: [view] }
		const updated = createGameView({ id: 999, isPublic: false })
		state = gameViewReducer(state, updateGameView(updated))
		expect(state.gameViews).toHaveLength(1)
		expect(state.gameViews[0].id).toBe(1)
	})

	it('updateGameView updates currentGameView when matching', () => {
		const view = createGameView({ id: 1 })
		let state: GameViewState = { ...initialState, gameViews: [view], currentGameView: view }
		const updated = createGameView({ id: 1, name: 'Updated' })
		state = gameViewReducer(state, updateGameView(updated))
		expect(state.currentGameView?.name).toBe('Updated')
	})

	it('updateGameView does not change currentGameView when not matching', () => {
		const view = createGameView({ id: 1 })
		const current = createGameView({ id: 5, name: 'Other' })
		let state: GameViewState = { ...initialState, gameViews: [view], currentGameView: current }
		const updated = createGameView({ id: 1, name: 'Updated' })
		state = gameViewReducer(state, updateGameView(updated))
		expect(state.currentGameView?.id).toBe(5)
	})

	it('updateGameViewThunk.fulfilled updates existing public view in place', () => {
		const view = createGameView({ id: 1, isPublic: true })
		let state: GameViewState = {
			...initialState,
			gameViews: [view],
			publicGameViews: [view],
		}
		const updated = createGameView({ id: 1, isPublic: true, name: 'Refreshed' })
		state = gameViewReducer(state, updateGameViewThunk.fulfilled(updated, '', { id: 1, gameViewData: { id: 1, name: 'Refreshed', configuration: updated.configuration! } }))
		expect(state.publicGameViews[0].name).toBe('Refreshed')
	})

	it('updateGameViewThunk.fulfilled with null currentGameView does not error', () => {
		const view = createGameView({ id: 1, isPublic: false })
		let state: GameViewState = { ...initialState, gameViews: [view], currentGameView: null }
		const updated = createGameView({ id: 1, name: 'Up' })
		state = gameViewReducer(state, updateGameViewThunk.fulfilled(updated, '', { id: 1, gameViewData: { id: 1, name: 'Up', configuration: updated.configuration! } }))
		expect(state.currentGameView).toBeNull()
	})

	it('updateGameViewConfiguration.fulfilled with non-matching currentGameView', () => {
		const view = createGameView({ id: 8 })
		const other = createGameView({ id: 99 })
		let state = gameViewReducer(initialState, fetchGameViewById.fulfilled(other, '', 99))
		state = gameViewReducer(state, fetchGameViews.fulfilled([view], '', {}))
		const updated = createGameView({ id: 8, name: 'Configured' })
		state = gameViewReducer(state, updateGameViewConfiguration.fulfilled(updated, '', { id: 8, configuration: {} }))
		expect(state.currentGameView?.id).toBe(99)
		expect(state.gameViews[0].name).toBe('Configured')
	})

	it('deleteGameViewThunk.fulfilled with non-matching currentGameView', () => {
		const view = createGameView({ id: 3 })
		const current = createGameView({ id: 10 })
		let state: GameViewState = { ...initialState, gameViews: [view], currentGameView: current }
		state = gameViewReducer(state, deleteGameViewThunk.fulfilled(3, '', 3))
		expect(state.currentGameView?.id).toBe(10)
	})

	it('removeGameView with non-matching currentGameView', () => {
		const view = createGameView({ id: 3 })
		const current = createGameView({ id: 10 })
		let state: GameViewState = { ...initialState, gameViews: [view], currentGameView: current }
		state = gameViewReducer(state, removeGameView(3))
		expect(state.currentGameView?.id).toBe(10)
	})

	it('fetchGameViews.fulfilled with null payload defaults to empty array', () => {
		const state = gameViewReducer(initialState, fetchGameViews.fulfilled(null as any, '', {}))
		expect(state.gameViews).toEqual([])
	})

	it('fetchPublicGameViews.fulfilled with null payload defaults to empty array', () => {
		const state = gameViewReducer(initialState, fetchPublicGameViews.fulfilled(null as any, '', undefined))
		expect(state.publicGameViews).toEqual([])
	})

	it('createGameViewThunk.fulfilled with null payload does not push', () => {
		const state = gameViewReducer(initialState, createGameViewThunk.fulfilled(null as any, '', { name: 'x', isPublic: false, configuration: {} as any }))
		expect(state.gameViews).toHaveLength(0)
	})

	it('updateGameViewConfiguration.fulfilled does not update when currentGameView is null', () => {
		const view = createGameView({ id: 8 })
		let state: GameViewState = { ...initialState, gameViews: [view], currentGameView: null }
		const updated = createGameView({ id: 8, name: 'Configured' })
		state = gameViewReducer(state, updateGameViewConfiguration.fulfilled(updated, '', { id: 8, configuration: {} }))
		expect(state.currentGameView).toBeNull()
		expect(state.gameViews[0].name).toBe('Configured')
	})
})
