import {
	selectPlayWithOptions,
	selectActivePlayWithOptions,
	selectPlayWithLoading,
	selectPlayWithError,
	selectPlayWithPagination,
	selectPlayWithFilters,
	selectPlayWithState,
	selectPlayWithById,
} from './selector'
import type { RootState } from '@/store'

const options = [
	{ id: 1, name: 'Solo' },
	{ id: 2, name: 'Co-op' },
]

const makeState = (overrides: Partial<RootState['gamePlayWith']> = {}): RootState =>
	({
		gamePlayWith: {
			playWithOptions: options,
			activePlayWithOptions: options,
			loading: false,
			error: null,
			pagination: { page: 1, pageSize: 50, totalCount: 2 },
			filters: {},
			...overrides,
		},
	}) as unknown as RootState

describe('gamePlayWith selectors', () => {
	it('selectPlayWithOptions returns all options', () => {
		expect(selectPlayWithOptions(makeState())).toEqual(options)
	})

	it('selectActivePlayWithOptions returns active options', () => {
		expect(selectActivePlayWithOptions(makeState())).toEqual(options)
	})

	it('selectPlayWithLoading returns loading', () => {
		expect(selectPlayWithLoading(makeState({ loading: true } as any))).toBe(true)
	})

	it('selectPlayWithError returns error', () => {
		expect(selectPlayWithError(makeState({ error: 'err' } as any))).toBe('err')
	})

	it('selectPlayWithPagination returns pagination', () => {
		expect(selectPlayWithPagination(makeState())).toEqual(expect.objectContaining({ totalCount: 2 }))
	})

	it('selectPlayWithFilters returns filters', () => {
		expect(selectPlayWithFilters(makeState())).toEqual({})
	})

	it('selectPlayWithState returns full slice', () => {
		expect(selectPlayWithState(makeState())).toEqual(expect.objectContaining({ playWithOptions: options }))
	})

	it('selectPlayWithById finds option', () => {
		expect(selectPlayWithById(2)(makeState())).toEqual(options[1])
	})

	it('selectPlayWithById returns undefined for missing', () => {
		expect(selectPlayWithById(999)(makeState())).toBeUndefined()
	})
})
