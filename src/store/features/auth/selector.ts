import type { RootState } from '@/store'

/**
 * Select authentication state
 */
export const selectAuth = (state: RootState) => state.auth

/**
 * Select if user is authenticated
 */
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated

/**
 * Select current user
 */
export const selectCurrentUser = (state: RootState) => state.auth.user

/**
 * Select if current user is admin
 */
export const selectIsAdmin = (state: RootState) => state.auth.user?.role === 'Admin'

/**
 * Select authentication loading state
 */
export const selectAuthLoading = (state: RootState) => state.auth.loading

/**
 * Select authentication error
 */
export const selectAuthError = (state: RootState) => state.auth.error

/**
 * Select JWT token
 */
export const selectAuthToken = (state: RootState) => state.auth.token
