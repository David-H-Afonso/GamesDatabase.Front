import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { RecentUser } from '@/models/store/RecentUsersState'

interface RecentUsersState {
	users: RecentUser[]
}

const MAX_RECENT_USERS = 5

const loadRecentUsers = (): RecentUser[] => {
	try {
		const stored = localStorage.getItem('recentUsers')
		return stored ? JSON.parse(stored) : []
	} catch {
		return []
	}
}

const saveRecentUsers = (users: RecentUser[]) => {
	localStorage.setItem('recentUsers', JSON.stringify(users))
}

const initialState: RecentUsersState = {
	users: loadRecentUsers(),
}

const recentUsersSlice = createSlice({
	name: 'recentUsers',
	initialState,
	reducers: {
		addRecentUser: (state, action: PayloadAction<{ username: string; hasPassword: boolean }>) => {
			const { username, hasPassword } = action.payload

			const existingIndex = state.users.findIndex((u) => u.username === username)

			const newUser: RecentUser = {
				username,
				hasPassword,
				lastLogin: new Date().toISOString(),
			}

			if (existingIndex !== -1) {
				state.users.splice(existingIndex, 1)
			}

			state.users.unshift(newUser)

			if (state.users.length > MAX_RECENT_USERS) {
				state.users = state.users.slice(0, MAX_RECENT_USERS)
			}

			saveRecentUsers(state.users)
		},

		removeRecentUser: (state, action: PayloadAction<string>) => {
			state.users = state.users.filter((u) => u.username !== action.payload)
			saveRecentUsers(state.users)
		},

		clearRecentUsers: (state) => {
			state.users = []
			localStorage.removeItem('recentUsers')
		},
	},
})

export const { addRecentUser, removeRecentUser, clearRecentUsers } = recentUsersSlice.actions
export default recentUsersSlice.reducer
