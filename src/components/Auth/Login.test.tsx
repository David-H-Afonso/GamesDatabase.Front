import { vi, describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { createTestStore } from '@/test/utils/createTestStore'
import { initCustomFetch } from '@/utils/customFetch'
import { Login } from './Login'

vi.mock('@/navigation/router', () => ({ router: { navigate: vi.fn() } }))

vi.mock('@/environments', () => ({
	environment: {
		baseUrl: 'https://localhost:7245/api',
		fallbackUrl: 'http://localhost:5011/api',
		apiRoutes: {
			games: {
				base: '/games',
				byId: (id: number) => `/games/${id}`,
				create: '/games',
				update: (id: number) => `/games/${id}`,
				delete: (id: number) => `/games/${id}`,
				bulkUpdate: '/games/bulk',
			},
			gameStatus: {
				base: '/gamestatus',
				special: '/gamestatus/special',
				active: '/gamestatus/active',
				reassignSpecial: '/gamestatus/reassign-special',
				byId: (id: number) => `/gamestatus/${id}`,
				create: '/gamestatus',
				update: (id: number) => `/gamestatus/${id}`,
				delete: (id: number) => `/gamestatus/${id}`,
				reorder: '/gamestatus/reorder',
			},
			gamePlatform: {
				base: '/gameplatforms',
				active: '/gameplatforms/active',
				byId: (id: number) => `/gameplatforms/${id}`,
				create: '/gameplatforms',
				update: (id: number) => `/gameplatforms/${id}`,
				delete: (id: number) => `/gameplatforms/${id}`,
				reorder: '/gameplatforms/reorder',
			},
			gamePlayWith: {
				base: '/gameplaywith',
				active: '/gameplaywith/active',
				byId: (id: number) => `/gameplaywith/${id}`,
				create: '/gameplaywith',
				update: (id: number) => `/gameplaywith/${id}`,
				delete: (id: number) => `/gameplaywith/${id}`,
				reorder: '/gameplaywith/reorder',
			},
			gamePlayedStatus: {
				base: '/gameplayedstatus',
				active: '/gameplayedstatus/active',
				byId: (id: number) => `/gameplayedstatus/${id}`,
				create: '/gameplayedstatus',
				update: (id: number) => `/gameplayedstatus/${id}`,
				delete: (id: number) => `/gameplayedstatus/${id}`,
				reorder: '/gameplayedstatus/reorder',
			},
			gameViews: {
				base: '/gameviews',
				public: '/gameviews/public',
				byId: (id: number) => `/gameviews/${id}`,
				create: '/gameviews',
				update: (id: number) => `/gameviews/${id}`,
				delete: (id: number) => `/gameviews/${id}`,
				configuration: (id: number) => `/gameviews/${id}/configuration`,
			},
			users: { base: '/users', byId: (id: number) => `/users/${id}`, login: '/users/login' },
			auth: { login: '/auth/login', logout: '/auth/logout' },
		},
		pagination: { defaultPageSize: 50 },
	},
}))

const BASE = 'https://localhost:7245/api'
const mockPersistor = { purge: vi.fn().mockResolvedValue(undefined) }
const mockForceLogout = vi.fn().mockReturnValue({ type: 'auth/forceLogout' })

describe('Login', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	// ── Rendering ─────────────────────────────────────────────────────────────

	it('renders username and password fields', () => {
		renderWithProviders(<Login />, { store })
		expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument()
		expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
	})

	it('renders the submit button', () => {
		renderWithProviders(<Login />, { store })
		expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
	})

	// ── Error display ─────────────────────────────────────────────────────────

	it('displays the error message when auth.error is set', () => {
		store = createTestStore({
			auth: { isAuthenticated: false, user: null, token: null, loading: false, error: 'Invalid credentials' },
		} as any)
		renderWithProviders(<Login />, { store })
		expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
	})

	// ── Redirect when already authenticated ───────────────────────────────────

	it('redirects to / when user is already authenticated', () => {
		store = createTestStore({
			auth: { isAuthenticated: true, user: { id: 1, username: 'admin', role: 'Admin' }, token: 'tok', loading: false, error: null },
		} as any)
		renderWithProviders(
			<Routes>
				<Route path='/' element={<div>Home Page</div>} />
				<Route path='/login' element={<Login />} />
			</Routes>,
			{ store, route: '/login' }
		)
		expect(screen.getByText('Home Page')).toBeInTheDocument()
	})

	// ── Form submission ───────────────────────────────────────────────────────

	it('sets isAuthenticated to true in the store after successful login', async () => {
		server.use(
			http.post(`${BASE}/users/login`, () =>
				HttpResponse.json({
					userId: 1,
					username: 'Admin',
					role: 'Admin',
					token: 'test-token',
				})
			)
		)
		renderWithProviders(<Login />, { store })

		await userEvent.type(screen.getByPlaceholderText(/username/i), 'Admin')
		await userEvent.type(screen.getByPlaceholderText(/password/i), 'pass')
		await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

		await waitFor(() => {
			expect(store.getState().auth.isAuthenticated).toBe(true)
		})
	})

	it('shows error message on failed login (API 401)', async () => {
		server.use(http.post(`${BASE}/users/login`, () => HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })))
		renderWithProviders(<Login />, { store })

		await userEvent.type(screen.getByPlaceholderText(/username/i), 'Admin')
		await userEvent.type(screen.getByPlaceholderText(/password/i), 'wrong')
		await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

		await waitFor(() => {
			expect(store.getState().auth.error).not.toBeNull()
		})
	})
})
