import { describe, it, expect, beforeEach } from 'vitest'
import gameViewReducer from './gameViewSlice'
import type { GameViewState } from '@/models/store/GameViewState'
import { fetchGameViews, fetchPublicGameViews, createGameViewThunk, updateGameViewThunk, deleteGameViewThunk } from './thunk'
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
