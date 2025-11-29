import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { authService } from '@/services'
import type { LoginRequest } from '@/models/api/User'
import type { AuthState } from '@/models/store/AuthState'
import { addRecentUser } from '../recentUsers/recentUsersSlice'

// Initial state
const initialState: AuthState = {
	isAuthenticated: authService.isAuthenticated(),
	user: authService.getCurrentUser(),
	token: authService.getToken(),
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
		 * Restore authentication from localStorage (on app startup)
		 * This will automatically clear expired tokens
		 */
		restoreAuth: (state) => {
			// isAuthenticated() will return false and clear storage if token is expired
			const isAuth = authService.isAuthenticated()

			if (!isAuth) {
				// Token is expired or doesn't exist, clear everything
				state.isAuthenticated = false
				state.user = null
				state.token = null
			} else {
				// Token is valid, restore state
				state.isAuthenticated = true
				state.user = authService.getCurrentUser()
				state.token = authService.getToken()
			}
		},

		/**
		 * Force logout (used when token expires during usage)
		 */
		forceLogout: (state) => {
			authService.logout()
			state.isAuthenticated = false
			state.user = null
			state.token = null
			state.error = null
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
	},
})

export const { clearError, restoreAuth, forceLogout } = authSlice.actions
export default authSlice.reducer
