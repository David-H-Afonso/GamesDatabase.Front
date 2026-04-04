import { selectAuth, selectIsAuthenticated, selectCurrentUser, selectIsAdmin, selectAuthLoading, selectAuthError, selectAuthToken } from './selector'
import type { RootState } from '@/store'

const makeState = (authOverrides: Partial<RootState['auth']> = {}): RootState =>
	({
		auth: {
			isAuthenticated: false,
			user: null,
			token: null,
			loading: false,
			error: null,
			...authOverrides,
		},
	}) as unknown as RootState

describe('auth selectors', () => {
	it('selectAuth returns the auth slice', () => {
		const state = makeState({ loading: true })
		expect(selectAuth(state)).toEqual(expect.objectContaining({ loading: true }))
	})

	it('selectIsAuthenticated returns true when all conditions met', () => {
		const state = makeState({ isAuthenticated: true, user: { id: 1, username: 'admin', role: 'Admin' } as any, token: 'tok' })
		expect(selectIsAuthenticated(state)).toBe(true)
	})

	it('selectIsAuthenticated returns false when user is null', () => {
		const state = makeState({ isAuthenticated: true, user: null, token: 'tok' })
		expect(selectIsAuthenticated(state)).toBeFalsy()
	})

	it('selectIsAuthenticated returns false when username is empty', () => {
		const state = makeState({ isAuthenticated: true, user: { id: 1, username: '', role: 'Admin' } as any, token: 'tok' })
		expect(selectIsAuthenticated(state)).toBeFalsy()
	})

	it('selectIsAuthenticated returns false when token is null', () => {
		const state = makeState({ isAuthenticated: true, user: { id: 1, username: 'admin', role: 'Admin' } as any, token: null })
		expect(selectIsAuthenticated(state)).toBeFalsy()
	})

	it('selectCurrentUser returns user', () => {
		const user = { id: 1, username: 'admin', role: 'Admin' } as any
		expect(selectCurrentUser(makeState({ user }))).toEqual(user)
	})

	it('selectIsAdmin returns true for Admin role', () => {
		expect(selectIsAdmin(makeState({ user: { role: 'Admin' } as any }))).toBe(true)
	})

	it('selectIsAdmin returns false for Standard role', () => {
		expect(selectIsAdmin(makeState({ user: { role: 'Standard' } as any }))).toBe(false)
	})

	it('selectAuthLoading returns loading', () => {
		expect(selectAuthLoading(makeState({ loading: true }))).toBe(true)
	})

	it('selectAuthError returns error', () => {
		expect(selectAuthError(makeState({ error: 'oops' }))).toBe('oops')
	})

	it('selectAuthToken returns token', () => {
		expect(selectAuthToken(makeState({ token: 'jwt' }))).toBe('jwt')
	})
})
