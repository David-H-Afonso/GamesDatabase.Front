import { describe, it, expect, beforeEach } from 'vitest'
import gamePlatformReducer from './gamePlatformSlice'
import type { GamePlatformState } from '@/models/store/GamePlatformState'
import { fetchPlatforms, fetchActivePlatforms, createPlatform, updatePlatform, deletePlatform } from './thunk'
import { selectPlatforms, selectActivePlatforms, selectPlatformLoading, selectPlatformError, selectPlatformById } from './selector'
import { createGamePlatform, resetIdCounter } from '@/test/factories'
import { createTestStore } from '@/test/utils/createTestStore'

function makePagedResult(items = [createGamePlatform()]) {
	return { data: items, page: 1, pageSize: 50, totalCount: items.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
}

const initialState = gamePlatformReducer(undefined, { type: '@@INIT' }) as GamePlatformState

describe('gamePlatformSlice — initial state', () => {
	it('starts with empty lists', () => {
		expect(initialState.platforms).toEqual([])
		expect(initialState.activePlatforms).toEqual([])
		expect(initialState.loading).toBe(false)
		expect(initialState.error).toBeNull()
	})
})

describe('gamePlatformSlice — sync reducers', () => {
	beforeEach(() => resetIdCounter())

	it('addPlatform adds to platforms list', () => {
		const p = createGamePlatform({ id: 1, isActive: false })
		const next = gamePlatformReducer(initialState, { type: 'gamePlatform/addPlatform', payload: p })
		expect(next.platforms).toHaveLength(1)
		expect(next.activePlatforms).toHaveLength(0)
	})

	it('addPlatform also adds to activePlatforms when isActive=true', () => {
		const p = createGamePlatform({ id: 1, isActive: true })
		const next = gamePlatformReducer(initialState, { type: 'gamePlatform/addPlatform', payload: p })
		expect(next.activePlatforms).toHaveLength(1)
	})

	it('removePlatform removes from both lists', () => {
		const p = createGamePlatform({ id: 3, isActive: true })
		let state = gamePlatformReducer(initialState, { type: 'gamePlatform/addPlatform', payload: p })
		state = gamePlatformReducer(state, { type: 'gamePlatform/removePlatform', payload: 3 })
		expect(state.platforms.find((x) => x.id === 3)).toBeUndefined()
		expect(state.activePlatforms.find((x) => x.id === 3)).toBeUndefined()
	})
})

describe('gamePlatformSlice — extraReducers', () => {
	beforeEach(() => resetIdCounter())

	it('fetchPlatforms.pending sets loading=true', () => {
		const action = fetchPlatforms.pending('', {})
		expect(gamePlatformReducer(initialState, action).loading).toBe(true)
	})

	it('fetchPlatforms.fulfilled populates platforms', () => {
		const items = [createGamePlatform({ id: 1 }), createGamePlatform({ id: 2 })]
		const action = fetchPlatforms.fulfilled(makePagedResult(items), '', {})
		const next = gamePlatformReducer(initialState, action)
		expect(next.platforms).toHaveLength(2)
		expect(next.loading).toBe(false)
	})

	it('fetchPlatforms.rejected sets error', () => {
		const action = fetchPlatforms.rejected(null, '', {}, 'fetch error')
		const next = gamePlatformReducer(initialState, action)
		expect(next.error).toBe('fetch error')
		expect(next.loading).toBe(false)
	})

	it('fetchActivePlatforms.fulfilled populates activePlatforms', () => {
		const items = [createGamePlatform({ id: 5, isActive: true })]
		const action = fetchActivePlatforms.fulfilled(items, '', undefined)
		expect(gamePlatformReducer(initialState, action).activePlatforms).toHaveLength(1)
	})

	it('createPlatform.fulfilled adds platform', () => {
		const p = createGamePlatform({ id: 10 })
		const action = createPlatform.fulfilled(p, '', { name: p.name, isActive: true, color: p.color })
		const next = gamePlatformReducer(initialState, action)
		expect(next.platforms).toHaveLength(1)
	})

	it('updatePlatform.fulfilled updates platform in list', () => {
		const original = createGamePlatform({ id: 1, name: 'Old' })
		const state = gamePlatformReducer(initialState, fetchPlatforms.fulfilled(makePagedResult([original]), '', {}))
		const updated = createGamePlatform({ id: 1, name: 'New' })
		const action = updatePlatform.fulfilled(updated, '', { id: 1, data: { id: 1, name: 'New', isActive: true } })
		const next = gamePlatformReducer(state, action)
		expect(next.platforms[0].name).toBe('New')
	})

	it('deletePlatform.fulfilled removes platform', () => {
		const p = createGamePlatform({ id: 7 })
		const state = gamePlatformReducer(initialState, fetchPlatforms.fulfilled(makePagedResult([p]), '', {}))
		const action = deletePlatform.fulfilled(7, '', 7)
		const next = gamePlatformReducer(state, action)
		expect(next.platforms.find((x) => x.id === 7)).toBeUndefined()
	})

	it('fetchActivePlatforms.pending sets loading=true', () => {
		const action = fetchActivePlatforms.pending('', undefined)
		const next = gamePlatformReducer(initialState, action)
		expect(next.loading).toBe(true)
		expect(next.error).toBeNull()
	})

	it('fetchActivePlatforms.rejected sets error', () => {
		const action = fetchActivePlatforms.rejected(null, '', undefined, 'active error')
		const next = gamePlatformReducer(initialState, action)
		expect(next.error).toBe('active error')
		expect(next.loading).toBe(false)
	})

	it('createPlatform.pending sets loading=true', () => {
		const action = createPlatform.pending('', { name: 'X', isActive: true, color: '#FFF' })
		expect(gamePlatformReducer(initialState, action).loading).toBe(true)
	})

	it('createPlatform.rejected sets error', () => {
		const action = createPlatform.rejected(null, '', { name: 'X', isActive: true, color: '#FFF' }, 'create error')
		const next = gamePlatformReducer(initialState, action)
		expect(next.error).toBe('create error')
		expect(next.loading).toBe(false)
	})

	it('createPlatform.fulfilled adds active platform to both lists', () => {
		const p = createGamePlatform({ id: 10, isActive: true })
		const action = createPlatform.fulfilled(p, '', { name: p.name, isActive: true, color: p.color })
		const next = gamePlatformReducer(initialState, action)
		expect(next.platforms).toHaveLength(1)
		expect(next.activePlatforms).toHaveLength(1)
	})

	it('updatePlatform.pending sets loading=true', () => {
		const action = updatePlatform.pending('', { id: 1, data: { id: 1, name: 'X', isActive: true } })
		expect(gamePlatformReducer(initialState, action).loading).toBe(true)
	})

	it('updatePlatform.rejected sets error', () => {
		const action = updatePlatform.rejected(null, '', { id: 1, data: { id: 1, name: 'X', isActive: true } }, 'update error')
		const next = gamePlatformReducer(initialState, action)
		expect(next.error).toBe('update error')
	})

	it('updatePlatform.fulfilled moves platform to active list', () => {
		const p = createGamePlatform({ id: 1, isActive: false })
		let state = gamePlatformReducer(initialState, fetchPlatforms.fulfilled(makePagedResult([p]), '', {}))
		const updated = createGamePlatform({ id: 1, isActive: true })
		state = gamePlatformReducer(state, updatePlatform.fulfilled(updated, '', { id: 1, data: { id: 1, name: 'X', isActive: true } }))
		expect(state.activePlatforms).toHaveLength(1)
	})

	it('updatePlatform.fulfilled removes platform from active list when deactivated', () => {
		const p = createGamePlatform({ id: 1, isActive: true })
		let state = gamePlatformReducer(initialState, fetchPlatforms.fulfilled(makePagedResult([p]), '', {}))
		state = gamePlatformReducer(state, fetchActivePlatforms.fulfilled([p], '', undefined))
		const updated = createGamePlatform({ id: 1, isActive: false })
		state = gamePlatformReducer(state, updatePlatform.fulfilled(updated, '', { id: 1, data: { id: 1, name: 'X', isActive: false } }))
		expect(state.activePlatforms).toHaveLength(0)
	})

	it('deletePlatform.pending sets loading=true', () => {
		const action = deletePlatform.pending('', 1)
		expect(gamePlatformReducer(initialState, action).loading).toBe(true)
	})

	it('deletePlatform.rejected sets error', () => {
		const action = deletePlatform.rejected(null, '', 1, 'delete error')
		const next = gamePlatformReducer(initialState, action)
		expect(next.error).toBe('delete error')
	})
})

describe('gamePlatformSlice — sync reducers (extended)', () => {
	beforeEach(() => resetIdCounter())

	it('setCurrentPlatform sets and clears', () => {
		const p = createGamePlatform({ id: 1 })
		let state = gamePlatformReducer(initialState, { type: 'gamePlatform/setCurrentPlatform', payload: p })
		expect(state.currentPlatform).toEqual(p)
		state = gamePlatformReducer(state, { type: 'gamePlatform/setCurrentPlatform', payload: null })
		expect(state.currentPlatform).toBeNull()
	})

	it('updatePlatform reducer — updates existing active in place', () => {
		const p = createGamePlatform({ id: 1, name: 'Old', isActive: true })
		let state = gamePlatformReducer(initialState, { type: 'gamePlatform/addPlatform', payload: p })
		const updated = { ...p, name: 'New', isActive: true }
		state = gamePlatformReducer(state, { type: 'gamePlatform/updatePlatform', payload: updated })
		expect(state.activePlatforms[0].name).toBe('New')
	})

	it('updatePlatform reducer — adds to active when newly activated', () => {
		const p = createGamePlatform({ id: 1, isActive: false })
		let state = gamePlatformReducer(initialState, { type: 'gamePlatform/addPlatform', payload: p })
		const updated = { ...p, isActive: true }
		state = gamePlatformReducer(state, { type: 'gamePlatform/updatePlatform', payload: updated })
		expect(state.activePlatforms).toHaveLength(1)
	})

	it('updatePlatform reducer — removes from active when deactivated', () => {
		const p = createGamePlatform({ id: 1, isActive: true })
		let state = gamePlatformReducer(initialState, { type: 'gamePlatform/addPlatform', payload: p })
		const updated = { ...p, isActive: false }
		state = gamePlatformReducer(state, { type: 'gamePlatform/updatePlatform', payload: updated })
		expect(state.activePlatforms).toHaveLength(0)
	})

	it('setFilters sets filters', () => {
		const next = gamePlatformReducer(initialState, { type: 'gamePlatform/setFilters', payload: { search: 'PC' } })
		expect(next.filters).toEqual({ search: 'PC' })
	})

	it('clearFilters clears filters', () => {
		let state = gamePlatformReducer(initialState, { type: 'gamePlatform/setFilters', payload: { search: 'x' } })
		state = gamePlatformReducer(state, { type: 'gamePlatform/clearFilters' })
		expect(state.filters).toEqual({})
	})

	it('setPagination merges pagination', () => {
		const next = gamePlatformReducer(initialState, { type: 'gamePlatform/setPagination', payload: { page: 2 } })
		expect(next.pagination.page).toBe(2)
		expect(next.pagination.pageSize).toBe(initialState.pagination.pageSize)
	})

	it('reset returns to initial state', () => {
		const p = createGamePlatform({ id: 1 })
		let state = gamePlatformReducer(initialState, { type: 'gamePlatform/addPlatform', payload: p })
		state = gamePlatformReducer(state, { type: 'gamePlatform/reset' })
		expect(state).toEqual(initialState)
	})
})

describe('gamePlatformSlice — updatePlatformThunk.fulfilled branches', () => {
	beforeEach(() => resetIdCounter())

	it('updates existing active item in place', () => {
		const original = createGamePlatform({ id: 1, name: 'Old', isActive: true })
		let state = gamePlatformReducer(initialState, fetchPlatforms.fulfilled(makePagedResult([original]), '', {}))
		state = gamePlatformReducer(state, fetchActivePlatforms.fulfilled([original], '', undefined))
		const updated = { ...original, name: 'New', isActive: true }
		state = gamePlatformReducer(state, updatePlatform.fulfilled(updated, '', { id: 1, data: { id: 1, name: 'New', isActive: true } }))
		expect(state.activePlatforms).toHaveLength(1)
		expect(state.activePlatforms[0].name).toBe('New')
	})
})

describe('gamePlatformSlice — selectors', () => {
	it('selectors read correct state', () => {
		const items = [createGamePlatform({ id: 1 }), createGamePlatform({ id: 2 })]
		const store = createTestStore({
			gamePlatform: { ...initialState, platforms: items, activePlatforms: [items[0]], loading: true, error: 'err' },
		})
		const s = store.getState()
		expect(selectPlatforms(s)).toHaveLength(2)
		expect(selectActivePlatforms(s)).toHaveLength(1)
		expect(selectPlatformLoading(s)).toBe(true)
		expect(selectPlatformError(s)).toBe('err')
		expect(selectPlatformById(s, 2)?.id).toBe(2)
		expect(selectPlatformById(s, 99)).toBeNull()
	})
})
