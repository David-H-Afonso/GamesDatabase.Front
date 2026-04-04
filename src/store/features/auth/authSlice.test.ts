import { describe, it, expect, vi, beforeEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import authReducer, { clearError, forceLogout, restoreAuth, setUserPreferences, loginUser, logoutUser, fetchUserPreferences, updateUserPreferences } from './authSlice'
import type { AuthState } from '@/models/store/AuthState'
import { selectAuth, selectIsAuthenticated, selectCurrentUser, selectIsAdmin, selectAuthLoading, selectAuthError, selectAuthToken } from './selector'
import { createTestStore } from '@/test/utils/createTestStore'

const { mockLogin, mockLogout, mockGetUserById, mockUpdateUser } = vi.hoisted(() => ({
	mockLogin: vi.fn(),
	mockLogout: vi.fn(),
	mockGetUserById: vi.fn(),
	mockUpdateUser: vi.fn(),
}))

vi.mock('@/services', () => ({
	authService: { login: mockLogin, logout: mockLogout },
	userService: { getUserById: mockGetUserById, updateUser: mockUpdateUser },
}))

// ─── Helpers ─────────────────────────────────────────────────

function loggedInState(): AuthState {
	return {
		isAuthenticated: true,
		user: {
			id: 1,
			username: 'alice',
			role: 'Standard',
			useScoreColors: true,
			scoreProvider: 'Metacritic',
			showPriceComparisonIcon: false,
		},
		token: 'jwt-token',
		loading: false,
		error: null,
	}
}

const initialState = authReducer(undefined, { type: '@@INIT' })

// ─── Initial State ────────────────────────────────────────────

describe('authSlice — initial state', () => {
	it('starts unauthenticated', () => {
		expect(initialState.isAuthenticated).toBe(false)
		expect(initialState.user).toBeNull()
		expect(initialState.token).toBeNull()
		expect(initialState.loading).toBe(false)
		expect(initialState.error).toBeNull()
	})
})

// ─── Sync Reducers ────────────────────────────────────────────

describe('authSlice — sync reducers', () => {
	it('clearError sets error to null', () => {
		const withError = { ...initialState, error: 'bad credentials' }
		const next = authReducer(withError, clearError())
		expect(next.error).toBeNull()
	})

	it('forceLogout clears all auth state', () => {
		const next = authReducer(loggedInState(), forceLogout())
		expect(next.isAuthenticated).toBe(false)
		expect(next.user).toBeNull()
		expect(next.token).toBeNull()
		expect(next.error).toBeNull()
	})

	it('setUserPreferences updates useScoreColors when user exists', () => {
		const next = authReducer(loggedInState(), setUserPreferences({ useScoreColors: false }))
		expect(next.user?.useScoreColors).toBe(false)
	})

	it('setUserPreferences updates scoreProvider when user exists', () => {
		const next = authReducer(loggedInState(), setUserPreferences({ scoreProvider: 'OpenCritic' }))
		expect(next.user?.scoreProvider).toBe('OpenCritic')
	})

	it('setUserPreferences updates showPriceComparisonIcon when user exists', () => {
		const next = authReducer(loggedInState(), setUserPreferences({ showPriceComparisonIcon: true }))
		expect(next.user?.showPriceComparisonIcon).toBe(true)
	})

	it('setUserPreferences does nothing if user is null', () => {
		const next = authReducer(initialState, setUserPreferences({ useScoreColors: false }))
		expect(next.user).toBeNull()
	})

	it('restoreAuth does not modify state', () => {
		const state = loggedInState()
		const next = authReducer(state, restoreAuth())
		expect(next).toEqual(state)
	})

	it('setUserPreferences with empty payload keeps all fields unchanged', () => {
		const state = loggedInState()
		const next = authReducer(state, setUserPreferences({}))
		expect(next.user?.useScoreColors).toBe(true)
		expect(next.user?.scoreProvider).toBe('Metacritic')
		expect(next.user?.showPriceComparisonIcon).toBe(false)
	})
})

// ─── Extra Reducers ───────────────────────────────────────────

describe('authSlice — extraReducers', () => {
	it('loginUser.pending sets loading=true and clears error', () => {
		const withError = { ...initialState, error: 'old error' }
		const action = loginUser.pending('', { username: 'alice', password: 'pw' })
		const next = authReducer(withError, action)
		expect(next.loading).toBe(true)
		expect(next.error).toBeNull()
	})

	it('loginUser.fulfilled sets authenticated state', () => {
		const payload = { userId: 7, username: 'alice', role: 'User', token: 'tok' }
		const action = loginUser.fulfilled(payload as any, '', { username: 'alice', password: 'pw' })
		const next = authReducer(initialState, action)
		expect(next.isAuthenticated).toBe(true)
		expect(next.token).toBe('tok')
		expect(next.user?.username).toBe('alice')
		expect(next.user?.id).toBe(7)
		expect(next.loading).toBe(false)
		expect(next.error).toBeNull()
	})

	it('loginUser.rejected sets error and clears auth', () => {
		const action = loginUser.rejected(null, '', { username: 'x', password: 'y' }, 'Invalid credentials')
		const next = authReducer(initialState, action)
		expect(next.loading).toBe(false)
		expect(next.isAuthenticated).toBe(false)
		expect(next.user).toBeNull()
		expect(next.token).toBeNull()
		expect(next.error).toBe('Invalid credentials')
	})

	it('logoutUser.fulfilled clears all auth state', () => {
		const action = logoutUser.fulfilled(undefined, '')
		const next = authReducer(loggedInState(), action)
		expect(next.isAuthenticated).toBe(false)
		expect(next.user).toBeNull()
		expect(next.token).toBeNull()
	})

	it('fetchUserPreferences.fulfilled updates user preferences when user exists', () => {
		const prefs = { useScoreColors: false, scoreProvider: 'SteamDB', showPriceComparisonIcon: true }
		const action = fetchUserPreferences.fulfilled(prefs, '', 1)
		const next = authReducer(loggedInState(), action)
		expect(next.user?.useScoreColors).toBe(false)
		expect(next.user?.scoreProvider).toBe('SteamDB')
		expect(next.user?.showPriceComparisonIcon).toBe(true)
	})

	it('fetchUserPreferences.fulfilled does nothing if user is null', () => {
		const prefs = { useScoreColors: false, scoreProvider: 'SteamDB', showPriceComparisonIcon: true }
		const action = fetchUserPreferences.fulfilled(prefs, '', 1)
		const next = authReducer(initialState, action)
		expect(next.user).toBeNull()
	})

	it('updateUserPreferences.fulfilled updates partial fields when user exists', () => {
		const action = updateUserPreferences.fulfilled({ useScoreColors: false }, '', { userId: 1, useScoreColors: false })
		const next = authReducer(loggedInState(), action)
		expect(next.user?.useScoreColors).toBe(false)
		// Other fields unchanged
		expect(next.user?.scoreProvider).toBe('Metacritic')
		expect(next.user?.showPriceComparisonIcon).toBe(false)
	})

	it('updateUserPreferences.fulfilled updates scoreProvider only', () => {
		const action = updateUserPreferences.fulfilled({ scoreProvider: 'SteamDB' }, '', { userId: 1, scoreProvider: 'SteamDB' })
		const next = authReducer(loggedInState(), action)
		expect(next.user?.scoreProvider).toBe('SteamDB')
		expect(next.user?.useScoreColors).toBe(true) // unchanged
	})

	it('updateUserPreferences.fulfilled does nothing if user is null', () => {
		const action = updateUserPreferences.fulfilled({ useScoreColors: false }, '', { userId: 1, useScoreColors: false })
		const next = authReducer(initialState, action)
		expect(next.user).toBeNull()
	})

	it('updateUserPreferences.fulfilled updates showPriceComparisonIcon when user exists', () => {
		const action = updateUserPreferences.fulfilled({ showPriceComparisonIcon: true }, '', { userId: 1, showPriceComparisonIcon: true })
		const next = authReducer(loggedInState(), action)
		expect(next.user?.showPriceComparisonIcon).toBe(true)
		expect(next.user?.useScoreColors).toBe(true)
		expect(next.user?.scoreProvider).toBe('Metacritic')
	})

	it('updateUserPreferences.fulfilled with empty payload keeps all fields', () => {
		const action = updateUserPreferences.fulfilled({}, '', { userId: 1 })
		const next = authReducer(loggedInState(), action)
		expect(next.user?.useScoreColors).toBe(true)
		expect(next.user?.scoreProvider).toBe('Metacritic')
		expect(next.user?.showPriceComparisonIcon).toBe(false)
	})
})

// ─── Selectors ───────────────────────────────────────────────

describe('authSlice — selectors', () => {
	it('selectIsAuthenticated returns true only when all conditions met', () => {
		const store = createTestStore({ auth: loggedInState() })
		expect(selectIsAuthenticated(store.getState())).toBe(true)
	})

	it('selectIsAuthenticated returns false when user is null', () => {
		const store = createTestStore({ auth: { ...loggedInState(), user: null } })
		expect(selectIsAuthenticated(store.getState())).toBe(false)
	})

	it('selectIsAuthenticated returns false when token is null', () => {
		const store = createTestStore({ auth: { ...loggedInState(), token: null } })
		expect(selectIsAuthenticated(store.getState())).toBe(false)
	})

	it('selectIsAdmin returns true for Admin role', () => {
		const store = createTestStore({ auth: { ...loggedInState(), user: { ...loggedInState().user!, role: 'Admin' } } })
		expect(selectIsAdmin(store.getState())).toBe(true)
	})

	it('selectIsAdmin returns false for non-Admin role', () => {
		const store = createTestStore({ auth: loggedInState() })
		expect(selectIsAdmin(store.getState())).toBe(false)
	})

	it('selectIsAdmin returns false when user is null', () => {
		const store = createTestStore({ auth: initialState })
		expect(selectIsAdmin(store.getState())).toBe(false)
	})

	it('selectCurrentUser, selectAuthToken, selectAuthLoading, selectAuthError, selectAuth work', () => {
		const state = loggedInState()
		const store = createTestStore({ auth: { ...state, loading: true, error: 'e' } })
		const s = store.getState()
		expect(selectCurrentUser(s)?.username).toBe('alice')
		expect(selectAuthToken(s)).toBe('jwt-token')
		expect(selectAuthLoading(s)).toBe(true)
		expect(selectAuthError(s)).toBe('e')
		expect(selectAuth(s).isAuthenticated).toBe(true)
	})
})

// ─── Thunk Integration ───────────────────────────────────────

describe('authSlice — thunk integration', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('loginUser rejects with default message for non-Error throw', async () => {
		mockLogin.mockRejectedValueOnce('not an error')
		const store = configureStore({ reducer: { auth: authReducer } })
		const result = await store.dispatch(loginUser({ username: 'a', password: 'b' }))
		expect(result.payload).toBe('Login failed')
	})

	it('loginUser rejects with error.message for Error throw', async () => {
		mockLogin.mockRejectedValueOnce(new Error('bad creds'))
		const store = configureStore({ reducer: { auth: authReducer } })
		const result = await store.dispatch(loginUser({ username: 'a', password: 'b' }))
		expect(result.payload).toBe('bad creds')
	})

	it('fetchUserPreferences rejects with default message for non-Error throw', async () => {
		mockGetUserById.mockRejectedValueOnce(42)
		const store = configureStore({ reducer: { auth: authReducer } })
		const result = await store.dispatch(fetchUserPreferences(1))
		expect(result.payload).toBe('Failed to fetch user preferences')
	})

	it('updateUserPreferences thunk builds updates with all fields defined', async () => {
		mockUpdateUser.mockResolvedValueOnce({})
		mockGetUserById.mockResolvedValueOnce({ useScoreColors: false, scoreProvider: 'SteamDB', showPriceComparisonIcon: true })
		const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: loggedInState() } })
		const result = await store.dispatch(updateUserPreferences({ userId: 1, useScoreColors: false, scoreProvider: 'SteamDB', showPriceComparisonIcon: true }))
		expect(result.type).toBe('auth/updateUserPreferences/fulfilled')
		expect(mockUpdateUser).toHaveBeenCalledWith(1, { useScoreColors: false, scoreProvider: 'SteamDB', showPriceComparisonIcon: true })
	})

	it('updateUserPreferences thunk builds empty updates with no optional fields', async () => {
		mockUpdateUser.mockResolvedValueOnce({})
		mockGetUserById.mockResolvedValueOnce({ useScoreColors: true, scoreProvider: 'Metacritic', showPriceComparisonIcon: false })
		const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: loggedInState() } })
		const result = await store.dispatch(updateUserPreferences({ userId: 1 }))
		expect(result.type).toBe('auth/updateUserPreferences/fulfilled')
		expect(mockUpdateUser).toHaveBeenCalledWith(1, {})
	})

	it('updateUserPreferences rejects with default message for non-Error throw', async () => {
		mockUpdateUser.mockRejectedValueOnce(null)
		const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: loggedInState() } })
		const result = await store.dispatch(updateUserPreferences({ userId: 1, useScoreColors: false }))
		expect(result.payload).toBe('Failed to update user preferences')
	})
})
