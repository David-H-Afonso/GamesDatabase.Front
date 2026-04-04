import { selectRecentUsers } from './selector'
import type { RootState } from '@/store'

describe('recentUsers selectors', () => {
	it('selectRecentUsers returns users array', () => {
		const state = { recentUsers: { users: ['alice', 'bob'] } } as unknown as RootState
		expect(selectRecentUsers(state)).toEqual(['alice', 'bob'])
	})

	it('selectRecentUsers returns empty array when no users', () => {
		const state = { recentUsers: { users: [] } } as unknown as RootState
		expect(selectRecentUsers(state)).toEqual([])
	})
})
