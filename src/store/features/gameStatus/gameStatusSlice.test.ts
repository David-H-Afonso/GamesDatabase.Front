import { describe, it, expect, beforeEach } from 'vitest'
import gameStatusReducer from './gameStatusSlice'
import { fetchStatuses, fetchActiveStatuses, fetchSpecialStatuses, createStatus, updateStatus, deleteStatus, reassignSpecialStatuses } from './thunk'
import { selectStatuses, selectActiveStatuses, selectStatusLoading, selectStatusError, selectStatusById } from './selector'
import { createGameStatus, resetIdCounter } from '@/test/factories'
import { createTestStore } from '@/test/utils/createTestStore'

function makePagedResult(items = [createGameStatus()]) {
	return {
		data: items,
		page: 1,
		pageSize: 50,
		totalCount: items.length,
		totalPages: 1,
		hasNextPage: false,
		hasPreviousPage: false,
	}
}

const initialState = gameStatusReducer(undefined, { type: '@@INIT' })

describe('gameStatusSlice — initial state', () => {
	it('starts with empty lists and no loading', () => {
		expect(initialState.statuses).toEqual([])
		expect(initialState.activeStatuses).toEqual([])
		expect(initialState.loading).toBe(false)
		expect(initialState.error).toBeNull()
	})
})

describe('gameStatusSlice — sync reducers', () => {
	beforeEach(() => resetIdCounter())

	it('addStatus prepends to statuses', () => {
		const s = createGameStatus({ id: 1, isActive: false })
		const next = gameStatusReducer(initialState, { type: 'gameStatus/addStatus', payload: s })
		expect(next.statuses[0]).toEqual(s)
		expect(next.pagination.totalCount).toBe(1)
	})

	it('addStatus also adds to activeStatuses when isActive=true', () => {
		const s = createGameStatus({ id: 2, isActive: true })
		const next = gameStatusReducer(initialState, { type: 'gameStatus/addStatus', payload: s })
		expect(next.activeStatuses.some((x) => x.id === 2)).toBe(true)
	})

	it('removeStatus removes from both lists', () => {
		const s = createGameStatus({ id: 5, isActive: true })
		let state = gameStatusReducer(initialState, { type: 'gameStatus/addStatus', payload: s })
		state = gameStatusReducer(state, { type: 'gameStatus/removeStatus', payload: 5 })
		expect(state.statuses.find((x) => x.id === 5)).toBeUndefined()
		expect(state.activeStatuses.find((x) => x.id === 5)).toBeUndefined()
	})
})

describe('gameStatusSlice — extraReducers', () => {
	beforeEach(() => resetIdCounter())

	it('fetchStatuses.pending sets loading=true', () => {
		const action = fetchStatuses.pending('', {})
		const next = gameStatusReducer(initialState, action)
		expect(next.loading).toBe(true)
	})

	it('fetchStatuses.fulfilled populates statuses', () => {
		const items = [createGameStatus({ id: 1 }), createGameStatus({ id: 2 })]
		const action = fetchStatuses.fulfilled(makePagedResult(items), '', {})
		const next = gameStatusReducer(initialState, action)
		expect(next.loading).toBe(false)
		expect(next.statuses).toHaveLength(2)
		expect(next.pagination.totalCount).toBe(2)
	})

	it('fetchStatuses.rejected sets error', () => {
		const action = fetchStatuses.rejected(null, '', {}, 'fetch error')
		const next = gameStatusReducer(initialState, action)
		expect(next.loading).toBe(false)
		expect(next.error).toBe('fetch error')
	})

	it('fetchActiveStatuses.fulfilled populates activeStatuses', () => {
		const items = [createGameStatus({ id: 3, isActive: true })]
		const action = fetchActiveStatuses.fulfilled(items, '', undefined)
		const next = gameStatusReducer(initialState, action)
		expect(next.activeStatuses).toHaveLength(1)
	})

	it('createStatus.fulfilled prepends status and increments count', () => {
		const s = createGameStatus({ id: 10, isActive: false })
		const action = createStatus.fulfilled(s, '', { name: s.name, isActive: false, color: s.color, sortOrder: 1 })
		const next = gameStatusReducer(initialState, action)
		expect(next.statuses[0]).toEqual(s)
		expect(next.pagination.totalCount).toBe(1)
	})

	it('updateStatus.fulfilled replaces status in list', () => {
		const original = createGameStatus({ id: 1, name: 'Old', isActive: true })
		const state = gameStatusReducer(initialState, fetchStatuses.fulfilled(makePagedResult([original]), '', {}))
		const updated = createGameStatus({ id: 1, name: 'New', isActive: true })
		const action = updateStatus.fulfilled(updated, '', { id: 1, statusData: { id: 1, name: 'New', isActive: true } })
		const next = gameStatusReducer(state, action)
		expect(next.statuses[0].name).toBe('New')
	})

	it('deleteStatus.fulfilled removes status from both lists', () => {
		const s = createGameStatus({ id: 7, isActive: true })
		let state = gameStatusReducer(initialState, fetchStatuses.fulfilled(makePagedResult([s]), '', {}))
		state = gameStatusReducer(state, fetchActiveStatuses.fulfilled([s], '', undefined))
		const action = deleteStatus.fulfilled(7, '', 7)
		const next = gameStatusReducer(state, action)
		expect(next.statuses.find((x) => x.id === 7)).toBeUndefined()
		expect(next.activeStatuses.find((x) => x.id === 7)).toBeUndefined()
	})

	it('fetchActiveStatuses.pending sets loading=true', () => {
		const next = gameStatusReducer(initialState, fetchActiveStatuses.pending('', undefined))
		expect(next.loading).toBe(true)
	})

	it('fetchActiveStatuses.rejected sets error', () => {
		const next = gameStatusReducer(initialState, fetchActiveStatuses.rejected(null, '', undefined, 'active error'))
		expect(next.error).toBe('active error')
		expect(next.loading).toBe(false)
	})

	it('createStatus.pending sets loading=true', () => {
		const next = gameStatusReducer(initialState, createStatus.pending('', { name: 'X', isActive: true, color: '#FFF', sortOrder: 1 }))
		expect(next.loading).toBe(true)
	})

	it('createStatus.rejected sets error', () => {
		const next = gameStatusReducer(initialState, createStatus.rejected(null, '', { name: 'X', isActive: true, color: '#FFF', sortOrder: 1 }, 'create error'))
		expect(next.error).toBe('create error')
	})

	it('updateStatus.pending sets loading=true', () => {
		const next = gameStatusReducer(initialState, updateStatus.pending('', { id: 1, statusData: { id: 1, name: 'X', isActive: true } }))
		expect(next.loading).toBe(true)
	})

	it('updateStatus.rejected sets error', () => {
		const next = gameStatusReducer(initialState, updateStatus.rejected(null, '', { id: 1, statusData: { id: 1, name: 'X', isActive: true } }, 'update error'))
		expect(next.error).toBe('update error')
	})

	it('deleteStatus.pending sets loading=true', () => {
		const next = gameStatusReducer(initialState, deleteStatus.pending('', 1))
		expect(next.loading).toBe(true)
	})

	it('deleteStatus.rejected sets error', () => {
		const next = gameStatusReducer(initialState, deleteStatus.rejected(null, '', 1, 'delete error'))
		expect(next.error).toBe('delete error')
	})

	it('createStatus.fulfilled adds active status to both lists', () => {
		const s = createGameStatus({ id: 10, isActive: true })
		const next = gameStatusReducer(initialState, createStatus.fulfilled(s, '', { name: s.name, isActive: true, color: s.color, sortOrder: 1 }))
		expect(next.statuses).toHaveLength(1)
		expect(next.activeStatuses).toHaveLength(1)
	})
})

describe('gameStatusSlice — sync reducers (extended)', () => {
	beforeEach(() => resetIdCounter())

	it('setCurrentStatus sets currentStatus', () => {
		const s = createGameStatus({ id: 1 })
		const next = gameStatusReducer(initialState, { type: 'gameStatus/setCurrentStatus', payload: s })
		expect(next.currentStatus).toEqual(s)
	})

	it('setCurrentStatus clears with null', () => {
		const s = createGameStatus({ id: 1 })
		let state = gameStatusReducer(initialState, { type: 'gameStatus/setCurrentStatus', payload: s })
		state = gameStatusReducer(state, { type: 'gameStatus/setCurrentStatus', payload: null })
		expect(state.currentStatus).toBeNull()
	})

	it('updateStatus — updates existing active item in place', () => {
		const s = createGameStatus({ id: 1, name: 'Old', isActive: true })
		let state = gameStatusReducer(initialState, { type: 'gameStatus/addStatus', payload: s })
		const updated = { ...s, name: 'New', isActive: true }
		state = gameStatusReducer(state, { type: 'gameStatus/updateStatus', payload: updated })
		expect(state.statuses[0].name).toBe('New')
		expect(state.activeStatuses.find((x) => x.id === 1)?.name).toBe('New')
	})

	it('updateStatus — adds to active list when newly activated', () => {
		const s = createGameStatus({ id: 1, isActive: false })
		let state = gameStatusReducer(initialState, { type: 'gameStatus/addStatus', payload: s })
		expect(state.activeStatuses).toHaveLength(0)
		const updated = { ...s, isActive: true }
		state = gameStatusReducer(state, { type: 'gameStatus/updateStatus', payload: updated })
		expect(state.activeStatuses).toHaveLength(1)
	})

	it('updateStatus — removes from active list when deactivated', () => {
		const s = createGameStatus({ id: 1, isActive: true })
		let state = gameStatusReducer(initialState, { type: 'gameStatus/addStatus', payload: s })
		expect(state.activeStatuses).toHaveLength(1)
		const updated = { ...s, isActive: false }
		state = gameStatusReducer(state, { type: 'gameStatus/updateStatus', payload: updated })
		expect(state.activeStatuses).toHaveLength(0)
	})

	it('updateStatus — updates currentStatus when matching', () => {
		const s = createGameStatus({ id: 1, name: 'Old' })
		let state = gameStatusReducer(initialState, { type: 'gameStatus/addStatus', payload: s })
		state = gameStatusReducer(state, { type: 'gameStatus/setCurrentStatus', payload: s })
		const updated = { ...s, name: 'New' }
		state = gameStatusReducer(state, { type: 'gameStatus/updateStatus', payload: updated })
		expect(state.currentStatus?.name).toBe('New')
	})

	it('setFilters sets filters', () => {
		const next = gameStatusReducer(initialState, { type: 'gameStatus/setFilters', payload: { search: 'test' } })
		expect(next.filters).toEqual({ search: 'test' })
	})

	it('resetFilters clears filters', () => {
		let state = gameStatusReducer(initialState, { type: 'gameStatus/setFilters', payload: { search: 'test' } })
		state = gameStatusReducer(state, { type: 'gameStatus/resetFilters' })
		expect(state.filters).toEqual({})
	})

	it('resetState returns to initial state', () => {
		const s = createGameStatus({ id: 1 })
		let state = gameStatusReducer(initialState, { type: 'gameStatus/addStatus', payload: s })
		state = gameStatusReducer(state, { type: 'gameStatus/resetState' })
		expect(state).toEqual(initialState)
	})

	it('removeStatus clears currentStatus when matching', () => {
		const s = createGameStatus({ id: 5 })
		let state = gameStatusReducer(initialState, { type: 'gameStatus/addStatus', payload: s })
		state = gameStatusReducer(state, { type: 'gameStatus/setCurrentStatus', payload: s })
		state = gameStatusReducer(state, { type: 'gameStatus/removeStatus', payload: 5 })
		expect(state.currentStatus).toBeNull()
	})
})

describe('gameStatusSlice — updateStatusThunk.fulfilled branches', () => {
	beforeEach(() => resetIdCounter())

	it('adds to active list when item becomes active', () => {
		const original = createGameStatus({ id: 1, isActive: false })
		let state = gameStatusReducer(initialState, fetchStatuses.fulfilled(makePagedResult([original]), '', {}))
		const updated = { ...original, isActive: true }
		state = gameStatusReducer(state, updateStatus.fulfilled(updated, '', { id: 1, statusData: { id: 1, name: original.name, isActive: true } }))
		expect(state.activeStatuses).toHaveLength(1)
	})

	it('updates existing active item in place', () => {
		const original = createGameStatus({ id: 1, name: 'Old', isActive: true })
		let state = gameStatusReducer(initialState, fetchStatuses.fulfilled(makePagedResult([original]), '', {}))
		state = gameStatusReducer(state, fetchActiveStatuses.fulfilled([original], '', undefined))
		const updated = { ...original, name: 'New', isActive: true }
		state = gameStatusReducer(state, updateStatus.fulfilled(updated, '', { id: 1, statusData: { id: 1, name: 'New', isActive: true } }))
		expect(state.activeStatuses).toHaveLength(1)
		expect(state.activeStatuses[0].name).toBe('New')
	})

	it('removes from active list when deactivated', () => {
		const original = createGameStatus({ id: 1, isActive: true })
		let state = gameStatusReducer(initialState, fetchStatuses.fulfilled(makePagedResult([original]), '', {}))
		state = gameStatusReducer(state, fetchActiveStatuses.fulfilled([original], '', undefined))
		const updated = { ...original, isActive: false }
		state = gameStatusReducer(state, updateStatus.fulfilled(updated, '', { id: 1, statusData: { id: 1, name: original.name, isActive: false } }))
		expect(state.activeStatuses).toHaveLength(0)
	})

	it('updates currentStatus when matching', () => {
		const original = createGameStatus({ id: 1, name: 'Old' })
		let state = gameStatusReducer({ ...initialState, currentStatus: original, statuses: [original] }, { type: '@@NOOP' })
		const updated = { ...original, name: 'New' }
		state = gameStatusReducer(state, updateStatus.fulfilled(updated, '', { id: 1, statusData: { id: 1, name: 'New', isActive: true } }))
		expect(state.currentStatus?.name).toBe('New')
	})
})

describe('gameStatusSlice — selectors', () => {
	it('selectors read correct state', () => {
		const items = [createGameStatus({ id: 1 }), createGameStatus({ id: 2 })]
		const store = createTestStore({
			gameStatus: {
				...initialState,
				statuses: items,
				activeStatuses: [items[0]],
				loading: true,
				error: 'err',
			},
		})
		const s = store.getState()
		expect(selectStatuses(s)).toHaveLength(2)
		expect(selectActiveStatuses(s)).toHaveLength(1)
		expect(selectStatusLoading(s)).toBe(true)
		expect(selectStatusError(s)).toBe('err')
		expect(selectStatusById(2)(s)?.id).toBe(2)
		expect(selectStatusById(99)(s)).toBeUndefined()
	})
})

// --- Missing thunk coverage: fetchSpecialStatuses, reassignSpecialStatuses ---

describe('gameStatusSlice — special thunks', () => {
	const initialState = gameStatusReducer(undefined, { type: '@@INIT' }) as any

	it('fetchSpecialStatuses.pending sets loading=true', () => {
		const next = gameStatusReducer(initialState, fetchSpecialStatuses.pending('', undefined))
		expect(next.loading).toBe(true)
		expect(next.error).toBeNull()
	})

	it('fetchSpecialStatuses.fulfilled sets specialStatuses', () => {
		const specials = [createGameStatus({ id: 99, name: 'Special' })]
		const next = gameStatusReducer(initialState, fetchSpecialStatuses.fulfilled(specials, '', undefined))
		expect(next.loading).toBe(false)
		expect(next.specialStatuses).toHaveLength(1)
		expect(next.specialStatuses[0].name).toBe('Special')
	})

	it('fetchSpecialStatuses.rejected sets error', () => {
		const next = gameStatusReducer(initialState, fetchSpecialStatuses.rejected(null, '', undefined, 'special err'))
		expect(next.loading).toBe(false)
		expect(next.error).toBe('special err')
	})

	it('reassignSpecialStatuses.pending sets loading=true', () => {
		const next = gameStatusReducer(initialState, reassignSpecialStatuses.pending('', { newDefaultStatusId: 1, statusType: 'Default' }))
		expect(next.loading).toBe(true)
		expect(next.error).toBeNull()
	})

	it('reassignSpecialStatuses.fulfilled sets loading=false', () => {
		const loadingState = { ...initialState, loading: true }
		const next = gameStatusReducer(loadingState, reassignSpecialStatuses.fulfilled(undefined as any, '', { newDefaultStatusId: 1, statusType: 'Default' }))
		expect(next.loading).toBe(false)
	})

	it('reassignSpecialStatuses.rejected sets error', () => {
		const next = gameStatusReducer(initialState, reassignSpecialStatuses.rejected(null, '', { newDefaultStatusId: 1, statusType: 'Default' }, 'reassign err'))
		expect(next.loading).toBe(false)
		expect(next.error).toBe('reassign err')
	})
})
