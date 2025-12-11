import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { authService, userService } from '@/services'
import type { LoginRequest } from '@/models/api/User'
import type { AuthState } from '@/models/store/AuthState'
import { addRecentUser } from '../recentUsers/recentUsersSlice'

// Initial state - will be hydrated from redux-persist
const initialState: AuthState = {
	isAuthenticated: false,
	user: null,
	token: null,
	loading: false,
	error: null,
}

/**
 * Async thunk: Login user
 */
export const loginUser = createAsyncThunk(
	'auth/login',
	async (credentials: LoginRequest, { rejectWithValue, dispatch }) => {
		try {
			const response = await authService.login(credentials)

			// Add user to recent users list
			dispatch(
				addRecentUser({
					username: credentials.username,
					hasPassword: credentials.password.length > 0,
				})
			)

			return response
		} catch (error) {
			if (error instanceof Error) {
				return rejectWithValue(error.message)
			}
			return rejectWithValue('Login failed')
		}
	}
)

/**
 * Async thunk: Logout user
 */
export const logoutUser = createAsyncThunk('auth/logout', async () => {
	authService.logout()
})

/**
 * Async thunk: Fetch user preferences
 */
export const fetchUserPreferences = createAsyncThunk(
	'auth/fetchUserPreferences',
	async (userId: number, { rejectWithValue }) => {
		try {
			const user = await userService.getUserById(userId)
			return { useScoreColors: user.useScoreColors, scoreProvider: user.scoreProvider }
		} catch (error) {
			if (error instanceof Error) {
				return rejectWithValue(error.message)
			}
			return rejectWithValue('Failed to fetch user preferences')
		}
	}
)

/**
 * Async thunk: Update user preferences
 */
export const updateUserPreferences = createAsyncThunk(
	'auth/updateUserPreferences',
	async (
		{
			userId,
			useScoreColors,
			scoreProvider,
		}: { userId: number; useScoreColors?: boolean; scoreProvider?: string },
		{ rejectWithValue, dispatch }
	) => {
		try {
			const updates: { useScoreColors?: boolean; scoreProvider?: string } = {}
			if (useScoreColors !== undefined) updates.useScoreColors = useScoreColors
			if (scoreProvider !== undefined) updates.scoreProvider = scoreProvider

			await userService.updateUser(userId, updates)

			// Fetch fresh user data after update
			await dispatch(fetchUserPreferences(userId))

			return updates
		} catch (error) {
			if (error instanceof Error) {
				return rejectWithValue(error.message)
			}
			return rejectWithValue('Failed to update user preferences')
		}
	}
)

/**
 * Authentication slice
 */
const authSlice = createSlice({
	name: 'auth',
	initialState,
	reducers: {
		/**
		 * Clear authentication error
		 */
		clearError: (state) => {
			state.error = null
		},

		/**
		 * Restore authentication from redux-persist on app startup
		 * Redux-persist automatically handles rehydration
		 */
		restoreAuth: () => {
			// For now, redux-persist handles state restoration
		},

		/**
		 * Force logout (used when token expires during usage)
		 */
		forceLogout: (state) => {
			state.isAuthenticated = false
			state.user = null
			state.token = null
			state.error = null
		},

		/**
		 * Update user preferences in local state
		 */
		setUserPreferences: (
			state,
			action: PayloadAction<{ useScoreColors?: boolean; scoreProvider?: string }>
		) => {
			if (state.user) {
				if (action.payload.useScoreColors !== undefined) {
					state.user.useScoreColors = action.payload.useScoreColors
				}
				if (action.payload.scoreProvider !== undefined) {
					state.user.scoreProvider = action.payload.scoreProvider
				}
			}
		},
	},
	extraReducers: (builder) => {
		// Login user
		builder
			.addCase(loginUser.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(loginUser.fulfilled, (state, action: PayloadAction<any>) => {
				state.loading = false
				state.isAuthenticated = true
				state.user = {
					id: action.payload.userId,
					username: action.payload.username,
					role: action.payload.role,
				}
				state.token = action.payload.token
				state.error = null
			})
			.addCase(loginUser.rejected, (state, action) => {
				state.loading = false
				state.isAuthenticated = false
				state.user = null
				state.token = null
				state.error = action.payload as string
			})

		// Logout user
		builder.addCase(logoutUser.fulfilled, (state) => {
			state.isAuthenticated = false
			state.user = null
			state.token = null
			state.error = null
		})

		// Fetch user preferences
		builder.addCase(
			fetchUserPreferences.fulfilled,
			(state, action: PayloadAction<{ useScoreColors: boolean; scoreProvider: string }>) => {
				if (state.user) {
					state.user.useScoreColors = action.payload.useScoreColors
					state.user.scoreProvider = action.payload.scoreProvider
				}
			}
		)

		// Update user preferences
		builder.addCase(
			updateUserPreferences.fulfilled,
			(state, action: PayloadAction<{ useScoreColors?: boolean; scoreProvider?: string }>) => {
				if (state.user) {
					if (action.payload.useScoreColors !== undefined) {
						state.user.useScoreColors = action.payload.useScoreColors
					}
					if (action.payload.scoreProvider !== undefined) {
						state.user.scoreProvider = action.payload.scoreProvider
					}
				}
			}
		)
	},
})

export const { clearError, restoreAuth, forceLogout, setUserPreferences } = authSlice.actions
export default authSlice.reducer
