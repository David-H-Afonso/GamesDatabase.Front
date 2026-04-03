import { describe, it, expect, afterEach } from 'vitest'
import recentUsersReducer, { addRecentUser, removeRecentUser, clearRecentUsers } from './recentUsersSlice'
import { selectRecentUsers } from './selector'
import { createTestStore } from '@/test/utils/createTestStore'

afterEach(() => {
	localStorage.clear()
})

const initialState = recentUsersReducer(undefined, { type: '@@INIT' })

describe('recentUsersSlice — addRecentUser', () => {
	it('adds a new user to the front of the list', () => {
		const next = recentUsersReducer(initialState, addRecentUser({ username: 'alice', hasPassword: true }))
		expect(next.users[0].username).toBe('alice')
		expect(next.users[0].hasPassword).toBe(true)
	})

	it('adding the same user again moves them to the front', () => {
		let state = recentUsersReducer(initialState, addRecentUser({ username: 'alice', hasPassword: true }))
		state = recentUsersReducer(state, addRecentUser({ username: 'bob', hasPassword: false }))
		// alice already exists - re-add moves to front
		state = recentUsersReducer(state, addRecentUser({ username: 'alice', hasPassword: true }))
		expect(state.users[0].username).toBe('alice')
		// no duplicate — alice appears only once
		expect(state.users.filter((u) => u.username === 'alice')).toHaveLength(1)
	})

	it('respects the MAX_RECENT_USERS limit of 5', () => {
		let state = initialState
		for (let i = 1; i <= 6; i++) {
			state = recentUsersReducer(state, addRecentUser({ username: `user${i}`, hasPassword: false }))
		}
		expect(state.users).toHaveLength(5)
		// newest user (user6) should be first
		expect(state.users[0].username).toBe('user6')
		// oldest user (user1) should have been evicted
		expect(state.users.find((u) => u.username === 'user1')).toBeUndefined()
	})

	it('persists users to localStorage', () => {
		recentUsersReducer(initialState, addRecentUser({ username: 'alice', hasPassword: true }))
		const stored = JSON.parse(localStorage.getItem('recentUsers') ?? '[]')
		expect(stored[0].username).toBe('alice')
	})

	it('sets lastLogin as an ISO date string', () => {
		const next = recentUsersReducer(initialState, addRecentUser({ username: 'alice', hasPassword: true }))
		expect(() => new Date(next.users[0].lastLogin)).not.toThrow()
	})
})

describe('recentUsersSlice — removeRecentUser', () => {
	it('removes a user by username', () => {
		let state = recentUsersReducer(initialState, addRecentUser({ username: 'alice', hasPassword: true }))
		state = recentUsersReducer(state, addRecentUser({ username: 'bob', hasPassword: false }))
		state = recentUsersReducer(state, removeRecentUser('alice'))
		expect(state.users.find((u) => u.username === 'alice')).toBeUndefined()
		expect(state.users.find((u) => u.username === 'bob')).toBeDefined()
	})

	it('does nothing when username does not exist', () => {
		const state = recentUsersReducer(initialState, addRecentUser({ username: 'alice', hasPassword: true }))
		const next = recentUsersReducer(state, removeRecentUser('nobody'))
		expect(next.users).toHaveLength(1)
	})
})

describe('recentUsersSlice — clearRecentUsers', () => {
	it('empties the users list', () => {
		let state = recentUsersReducer(initialState, addRecentUser({ username: 'alice', hasPassword: true }))
		state = recentUsersReducer(state, clearRecentUsers())
		expect(state.users).toEqual([])
	})

	it('removes recentUsers key from localStorage', () => {
		recentUsersReducer(initialState, addRecentUser({ username: 'alice', hasPassword: true }))
		recentUsersReducer(initialState, clearRecentUsers())
		expect(localStorage.getItem('recentUsers')).toBeNull()
	})
})

describe('recentUsersSlice — selector', () => {
	it('selectRecentUsers returns the users list', () => {
		const store = createTestStore({
			recentUsers: {
				users: [
					{ username: 'alice', hasPassword: true, lastLogin: '2025-01-01T00:00:00Z' },
					{ username: 'bob', hasPassword: false, lastLogin: '2025-01-02T00:00:00Z' },
				],
			},
		})
		expect(selectRecentUsers(store.getState())).toHaveLength(2)
	})
})
