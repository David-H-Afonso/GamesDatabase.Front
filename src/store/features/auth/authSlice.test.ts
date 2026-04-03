import { describe, it, expect } from 'vitest'
import authReducer, { clearError, forceLogout, setUserPreferences, loginUser, logoutUser, fetchUserPreferences } from './authSlice'
import type { AuthState } from '@/models/store/AuthState'
import { selectAuth, selectIsAuthenticated, selectCurrentUser, selectIsAdmin, selectAuthLoading, selectAuthError, selectAuthToken } from './selector'
import { createTestStore } from '@/test/utils/createTestStore'

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
