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
		const state = gamePlayWithReducer(initialState, fetchPlayWithOptions.fulfilled(makePagedResult([original]), '', {}))
		const updated = createGamePlayWith({ id: 1, name: 'New' })
		const next = gamePlayWithReducer(state, updatePlayWith.fulfilled(updated, '', { id: 1, data: { id: 1, name: 'New', isActive: true } }))
		expect(next.playWithOptions[0].name).toBe('New')
	})

	it('deletePlayWith.fulfilled removes option', () => {
		const p = createGamePlayWith({ id: 7 })
		const state = gamePlayWithReducer(initialState, fetchPlayWithOptions.fulfilled(makePagedResult([p]), '', {}))
		const next = gamePlayWithReducer(state, deletePlayWith.fulfilled(7, '', 7))
		expect(next.playWithOptions.find((x) => x.id === 7)).toBeUndefined()
	})

	it('fetchActivePlayWithOptions.pending sets loading=true', () => {
		const next = gamePlayWithReducer(initialState, fetchActivePlayWithOptions.pending('', undefined))
		expect(next.loading).toBe(true)
	})

	it('fetchActivePlayWithOptions.rejected sets error', () => {
		const next = gamePlayWithReducer(initialState, fetchActivePlayWithOptions.rejected(null, '', undefined, 'active error'))
		expect(next.error).toBe('active error')
		expect(next.loading).toBe(false)
	})

	it('createPlayWith.pending sets loading=true', () => {
		const next = gamePlayWithReducer(initialState, createPlayWith.pending('', { name: 'X', isActive: true, color: '#FFF' }))
		expect(next.loading).toBe(true)
	})

	it('createPlayWith.rejected sets error', () => {
		const next = gamePlayWithReducer(initialState, createPlayWith.rejected(null, '', { name: 'X', isActive: true, color: '#FFF' }, 'create error'))
		expect(next.error).toBe('create error')
	})

	it('createPlayWith.fulfilled adds active option to both lists', () => {
		const p = createGamePlayWith({ id: 10, isActive: true })
		const next = gamePlayWithReducer(initialState, createPlayWith.fulfilled(p, '', { name: p.name, isActive: true, color: p.color }))
		expect(next.playWithOptions).toHaveLength(1)
		expect(next.activePlayWithOptions).toHaveLength(1)
	})

	it('updatePlayWith.pending sets loading=true', () => {
		const next = gamePlayWithReducer(initialState, updatePlayWith.pending('', { id: 1, data: { id: 1, name: 'X', isActive: true } }))
		expect(next.loading).toBe(true)
	})

	it('updatePlayWith.rejected sets error', () => {
		const next = gamePlayWithReducer(initialState, updatePlayWith.rejected(null, '', { id: 1, data: { id: 1, name: 'X', isActive: true } }, 'update error'))
		expect(next.error).toBe('update error')
	})

	it('deletePla yWith.pending sets loading=true', () => {
		const next = gamePlayWithReducer(initialState, deletePlayWith.pending('', 1))
		expect(next.loading).toBe(true)
	})

	it('deletePlayWith.rejected sets error', () => {
		const next = gamePlayWithReducer(initialState, deletePlayWith.rejected(null, '', 1, 'delete error'))
		expect(next.error).toBe('delete error')
	})
})

describe('gamePlayWithSlice — sync reducers (extended)', () => {
	beforeEach(() => resetIdCounter())

	it('setCurrentPlayWith sets and clears', () => {
		const p = createGamePlayWith({ id: 1 })
		let state = gamePlayWithReducer(initialState, { type: 'gamePlayWith/setCurrentPlayWith', payload: p })
		expect(state.currentPlayWith).toEqual(p)
		state = gamePlayWithReducer(state, { type: 'gamePlayWith/setCurrentPlayWith', payload: null })
		expect(state.currentPlayWith).toBeNull()
	})

	it('updatePlayWith reducer — adds to active when newly activated', () => {
		const p = createGamePlayWith({ id: 1, isActive: false })
		let state = gamePlayWithReducer(initialState, { type: 'gamePlayWith/addPlayWith', payload: p })
		const updated = { ...p, isActive: true }
		state = gamePlayWithReducer(state, { type: 'gamePlayWith/updatePlayWith', payload: updated })
		expect(state.activePlayWithOptions).toHaveLength(1)
	})

	it('updatePlayWith reducer — removes from active when deactivated', () => {
		const p = createGamePlayWith({ id: 1, isActive: true })
		let state = gamePlayWithReducer(initialState, { type: 'gamePlayWith/addPlayWith', payload: p })
		const updated = { ...p, isActive: false }
		state = gamePlayWithReducer(state, { type: 'gamePlayWith/updatePlayWith', payload: updated })
		expect(state.activePlayWithOptions).toHaveLength(0)
	})

	it('updatePlayWith reducer — updates existing active in place', () => {
		const p = createGamePlayWith({ id: 1, name: 'Old', isActive: true })
		let state = gamePlayWithReducer(initialState, { type: 'gamePlayWith/addPlayWith', payload: p })
		const updated = { ...p, name: 'New', isActive: true }
		state = gamePlayWithReducer(state, { type: 'gamePlayWith/updatePlayWith', payload: updated })
		expect(state.activePlayWithOptions[0].name).toBe('New')
	})

	it('setFilters sets filters', () => {
		const next = gamePlayWithReducer(initialState, { type: 'gamePlayWith/setFilters', payload: { search: 'coop' } })
		expect(next.filters).toEqual({ search: 'coop' })
	})

	it('clearFilters clears filters', () => {
		let state = gamePlayWithReducer(initialState, { type: 'gamePlayWith/setFilters', payload: { search: 'x' } })
		state = gamePlayWithReducer(state, { type: 'gamePlayWith/clearFilters' })
		expect(state.filters).toEqual({})
	})

	it('setPagination merges pagination', () => {
		const next = gamePlayWithReducer(initialState, { type: 'gamePlayWith/setPagination', payload: { page: 3 } })
		expect(next.pagination.page).toBe(3)
		expect(next.pagination.pageSize).toBe(initialState.pagination.pageSize)
	})

	it('reset returns to initial state', () => {
		const p = createGamePlayWith({ id: 1 })
		let state = gamePlayWithReducer(initialState, { type: 'gamePlayWith/addPlayWith', payload: p })
		state = gamePlayWithReducer(state, { type: 'gamePlayWith/reset' })
		expect(state).toEqual(initialState)
	})
})

describe('gamePlayWithSlice — updatePlayWithThunk.fulfilled branches', () => {
	beforeEach(() => resetIdCounter())

	it('adds to active list when item becomes active', () => {
		const original = createGamePlayWith({ id: 1, isActive: false })
		let state = gamePlayWithReducer(initialState, fetchPlayWithOptions.fulfilled(makePagedResult([original]), '', {}))
		const updated = { ...original, isActive: true }
		state = gamePlayWithReducer(state, updatePlayWith.fulfilled(updated, '', { id: 1, data: { id: 1, name: original.name, isActive: true } }))
		expect(state.activePlayWithOptions).toHaveLength(1)
	})

	it('removes from active list when deactivated', () => {
		const original = createGamePlayWith({ id: 1, isActive: true })
		let state = gamePlayWithReducer(initialState, fetchPlayWithOptions.fulfilled(makePagedResult([original]), '', {}))
		state = gamePlayWithReducer(state, fetchActivePlayWithOptions.fulfilled([original], '', undefined))
		const updated = { ...original, isActive: false }
		state = gamePlayWithReducer(state, updatePlayWith.fulfilled(updated, '', { id: 1, data: { id: 1, name: original.name, isActive: false } }))
		expect(state.activePlayWithOptions).toHaveLength(0)
	})

	it('updates existing active item in place', () => {
		const original = createGamePlayWith({ id: 1, name: 'Old', isActive: true })
		let state = gamePlayWithReducer(initialState, fetchPlayWithOptions.fulfilled(makePagedResult([original]), '', {}))
		state = gamePlayWithReducer(state, fetchActivePlayWithOptions.fulfilled([original], '', undefined))
		const updated = { ...original, name: 'New', isActive: true }
		state = gamePlayWithReducer(state, updatePlayWith.fulfilled(updated, '', { id: 1, data: { id: 1, name: 'New', isActive: true } }))
		expect(state.activePlayWithOptions).toHaveLength(1)
		expect(state.activePlayWithOptions[0].name).toBe('New')
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
