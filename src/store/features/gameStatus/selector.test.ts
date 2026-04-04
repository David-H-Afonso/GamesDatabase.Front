import {
	selectStatuses,
	selectActiveStatuses,
	selectSpecialStatuses,
	selectStatusLoading,
	selectStatusError,
	selectStatusPagination,
	selectStatusFilters,
	selectStatusesState,
	selectStatusById,
} from './selector'
import type { RootState } from '@/store'

const statuses = [
	{ id: 1, name: 'Playing' },
	{ id: 2, name: 'Completed' },
]

const makeState = (overrides: Partial<RootState['gameStatus']> = {}): RootState =>
	({
		gameStatus: {
			statuses,
			activeStatuses: statuses,
			specialStatuses: [],
			loading: false,
			error: null,
			pagination: { page: 1, pageSize: 50, totalCount: 2 },
			filters: {},
			...overrides,
		},
	}) as unknown as RootState

describe('gameStatus selectors', () => {
	it('selectStatuses returns all statuses', () => {
		expect(selectStatuses(makeState())).toEqual(statuses)
	})

	it('selectActiveStatuses returns active statuses', () => {
		expect(selectActiveStatuses(makeState())).toEqual(statuses)
	})

	it('selectSpecialStatuses returns special statuses', () => {
		expect(selectSpecialStatuses(makeState({ specialStatuses: [{ id: 99, name: 'Special' }] } as any))).toEqual([{ id: 99, name: 'Special' }])
	})

	it('selectStatusLoading returns loading', () => {
		expect(selectStatusLoading(makeState({ loading: true } as any))).toBe(true)
	})

	it('selectStatusError returns error', () => {
		expect(selectStatusError(makeState({ error: 'err' } as any))).toBe('err')
	})

	it('selectStatusPagination returns pagination', () => {
		expect(selectStatusPagination(makeState())).toEqual(expect.objectContaining({ totalCount: 2 }))
	})

	it('selectStatusFilters returns filters', () => {
		expect(selectStatusFilters(makeState())).toEqual({})
	})

	it('selectStatusesState returns full slice', () => {
		expect(selectStatusesState(makeState())).toEqual(expect.objectContaining({ statuses }))
	})

	it('selectStatusById finds status', () => {
		expect(selectStatusById(2)(makeState())).toEqual(statuses[1])
	})

	it('selectStatusById returns undefined for missing id', () => {
		expect(selectStatusById(999)(makeState())).toBeUndefined()
	})
})
