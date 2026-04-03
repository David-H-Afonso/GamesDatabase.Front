/**
 * Phase 5 — Integration Tests: Authentication Flow
 *
 * Tests the full auth user journey across multiple components.
 * Covers Login success/failure, navigation after authentication,
 * logout, and forceLogout state transitions.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { createTestStore } from '@/test/utils/createTestStore'
import { initCustomFetch } from '@/utils/customFetch'
import { Login } from '@/components/Auth/Login'
import { logoutUser, forceLogout } from '@/store/features/auth/authSlice'

vi.mock('@/navigation/router', () => ({ router: { navigate: vi.fn() } }))

vi.mock('@/environments', () => ({
	environment: {
		production: false,
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
			gameReplayTypes: {
				base: '/gamereplaytypes',
				active: '/gamereplaytypes/active',
				special: '/gamereplaytypes/special',
				byId: (id: number) => `/gamereplaytypes/${id}`,
				create: '/gamereplaytypes',
				update: (id: number) => `/gamereplaytypes/${id}`,
				delete: (id: number) => `/gamereplaytypes/${id}`,
				reorder: '/gamereplaytypes/reorder',
			},
			gameReplays: {
				byGameId: (gameId: number) => `/games/${gameId}/replays`,
				byId: (gameId: number, id: number) => `/games/${gameId}/replays/${id}`,
			},
			gameHistory: {
				byGameId: (gameId: number) => `/games/${gameId}/history`,
				entryById: (gameId: number, entryId: number) => `/games/${gameId}/history/${entryId}`,
				global: '/games/history',
				adminGlobal: '/admin/history',
			},
			users: {
				login: '/users/login',
				base: '/users',
				byId: (id: number) => `/users/${id}`,
				create: '/users',
				update: (id: number) => `/users/${id}`,
				delete: (id: number) => `/users/${id}`,
				changePassword: (id: number) => `/users/${id}/password`,
			},
			auth: { login: '/auth/login', logout: '/auth/logout' },
			dataExport: {
				gamesCSV: '/DataExport/games/csv',
				fullExport: '/DataExport/full',
				fullImport: '/DataExport/full',
				selectiveExport: '/DataExport/selective-games-export',
				selectiveImport: '/DataExport/selective-games-import',
				zip: '/Export/zip',
				syncToNetwork: '/Export/sync-to-network',
				analyzeFolders: '/DataExport/analyze-folders',
				analyzeDuplicateGames: '/DataExport/analyze-duplicate-games',
				updateImageUrls: '/DataExport/update-image-urls',
				clearImageCache: '/DataExport/clear-image-cache',
			},
		},
		pagination: { defaultPageSize: 50 },
	},
}))

const BASE = 'https://localhost:7245/api'
const mockPersistor = { purge: vi.fn().mockResolvedValue(undefined) }
const mockForceLogout = vi.fn().mockReturnValue({ type: 'auth/forceLogout' })

describe('Auth Flow — Integration', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	// ── 5.2.1 Login form renders ──────────────────────────────────────────────

	it('renders the login form with username and password inputs', () => {
		renderWithProviders(<Login />, { store })
		expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument()
		expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
	})

	// ── 5.2.3 Session restore ─────────────────────────────────────────────────

	it('redirects to / when user is already authenticated (session restore)', () => {
		store = createTestStore({
			auth: { isAuthenticated: true, user: { id: 1, username: 'Admin', role: 'Admin' } as any, token: 'tok', loading: false, error: null },
		} as any)
		renderWithProviders(
			<Routes>
				<Route path='/login' element={<Login />} />
				<Route path='/' element={<div>Home Page</div>} />
			</Routes>,
			{ store, route: '/login' }
		)
		expect(screen.getByText('Home Page')).toBeInTheDocument()
	})

	// ── 5.2.1 Login exitoso ───────────────────────────────────────────────────

	it('navigates to / and sets isAuthenticated after successful login', async () => {
		server.use(
			http.post(`${BASE}/users/login`, () => HttpResponse.json({ userId: 1, username: 'Admin', role: 'Admin', token: 'test-token' })),
			http.get(`${BASE}/users/:id`, () =>
				HttpResponse.json({
					id: 1,
					username: 'Admin',
					role: 'Admin',
					isDefault: true,
					hasPassword: false,
					useScoreColors: false,
					scoreProvider: 'Metacritic',
					showPriceComparisonIcon: false,
					createdAt: '2024-01-01',
					updatedAt: '2024-01-01',
				})
			)
		)

		renderWithProviders(
			<Routes>
				<Route path='/login' element={<Login />} />
				<Route path='/' element={<div>Home Page</div>} />
			</Routes>,
			{ store, route: '/login' }
		)

		await userEvent.type(screen.getByPlaceholderText(/username/i), 'Admin')
		await userEvent.type(screen.getByPlaceholderText(/password/i), 'pass')
		await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

		await waitFor(() => {
			expect(store.getState().auth.isAuthenticated).toBe(true)
		})
		expect(screen.getByText('Home Page')).toBeInTheDocument()
	})

	// ── 5.2.2 Login fallido ───────────────────────────────────────────────────

	it('shows error message when login fails with 401', async () => {
		server.use(http.post(`${BASE}/users/login`, () => HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })))

		renderWithProviders(<Login />, { store })

		await userEvent.type(screen.getByPlaceholderText(/username/i), 'Admin')
		await userEvent.type(screen.getByPlaceholderText(/password/i), 'wrong')
		await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

		await waitFor(() => {
			expect(store.getState().auth.error).not.toBeNull()
		})
		expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument()
	})

	// ── 5.2.4 Logout ─────────────────────────────────────────────────────────

	it('logoutUser thunk clears isAuthenticated from the store', async () => {
		store = createTestStore({
			auth: {
				isAuthenticated: true,
				user: { id: 1, username: 'Admin', role: 'Admin' } as any,
				token: 'tok',
				loading: false,
				error: null,
			},
		} as any)
		initCustomFetch(store, mockPersistor, mockForceLogout)

		await store.dispatch(logoutUser())

		expect(store.getState().auth.isAuthenticated).toBe(false)
		expect(store.getState().auth.token).toBeNull()
		expect(store.getState().auth.user).toBeNull()
	})

	// ── 5.2.5 Token expirado / forceLogout ───────────────────────────────────

	it('forceLogout action immediately clears auth state', () => {
		store = createTestStore({
			auth: {
				isAuthenticated: true,
				user: { id: 1, username: 'Admin', role: 'Admin' } as any,
				token: 'tok',
				loading: false,
				error: null,
			},
		} as any)

		store.dispatch(forceLogout())

		expect(store.getState().auth.isAuthenticated).toBe(false)
		expect(store.getState().auth.token).toBeNull()
		expect(store.getState().auth.user).toBeNull()
	})
})
