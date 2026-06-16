import { createSlice, createAsyncThunk, createAction, type PayloadAction } from '@reduxjs/toolkit'
import { authService, userService } from '@/services'
import { environment } from '@/environments'
import type { LoginRequest, User } from '@/models/api/User'
import type { AuthState } from '@/models/store/AuthState'
import { addRecentUser } from '../recentUsers/recentUsersSlice'

const setLoginToken = createAction<string>('auth/setLoginToken')

const mapUserToAuthState = (user: User) => ({
	id: user.id,
	username: user.username,
	role: user.role,
	useScoreColors: user.useScoreColors,
	scoreProvider: user.scoreProvider,
	showPriceComparisonIcon: user.showPriceComparisonIcon,
	steamId: user.steamId,
	steamNickname: user.steamNickname,
	steamAvatarUrl: user.steamAvatarUrl,
})

// Initial state - will be hydrated from redux-persist
const initialState: AuthState = {
	isAuthenticated: false,
	user: null,
	token: null,
	refreshToken: null,
	loading: false,
	error: null,
}

/**
 * Async thunk: Login user
 */
export const loginUser = createAsyncThunk('auth/login', async (credentials: LoginRequest, { rejectWithValue, dispatch }) => {
	try {
		const response = await authService.login(credentials)

		// Set token immediately so fetchUserPreferences can authenticate
		dispatch(setLoginToken(response.token))

		dispatch(
			addRecentUser({
				username: credentials.username,
				hasPassword: credentials.password.length > 0,
			})
		)

		// Load preferences immediately after login
		await dispatch(fetchUserPreferences(response.userId))

		return response
	} catch (error) {
		if (error instanceof Error) {
			return rejectWithValue(error.message)
		}
		return rejectWithValue('Login failed')
	}
})

/**
 * Async thunk: Complete Steam login — exchanges the one-time code for real tokens.
 * The code comes from the URL hash after the Steam callback redirect.
 */
export const steamLoginUser = createAsyncThunk(
	'auth/steamLogin',
	async ({ code }: { code: string }, { rejectWithValue, dispatch }) => {
		try {
			const exchangeUrl = `${environment.baseUrl}${environment.apiRoutes.steam.exchange(code)}`
			const response = await fetch(exchangeUrl)
			if (!response.ok) throw new Error('Steam login exchange failed')

			const data: {
				token: string
				refreshToken: string
				userId: number
				username: string
				role: string
				steamId?: string
				steamNickname?: string
				steamAvatarUrl?: string
			} = await response.json()

			// Set token immediately so getUserById can authenticate
			dispatch(setLoginToken(data.token))

			const user = await userService.getUserById(data.userId)

			return { token: data.token, refreshToken: data.refreshToken, user }
		} catch (error) {
			if (error instanceof Error) {
				return rejectWithValue(error.message)
			}
			return rejectWithValue('Steam login failed')
		}
	}
)

/**
 * Async thunk: Logout user — revokes the refresh token server-side.
 */
export const logoutUser = createAsyncThunk('auth/logout', async (_, { getState }) => {
	const state = getState() as { auth: AuthState }
	const refreshToken = state.auth.refreshToken

	if (refreshToken) {
		try {
			await fetch(`${environment.baseUrl}/users/logout`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ refreshToken }),
			})
		} catch {
			// Best-effort; local state is cleared regardless
		}
	}

	authService.logout()
})

/**
 * Async thunk: Fetch user preferences
 */
export const fetchUserPreferences = createAsyncThunk('auth/fetchUserPreferences', async (userId: number, { rejectWithValue }) => {
	try {
		const user = await userService.getUserById(userId)
		return {
			useScoreColors: user.useScoreColors,
			scoreProvider: user.scoreProvider,
			showPriceComparisonIcon: user.showPriceComparisonIcon,
		}
	} catch (error) {
		if (error instanceof Error) {
			return rejectWithValue(error.message)
		}
		return rejectWithValue('Failed to fetch user preferences')
	}
})

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
			showPriceComparisonIcon,
		}: {
			userId: number
			useScoreColors?: boolean
			scoreProvider?: string
			showPriceComparisonIcon?: boolean
		},
		{ rejectWithValue, dispatch }
	) => {
		try {
			const updates: {
				useScoreColors?: boolean
				scoreProvider?: string
				showPriceComparisonIcon?: boolean
			} = {}
			if (useScoreColors !== undefined) updates.useScoreColors = useScoreColors
			if (scoreProvider !== undefined) updates.scoreProvider = scoreProvider
			if (showPriceComparisonIcon !== undefined) updates.showPriceComparisonIcon = showPriceComparisonIcon

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
		clearError: (state) => {
			state.error = null
		},

		restoreAuth: () => {
			// Redux-persist handles state restoration automatically
		},

		forceLogout: (state) => {
			state.isAuthenticated = false
			state.user = null
			state.token = null
			state.refreshToken = null
			state.error = null
		},

		setUserPreferences: (
			state,
			action: PayloadAction<{
				useScoreColors?: boolean
				scoreProvider?: string
				showPriceComparisonIcon?: boolean
			}>
		) => {
			if (state.user) {
				if (action.payload.useScoreColors !== undefined) {
					state.user.useScoreColors = action.payload.useScoreColors
				}
				if (action.payload.scoreProvider !== undefined) {
					state.user.scoreProvider = action.payload.scoreProvider
				}
				if (action.payload.showPriceComparisonIcon !== undefined) {
					state.user.showPriceComparisonIcon = action.payload.showPriceComparisonIcon
				}
			}
		},

		setSteamProfile: (
			state,
			action: PayloadAction<{
				steamId?: string
				steamNickname?: string
				steamAvatarUrl?: string
			} | null>
		) => {
			if (state.user) {
				if (action.payload === null) {
					state.user.steamId = undefined
					state.user.steamNickname = undefined
					state.user.steamAvatarUrl = undefined
				} else {
					state.user.steamId = action.payload.steamId
					state.user.steamNickname = action.payload.steamNickname
					state.user.steamAvatarUrl = action.payload.steamAvatarUrl
				}
			}
		},

		/**
		 * Called by customFetch after a successful silent token refresh.
		 * Updates both access token and refresh token in the store.
		 */
		setRefreshedTokens: (state, action: PayloadAction<{ token: string; refreshToken: string }>) => {
			state.token = action.payload.token
			state.refreshToken = action.payload.refreshToken
		},
	},
	extraReducers: (builder) => {
		builder.addCase(setLoginToken, (state, action) => {
			state.token = action.payload
		})

		// Steam login
		builder
			.addCase(steamLoginUser.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(steamLoginUser.fulfilled, (state, action) => {
				state.isAuthenticated = true
				state.token = action.payload.token
				state.refreshToken = action.payload.refreshToken
				state.user = mapUserToAuthState(action.payload.user)
				state.error = null
				state.loading = false
			})
			.addCase(steamLoginUser.rejected, (state, action) => {
				state.isAuthenticated = false
				state.user = null
				state.token = null
				state.refreshToken = null
				state.error = action.payload as string
				state.loading = false
			})

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
					steamId: action.payload.steamId,
					steamNickname: action.payload.steamNickname,
					steamAvatarUrl: action.payload.steamAvatarUrl,
				}
				state.token = action.payload.token
				state.refreshToken = action.payload.refreshToken
				state.error = null
			})
			.addCase(loginUser.rejected, (state, action) => {
				state.loading = false
				state.isAuthenticated = false
				state.user = null
				state.token = null
				state.refreshToken = null
				state.error = action.payload as string
			})

		// Logout user
		builder.addCase(logoutUser.fulfilled, (state) => {
			state.isAuthenticated = false
			state.user = null
			state.token = null
			state.refreshToken = null
			state.error = null
		})

		// Fetch user preferences
		builder.addCase(
			fetchUserPreferences.fulfilled,
			(
				state,
				action: PayloadAction<{
					useScoreColors: boolean
					scoreProvider: string
					showPriceComparisonIcon: boolean
				}>
			) => {
				if (state.user) {
					state.user.useScoreColors = action.payload.useScoreColors
					state.user.scoreProvider = action.payload.scoreProvider
					state.user.showPriceComparisonIcon = action.payload.showPriceComparisonIcon
				}
			}
		)

		// Update user preferences
		builder.addCase(
			updateUserPreferences.fulfilled,
			(
				state,
				action: PayloadAction<{
					useScoreColors?: boolean
					scoreProvider?: string
					showPriceComparisonIcon?: boolean
				}>
			) => {
				if (state.user) {
					if (action.payload.useScoreColors !== undefined) {
						state.user.useScoreColors = action.payload.useScoreColors
					}
					if (action.payload.scoreProvider !== undefined) {
						state.user.scoreProvider = action.payload.scoreProvider
					}
					if (action.payload.showPriceComparisonIcon !== undefined) {
						state.user.showPriceComparisonIcon = action.payload.showPriceComparisonIcon
					}
				}
			}
		)
	},
})

export const { clearError, restoreAuth, forceLogout, setUserPreferences, setSteamProfile, setRefreshedTokens } = authSlice.actions
export default authSlice.reducer
