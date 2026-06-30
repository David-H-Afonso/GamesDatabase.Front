import { describe, it, expect } from 'vitest'
import {
	selectReplayTypes,
	selectActiveReplayTypes,
	selectSpecialReplayType,
	selectReplayTypesLoading,
	selectReplayTypesError,
	selectReplayTypesPagination,
	selectReplayTypesFilters,
	selectReplayTypeState,
	selectReplayTypeById,
} from '../selector'
import type { RootState } from '@/store'

const types = [
	{ id: 1, name: 'New Game+', isActive: true, sortOrder: 1 },
	{ id: 2, name: 'Speedrun', isActive: false, sortOrder: 2 },
]

const makeState = (overrides: Partial<RootState['gameReplayType']> = {}): RootState =>
	({
		gameReplayType: {
			replayTypes: types,
			activeReplayTypes: [types[0]],
			specialReplayType: null,
			currentReplayType: null,
			loading: false,
			error: null,
			pagination: { page: 1, pageSize: 50, totalCount: 2, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
			filters: {},
			...overrides,
		},
	}) as unknown as RootState

describe('gameReplayType selectors', () => {
	it('selectReplayTypes returns all types', () => {
		expect(selectReplayTypes(makeState())).toEqual(types)
	})

	it('selectActiveReplayTypes returns active types', () => {
		expect(selectActiveReplayTypes(makeState())).toEqual([types[0]])
	})

	it('selectSpecialReplayType returns the special type', () => {
		expect(selectSpecialReplayType(makeState({ specialReplayType: types[1] } as any))).toEqual(types[1])
	})

	it('selectReplayTypesLoading returns loading', () => {
		expect(selectReplayTypesLoading(makeState({ loading: true } as any))).toBe(true)
	})

	it('selectReplayTypesError returns error', () => {
		expect(selectReplayTypesError(makeState({ error: 'err' } as any))).toBe('err')
	})

	it('selectReplayTypesPagination returns pagination', () => {
		expect(selectReplayTypesPagination(makeState())).toEqual(expect.objectContaining({ totalCount: 2 }))
	})

	it('selectReplayTypesFilters returns filters', () => {
		expect(selectReplayTypesFilters(makeState())).toEqual({})
	})

	it('selectReplayTypeState returns the full slice', () => {
		expect(selectReplayTypeState(makeState())).toEqual(expect.objectContaining({ replayTypes: types }))
	})

	it('selectReplayTypeById finds a type', () => {
		expect(selectReplayTypeById(2)(makeState())).toEqual(types[1])
	})

	it('selectReplayTypeById returns undefined for a missing id', () => {
		expect(selectReplayTypeById(999)(makeState())).toBeUndefined()
	})
})
