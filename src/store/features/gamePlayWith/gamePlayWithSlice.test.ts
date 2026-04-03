import { describe, it, expect, beforeEach } from 'vitest'
import gamePlayWithReducer from './gamePlayWithSlice'
import type { GamePlayWithState } from '@/models/store/GamePlayWithState'
import { fetchPlayWithOptions, fetchActivePlayWithOptions, createPlayWith, updatePlayWith, deletePlayWith } from './thunk'
import { selectPlayWithOptions, selectActivePlayWithOptions, selectPlayWithLoading, selectPlayWithError, selectPlayWithById } from './selector'
import { createGamePlayWith, resetIdCounter } from '@/test/factories'
import { createTestStore } from '@/test/utils/createTestStore'

function makePagedResult(items = [createGamePlayWith()]) {
	return { data: items, page: 1, pageSize: 50, totalCount: items.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
}

const initialState = gamePlayWithReducer(undefined, { type: '@@INIT' }) as GamePlayWithState

describe('gamePlayWithSlice — initial state', () => {
	it('starts with empty lists', () => {
		expect(initialState.playWithOptions).toEqual([])
		expect(initialState.activePlayWithOptions).toEqual([])
		expect(initialState.loading).toBe(false)
		expect(initialState.error).toBeNull()
	})
})

describe('gamePlayWithSlice — sync reducers', () => {
	beforeEach(() => resetIdCounter())

	it('addPlayWith adds inactive option without adding to active list', () => {
		const p = createGamePlayWith({ id: 1, isActive: false })
		const next = gamePlayWithReducer(initialState, { type: 'gamePlayWith/addPlayWith', payload: p })
		expect(next.playWithOptions).toHaveLength(1)
		expect(next.activePlayWithOptions).toHaveLength(0)
	})

	it('addPlayWith adds to activePlayWithOptions when isActive=true', () => {
		const p = createGamePlayWith({ id: 2, isActive: true })
		const next = gamePlayWithReducer(initialState, { type: 'gamePlayWith/addPlayWith', payload: p })
		expect(next.activePlayWithOptions).toHaveLength(1)
	})

	it('removePlayWith removes from both lists', () => {
		const p = createGamePlayWith({ id: 5, isActive: true })
		let state = gamePlayWithReducer(initialState, { type: 'gamePlayWith/addPlayWith', payload: p })
		state = gamePlayWithReducer(state, { type: 'gamePlayWith/removePlayWith', payload: 5 })
		expect(state.playWithOptions.find((x) => x.id === 5)).toBeUndefined()
		expect(state.activePlayWithOptions.find((x) => x.id === 5)).toBeUndefined()
	})
})

describe('gamePlayWithSlice — extraReducers', () => {
	beforeEach(() => resetIdCounter())

	it('fetchPlayWithOptions.pending sets loading=true', () => {
		expect(gamePlayWithReducer(initialState, fetchPlayWithOptions.pending('', {})).loading).toBe(true)
	})

	it('fetchPlayWithOptions.fulfilled populates playWithOptions', () => {
		const items = [createGamePlayWith({ id: 1 }), createGamePlayWith({ id: 2 })]
		const next = gamePlayWithReducer(initialState, fetchPlayWithOptions.fulfilled(makePagedResult(items), '', {}))
		expect(next.playWithOptions).toHaveLength(2)
		expect(next.loading).toBe(false)
	})

	it('fetchPlayWithOptions.rejected sets error', () => {
		const next = gamePlayWithReducer(initialState, fetchPlayWithOptions.rejected(null, '', {}, 'err'))
		expect(next.error).toBe('err')
	})

	it('fetchActivePlayWithOptions.fulfilled populates activePlayWithOptions', () => {
		const items = [createGamePlayWith({ id: 3, isActive: true })]
		const next = gamePlayWithReducer(initialState, fetchActivePlayWithOptions.fulfilled(items, '', undefined))
		expect(next.activePlayWithOptions).toHaveLength(1)
	})

	it('createPlayWith.fulfilled adds option', () => {
		const p = createGamePlayWith({ id: 10 })
		const next = gamePlayWithReducer(initialState, createPlayWith.fulfilled(p, '', { name: p.name, isActive: true, color: p.color }))
		expect(next.playWithOptions).toHaveLength(1)
	})

	it('updatePlayWith.fulfilled updates option in list', () => {
		const original = createGamePlayWith({ id: 1, name: 'Old' })
		let state = gamePlayWithReducer(initialState, fetchPlayWithOptions.fulfilled(makePagedResult([original]), '', {}))
		const updated = createGamePlayWith({ id: 1, name: 'New' })
		const next = gamePlayWithReducer(state, updatePlayWith.fulfilled(updated, '', { id: 1, data: { id: 1, name: 'New', isActive: true } }))
		expect(next.playWithOptions[0].name).toBe('New')
	})

	it('deletePlayWith.fulfilled removes option', () => {
		const p = createGamePlayWith({ id: 7 })
		let state = gamePlayWithReducer(initialState, fetchPlayWithOptions.fulfilled(makePagedResult([p]), '', {}))
		const next = gamePlayWithReducer(state, deletePlayWith.fulfilled(7, '', 7))
		expect(next.playWithOptions.find((x) => x.id === 7)).toBeUndefined()
	})
})

describe('gamePlayWithSlice — selectors', () => {
	it('selectors read correct state', () => {
		const items = [createGamePlayWith({ id: 1 }), createGamePlayWith({ id: 2 })]
		const store = createTestStore({
			gamePlayWith: { ...initialState, playWithOptions: items, activePlayWithOptions: [items[0]], loading: true, error: 'e' },
		})
		const s = store.getState()
		expect(selectPlayWithOptions(s)).toHaveLength(2)
		expect(selectActivePlayWithOptions(s)).toHaveLength(1)
		expect(selectPlayWithLoading(s)).toBe(true)
		expect(selectPlayWithError(s)).toBe('e')
		expect(selectPlayWithById(2)(s)?.id).toBe(2)
		expect(selectPlayWithById(99)(s)).toBeUndefined()
	})
})
