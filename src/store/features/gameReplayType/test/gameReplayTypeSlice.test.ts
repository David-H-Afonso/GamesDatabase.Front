import { describe, it, expect, beforeEach } from 'vitest'
import gameReplayTypeReducer from '../gameReplayTypeSlice'
import type { GameReplayTypeState } from '@/models/store/GameReplayTypeState'
import { fetchReplayTypes, fetchActiveReplayTypes, fetchSpecialReplayType, createReplayType, updateReplayType, deleteReplayType } from '../thunk'
import { createGameReplayType, resetIdCounter } from '@/test/factories'

function makePagedResult(items = [createGameReplayType()]) {
	return { data: items, page: 1, pageSize: 50, totalCount: items.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
}

const initialState = gameReplayTypeReducer(undefined, { type: '@@INIT' }) as GameReplayTypeState

describe('gameReplayTypeSlice — initial state', () => {
	it('starts with empty lists and no special type', () => {
		expect(initialState.replayTypes).toEqual([])
		expect(initialState.activeReplayTypes).toEqual([])
		expect(initialState.specialReplayType).toBeNull()
		expect(initialState.loading).toBe(false)
		expect(initialState.error).toBeNull()
	})
})

describe('gameReplayTypeSlice — extraReducers', () => {
	beforeEach(() => resetIdCounter())

	it('fetchReplayTypes.pending sets loading=true', () => {
		expect(gameReplayTypeReducer(initialState, fetchReplayTypes.pending('', {})).loading).toBe(true)
	})

	it('fetchReplayTypes.fulfilled populates list and pagination', () => {
		const items = [createGameReplayType({ id: 1 }), createGameReplayType({ id: 2 })]
		const next = gameReplayTypeReducer(initialState, fetchReplayTypes.fulfilled(makePagedResult(items), '', {}))
		expect(next.replayTypes).toHaveLength(2)
		expect(next.pagination.totalCount).toBe(2)
		expect(next.loading).toBe(false)
	})

	it('fetchReplayTypes.rejected sets error', () => {
		const next = gameReplayTypeReducer(initialState, fetchReplayTypes.rejected(null, '', {}, 'boom'))
		expect(next.error).toBe('boom')
		expect(next.loading).toBe(false)
	})

	it('fetchActiveReplayTypes.fulfilled populates active list', () => {
		const items = [createGameReplayType({ id: 3, isActive: true })]
		const next = gameReplayTypeReducer(initialState, fetchActiveReplayTypes.fulfilled(items, '', undefined))
		expect(next.activeReplayTypes).toHaveLength(1)
	})

	it('fetchSpecialReplayType.fulfilled stores the special type', () => {
		const special = createGameReplayType({ id: 9, replayType: 'Replay' })
		const next = gameReplayTypeReducer(initialState, fetchSpecialReplayType.fulfilled(special, '', undefined))
		expect(next.specialReplayType?.id).toBe(9)
	})

	it('fetchSpecialReplayType.rejected clears the special type without a global error', () => {
		const seeded: GameReplayTypeState = { ...initialState, specialReplayType: createGameReplayType({ id: 9 }) }
		const next = gameReplayTypeReducer(seeded, fetchSpecialReplayType.rejected(null, '', undefined, 'no special'))
		expect(next.specialReplayType).toBeNull()
		expect(next.error).toBeNull()
	})

	it('createReplayType.fulfilled adds an active type to both lists', () => {
		const created = createGameReplayType({ id: 10, isActive: true })
		const next = gameReplayTypeReducer(initialState, createReplayType.fulfilled(created, '', { name: created.name, isActive: true }))
		expect(next.replayTypes).toHaveLength(1)
		expect(next.activeReplayTypes).toHaveLength(1)
	})

	it('updateReplayType.fulfilled updates the type in place', () => {
		const original = createGameReplayType({ id: 1, name: 'Old' })
		const state = gameReplayTypeReducer(initialState, fetchReplayTypes.fulfilled(makePagedResult([original]), '', {}))
		const updated = createGameReplayType({ id: 1, name: 'New' })
		const next = gameReplayTypeReducer(state, updateReplayType.fulfilled(updated, '', { id: 1, data: { id: 1, name: 'New', isActive: true } }))
		expect(next.replayTypes[0].name).toBe('New')
	})

	it('deleteReplayType.fulfilled removes the type from both lists', () => {
		const item = createGameReplayType({ id: 7, isActive: true })
		let state = gameReplayTypeReducer(initialState, fetchReplayTypes.fulfilled(makePagedResult([item]), '', {}))
		state = gameReplayTypeReducer(state, fetchActiveReplayTypes.fulfilled([item], '', undefined))
		const next = gameReplayTypeReducer(state, deleteReplayType.fulfilled(7, '', 7))
		expect(next.replayTypes.find((type) => type.id === 7)).toBeUndefined()
		expect(next.activeReplayTypes.find((type) => type.id === 7)).toBeUndefined()
	})

	it('createReplayType.rejected sets error', () => {
		const next = gameReplayTypeReducer(initialState, createReplayType.rejected(null, '', { name: 'X', isActive: true }, 'create error'))
		expect(next.error).toBe('create error')
	})

	it('deleteReplayType.rejected sets error', () => {
		const next = gameReplayTypeReducer(initialState, deleteReplayType.rejected(null, '', 1, 'delete error'))
		expect(next.error).toBe('delete error')
	})
})

describe('gameReplayTypeSlice — sync reducers', () => {
	beforeEach(() => resetIdCounter())

	it('setCurrentReplayType sets and clears', () => {
		const item = createGameReplayType({ id: 1 })
		let state = gameReplayTypeReducer(initialState, { type: 'gameReplayType/setCurrentReplayType', payload: item })
		expect(state.currentReplayType).toEqual(item)
		state = gameReplayTypeReducer(state, { type: 'gameReplayType/setCurrentReplayType', payload: null })
		expect(state.currentReplayType).toBeNull()
	})

	it('setFilters and clearFilters work', () => {
		let state = gameReplayTypeReducer(initialState, { type: 'gameReplayType/setFilters', payload: { search: 'ng+' } })
		expect(state.filters).toEqual({ search: 'ng+' })
		state = gameReplayTypeReducer(state, { type: 'gameReplayType/clearFilters' })
		expect(state.filters).toEqual({})
	})

	it('reset returns to initial state', () => {
		const state = gameReplayTypeReducer(initialState, fetchReplayTypes.fulfilled(makePagedResult(), '', {}))
		expect(gameReplayTypeReducer(state, { type: 'gameReplayType/reset' })).toEqual(initialState)
	})
})
