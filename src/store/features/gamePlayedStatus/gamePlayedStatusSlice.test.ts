import { describe, it, expect, beforeEach } from 'vitest'
import gamePlayedStatusReducer from './gamePlayedStatusSlice'
import { fetchPlayedStatuses, fetchActivePlayedStatuses, createPlayedStatus, updatePlayedStatus, deletePlayedStatus } from './thunk'
import { selectPlayedStatuses, selectActivePlayedStatuses, selectPlayedLoading, selectPlayedError, selectPlayedById } from './selector'
import { createGamePlayedStatus, resetIdCounter } from '@/test/factories'
import { createTestStore } from '@/test/utils/createTestStore'

function makePagedResult(items = [createGamePlayedStatus()]) {
	return { data: items, page: 1, pageSize: 50, totalCount: items.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
}

const initialState = gamePlayedStatusReducer(undefined, { type: '@@INIT' })

describe('gamePlayedStatusSlice — initial state', () => {
	it('starts with empty lists', () => {
		expect(initialState.playedStatuses).toEqual([])
		expect(initialState.activePlayedStatuses).toEqual([])
		expect(initialState.loading).toBe(false)
		expect(initialState.error).toBeNull()
	})
})

describe('gamePlayedStatusSlice — sync reducers', () => {
	beforeEach(() => resetIdCounter())

	it('addPlayedStatus adds to list', () => {
		const p = createGamePlayedStatus({ id: 1, isActive: false })
		const next = gamePlayedStatusReducer(initialState, { type: 'gamePlayedStatus/addPlayedStatus', payload: p })
		expect(next.playedStatuses).toHaveLength(1)
		expect(next.activePlayedStatuses).toHaveLength(0)
	})

	it('addPlayedStatus adds to active list when isActive=true', () => {
		const p = createGamePlayedStatus({ id: 2, isActive: true })
		const next = gamePlayedStatusReducer(initialState, { type: 'gamePlayedStatus/addPlayedStatus', payload: p })
		expect(next.activePlayedStatuses).toHaveLength(1)
	})

	it('removePlayedStatus removes from both lists', () => {
		const p = createGamePlayedStatus({ id: 5, isActive: true })
		let state = gamePlayedStatusReducer(initialState, { type: 'gamePlayedStatus/addPlayedStatus', payload: p })
		state = gamePlayedStatusReducer(state, { type: 'gamePlayedStatus/removePlayedStatus', payload: 5 })
		expect(state.playedStatuses.find((x) => x.id === 5)).toBeUndefined()
		expect(state.activePlayedStatuses.find((x) => x.id === 5)).toBeUndefined()
	})
})

describe('gamePlayedStatusSlice — extraReducers', () => {
	beforeEach(() => resetIdCounter())

	it('fetchPlayedStatuses.pending sets loading=true', () => {
		expect(gamePlayedStatusReducer(initialState, fetchPlayedStatuses.pending('', {})).loading).toBe(true)
	})

	it('fetchPlayedStatuses.fulfilled populates playedStatuses', () => {
		const items = [createGamePlayedStatus({ id: 1 }), createGamePlayedStatus({ id: 2 })]
		const next = gamePlayedStatusReducer(initialState, fetchPlayedStatuses.fulfilled(makePagedResult(items), '', {}))
		expect(next.playedStatuses).toHaveLength(2)
		expect(next.loading).toBe(false)
	})

	it('fetchPlayedStatuses.rejected sets error', () => {
		const next = gamePlayedStatusReducer(initialState, fetchPlayedStatuses.rejected(null, '', {}, 'err'))
		expect(next.error).toBe('err')
	})

	it('fetchActivePlayedStatuses.fulfilled populates activePlayedStatuses', () => {
		const items = [createGamePlayedStatus({ id: 3, isActive: true })]
		const next = gamePlayedStatusReducer(initialState, fetchActivePlayedStatuses.fulfilled(items, '', undefined))
		expect(next.activePlayedStatuses).toHaveLength(1)
	})

	it('createPlayedStatus.fulfilled adds status', () => {
		const p = createGamePlayedStatus({ id: 10 })
		const next = gamePlayedStatusReducer(initialState, createPlayedStatus.fulfilled(p, '', { name: p.name, isActive: true, color: p.color }))
		expect(next.playedStatuses).toHaveLength(1)
	})

	it('updatePlayedStatus.fulfilled updates status in list', () => {
		const original = createGamePlayedStatus({ id: 1, name: 'Old' })
		const state = gamePlayedStatusReducer(initialState, fetchPlayedStatuses.fulfilled(makePagedResult([original]), '', {}))
		const updated = createGamePlayedStatus({ id: 1, name: 'New' })
		const next = gamePlayedStatusReducer(state, updatePlayedStatus.fulfilled(updated, '', { id: 1, data: { id: 1, name: 'New', isActive: true } }))
		expect(next.playedStatuses[0].name).toBe('New')
	})

	it('deletePlayedStatus.fulfilled removes status', () => {
		const p = createGamePlayedStatus({ id: 7 })
		const state = gamePlayedStatusReducer(initialState, fetchPlayedStatuses.fulfilled(makePagedResult([p]), '', {}))
		const next = gamePlayedStatusReducer(state, deletePlayedStatus.fulfilled(7, '', 7))
		expect(next.playedStatuses.find((x) => x.id === 7)).toBeUndefined()
	})

	it('fetchActivePlayedStatuses.pending sets loading=true', () => {
		const next = gamePlayedStatusReducer(initialState, fetchActivePlayedStatuses.pending('', undefined))
		expect(next.loading).toBe(true)
	})

	it('fetchActivePlayedStatuses.rejected sets error', () => {
		const next = gamePlayedStatusReducer(initialState, fetchActivePlayedStatuses.rejected(null, '', undefined, 'active error'))
		expect(next.error).toBe('active error')
		expect(next.loading).toBe(false)
	})

	it('createPlayedStatus.pending sets loading=true', () => {
		const next = gamePlayedStatusReducer(initialState, createPlayedStatus.pending('', { name: 'X', isActive: true, color: '#FFF' }))
		expect(next.loading).toBe(true)
	})

	it('createPlayedStatus.rejected sets error', () => {
		const next = gamePlayedStatusReducer(initialState, createPlayedStatus.rejected(null, '', { name: 'X', isActive: true, color: '#FFF' }, 'create error'))
		expect(next.error).toBe('create error')
	})

	it('updatePlayedStatus.pending sets loading=true', () => {
		const next = gamePlayedStatusReducer(initialState, updatePlayedStatus.pending('', { id: 1, data: { id: 1, name: 'X', isActive: true } }))
		expect(next.loading).toBe(true)
	})

	it('updatePlayedStatus.rejected sets error', () => {
		const next = gamePlayedStatusReducer(initialState, updatePlayedStatus.rejected(null, '', { id: 1, data: { id: 1, name: 'X', isActive: true } }, 'update error'))
		expect(next.error).toBe('update error')
	})

	it('deletePlayedStatus.pending sets loading=true', () => {
		const next = gamePlayedStatusReducer(initialState, deletePlayedStatus.pending('', 1))
		expect(next.loading).toBe(true)
	})

	it('deletePlayedStatus.rejected sets error', () => {
		const next = gamePlayedStatusReducer(initialState, deletePlayedStatus.rejected(null, '', 1, 'delete error'))
		expect(next.error).toBe('delete error')
	})
})

describe('gamePlayedStatusSlice — sync reducers (extended)', () => {
	beforeEach(() => resetIdCounter())

	it('setCurrentPlayedStatus sets and clears', () => {
		const p = createGamePlayedStatus({ id: 1 })
		let state = gamePlayedStatusReducer(initialState, { type: 'gamePlayedStatus/setCurrentPlayedStatus', payload: p })
		expect(state.currentPlayedStatus).toEqual(p)
		state = gamePlayedStatusReducer(state, { type: 'gamePlayedStatus/setCurrentPlayedStatus', payload: null })
		expect(state.currentPlayedStatus).toBeNull()
	})

	it('updatePlayedStatus reducer — adds to active when newly activated', () => {
		const p = createGamePlayedStatus({ id: 1, isActive: false })
		let state = gamePlayedStatusReducer(initialState, { type: 'gamePlayedStatus/addPlayedStatus', payload: p })
		const updated = { ...p, isActive: true }
		state = gamePlayedStatusReducer(state, { type: 'gamePlayedStatus/updatePlayedStatus', payload: updated })
		expect(state.activePlayedStatuses).toHaveLength(1)
	})

	it('updatePlayedStatus reducer — removes from active when deactivated', () => {
		const p = createGamePlayedStatus({ id: 1, isActive: true })
		let state = gamePlayedStatusReducer(initialState, { type: 'gamePlayedStatus/addPlayedStatus', payload: p })
		const updated = { ...p, isActive: false }
		state = gamePlayedStatusReducer(state, { type: 'gamePlayedStatus/updatePlayedStatus', payload: updated })
		expect(state.activePlayedStatuses).toHaveLength(0)
	})

	it('updatePlayedStatus reducer — updates existing active in place', () => {
		const p = createGamePlayedStatus({ id: 1, name: 'Old', isActive: true })
		let state = gamePlayedStatusReducer(initialState, { type: 'gamePlayedStatus/addPlayedStatus', payload: p })
		const updated = { ...p, name: 'New', isActive: true }
		state = gamePlayedStatusReducer(state, { type: 'gamePlayedStatus/updatePlayedStatus', payload: updated })
		expect(state.activePlayedStatuses[0].name).toBe('New')
	})

	it('setFilters sets filters', () => {
		const next = gamePlayedStatusReducer(initialState, { type: 'gamePlayedStatus/setFilters', payload: { search: 'done' } })
		expect(next.filters).toEqual({ search: 'done' })
	})

	it('clearFilters clears filters', () => {
		let state = gamePlayedStatusReducer(initialState, { type: 'gamePlayedStatus/setFilters', payload: { search: 'x' } })
		state = gamePlayedStatusReducer(state, { type: 'gamePlayedStatus/clearFilters' })
		expect(state.filters).toEqual({})
	})

	it('setPagination merges pagination', () => {
		const next = gamePlayedStatusReducer(initialState, { type: 'gamePlayedStatus/setPagination', payload: { page: 4 } })
		expect(next.pagination.page).toBe(4)
		expect(next.pagination.pageSize).toBe(initialState.pagination.pageSize)
	})

	it('reset returns to initial state', () => {
		const p = createGamePlayedStatus({ id: 1 })
		let state = gamePlayedStatusReducer(initialState, { type: 'gamePlayedStatus/addPlayedStatus', payload: p })
		state = gamePlayedStatusReducer(state, { type: 'gamePlayedStatus/reset' })
		expect(state).toEqual(initialState)
	})
})

describe('gamePlayedStatusSlice — updatePlayedStatusThunk.fulfilled branches', () => {
	beforeEach(() => resetIdCounter())

	it('adds to active list when item becomes active', () => {
		const original = createGamePlayedStatus({ id: 1, isActive: false })
		let state = gamePlayedStatusReducer(initialState, fetchPlayedStatuses.fulfilled(makePagedResult([original]), '', {}))
		const updated = { ...original, isActive: true }
		state = gamePlayedStatusReducer(state, updatePlayedStatus.fulfilled(updated, '', { id: 1, data: { id: 1, name: original.name, isActive: true } }))
		expect(state.activePlayedStatuses).toHaveLength(1)
	})

	it('removes from active list when deactivated', () => {
		const original = createGamePlayedStatus({ id: 1, isActive: true })
		let state = gamePlayedStatusReducer(initialState, fetchPlayedStatuses.fulfilled(makePagedResult([original]), '', {}))
		state = gamePlayedStatusReducer(state, fetchActivePlayedStatuses.fulfilled([original], '', undefined))
		const updated = { ...original, isActive: false }
		state = gamePlayedStatusReducer(state, updatePlayedStatus.fulfilled(updated, '', { id: 1, data: { id: 1, name: original.name, isActive: false } }))
		expect(state.activePlayedStatuses).toHaveLength(0)
	})

	it('updates existing active item in place', () => {
		const original = createGamePlayedStatus({ id: 1, name: 'Old', isActive: true })
		let state = gamePlayedStatusReducer(initialState, fetchPlayedStatuses.fulfilled(makePagedResult([original]), '', {}))
		state = gamePlayedStatusReducer(state, fetchActivePlayedStatuses.fulfilled([original], '', undefined))
		const updated = { ...original, name: 'New', isActive: true }
		state = gamePlayedStatusReducer(state, updatePlayedStatus.fulfilled(updated, '', { id: 1, data: { id: 1, name: 'New', isActive: true } }))
		expect(state.activePlayedStatuses).toHaveLength(1)
		expect(state.activePlayedStatuses[0].name).toBe('New')
	})

	it('createPlayedStatus.fulfilled adds inactive item only to main list', () => {
		const p = createGamePlayedStatus({ id: 10, isActive: false })
		const next = gamePlayedStatusReducer(initialState, createPlayedStatus.fulfilled(p, '', { name: p.name, isActive: false, color: p.color }))
		expect(next.playedStatuses).toHaveLength(1)
		expect(next.activePlayedStatuses).toHaveLength(0)
	})

	it('createPlayedStatus.fulfilled adds active item to both lists', () => {
		const p = createGamePlayedStatus({ id: 10, isActive: true })
		const next = gamePlayedStatusReducer(initialState, createPlayedStatus.fulfilled(p, '', { name: p.name, isActive: true, color: p.color }))
		expect(next.playedStatuses).toHaveLength(1)
		expect(next.activePlayedStatuses).toHaveLength(1)
	})
})

describe('gamePlayedStatusSlice — selectors', () => {
	it('selectors read correct state', () => {
		const items = [createGamePlayedStatus({ id: 1 }), createGamePlayedStatus({ id: 2 })]
		const store = createTestStore({
			gamePlayedStatus: { ...initialState, playedStatuses: items, activePlayedStatuses: [items[0]], loading: true, error: 'e' },
		})
		const s = store.getState()
		expect(selectPlayedStatuses(s)).toHaveLength(2)
		expect(selectActivePlayedStatuses(s)).toHaveLength(1)
		expect(selectPlayedLoading(s)).toBe(true)
		expect(selectPlayedError(s)).toBe('e')
		expect(selectPlayedById(s, 2)?.id).toBe(2)
		expect(selectPlayedById(s, 99)).toBeNull()
	})
})
