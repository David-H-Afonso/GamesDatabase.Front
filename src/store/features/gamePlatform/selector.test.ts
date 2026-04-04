import {
	selectPlatforms,
	selectActivePlatforms,
	selectPlatformLoading,
	selectPlatformError,
	selectPlatformPagination,
	selectPlatformFilters,
	selectPlatformState,
	selectPlatformById,
} from './selector'
import type { RootState } from '@/store'

const platforms = [
	{ id: 1, name: 'PC', isActive: true },
	{ id: 2, name: 'PS5', isActive: true },
]

const makeState = (overrides: Partial<RootState['gamePlatform']> = {}): RootState =>
	({
		gamePlatform: {
			platforms,
			activePlatforms: platforms,
			loading: false,
			error: null,
			pagination: { page: 1, pageSize: 50, totalCount: 2 },
			filters: {},
			...overrides,
		},
	}) as unknown as RootState

describe('gamePlatform selectors', () => {
	it('selectPlatforms returns all platforms', () => {
		expect(selectPlatforms(makeState())).toEqual(platforms)
	})

	it('selectActivePlatforms returns active platforms', () => {
		expect(selectActivePlatforms(makeState())).toEqual(platforms)
	})

	it('selectPlatformLoading returns loading', () => {
		expect(selectPlatformLoading(makeState({ loading: true } as any))).toBe(true)
	})

	it('selectPlatformError returns error', () => {
		expect(selectPlatformError(makeState({ error: 'err' } as any))).toBe('err')
	})

	it('selectPlatformPagination returns pagination', () => {
		expect(selectPlatformPagination(makeState())).toEqual(expect.objectContaining({ totalCount: 2 }))
	})

	it('selectPlatformFilters returns filters', () => {
		expect(selectPlatformFilters(makeState())).toEqual({})
	})

	it('selectPlatformState returns full slice', () => {
		expect(selectPlatformState(makeState())).toEqual(expect.objectContaining({ platforms }))
	})

	it('selectPlatformById finds platform', () => {
		expect(selectPlatformById(makeState(), 2)).toEqual(platforms[1])
	})

	it('selectPlatformById returns null for missing id', () => {
		expect(selectPlatformById(makeState(), 999)).toBeNull()
	})
})
