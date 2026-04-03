import { describe, it, expect, beforeEach } from 'vitest'
import gameStatusReducer from './gameStatusSlice'
import { fetchStatuses, fetchActiveStatuses, createStatus, updateStatus, deleteStatus } from './thunk'
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
