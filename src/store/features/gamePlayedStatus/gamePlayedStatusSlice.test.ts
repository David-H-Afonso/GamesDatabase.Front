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
