/**
 * Phase 5 — Integration Tests: Game CRUD Flow
 *
 * Tests the full game CRUD user journey through HomeComponent → GameCard → GameDetails.
 * Verifies that games load from the API, clicking a row opens the details panel,
 * the panel shows the correct game data, and the close button dismisses it.
 * API calls are intercepted by MSW.
 */
import { vi, describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { createTestStore } from '@/test/utils/createTestStore'
import { initCustomFetch } from '@/utils/customFetch'
import HomeComponent from '@/components/Home/components/HomeComponent'

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
				summary: '/games/summary',
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

const GAMES_RESPONSE = {
	data: [
		{ id: 1, name: 'Dark Souls', statusId: 1, statusName: 'Playing', playWithIds: [], playWithNames: [] },
		{ id: 2, name: 'Hollow Knight', statusId: 1, statusName: 'Playing', playWithIds: [], playWithNames: [] },
	],
	totalCount: 2,
	page: 1,
	pageSize: 50,
	totalPages: 1,
	hasNextPage: false,
	hasPreviousPage: false,
}

const authenticatedState = {
	auth: {
		isAuthenticated: true,
		user: { id: 1, username: 'TestUser', role: 'Admin' as const },
		token: 'test-token',
		refreshToken: null,
		loading: false,
		error: null,
	},
}

describe('Game CRUD Flow — Integration', () => {
	let store: ReturnType<typeof createTestStore>
	// This suite checks the real detail interactions, not cold module compilation.
	// Preload its module before the timed user assertions; production stays lazy
	// and the browser journeys separately exercise that lazy loading boundary.
	beforeAll(async () => { await import('@/components/Collection/CollectionGameDetails') }, 20000)

	beforeEach(() => {
		store = createTestStore(authenticatedState)
		initCustomFetch(store, mockPersistor, mockForceLogout, () => ({ type: 'auth/setRefreshedTokens', payload: { token: '', refreshToken: '' } }))
		// getPublicGameViews expects GameView[] directly (not paged result)
		server.use(
			http.get(`${BASE}/users/1`, () => HttpResponse.json({ ...authenticatedState.auth.user, useScoreColors: false, scoreProvider: 'Metacritic', showPriceComparisonIcon: false })),
			http.get(`${BASE}/gameviews`, () => HttpResponse.json([])),
			http.get(`${BASE}/games/summary`, () => HttpResponse.json({ totalGames: 2 })),
			http.get(`${BASE}/games`, () => HttpResponse.json(GAMES_RESPONSE)),
			http.get(`${BASE}/games/:id`, ({ params }) => HttpResponse.json(GAMES_RESPONSE.data.find(game => game.id === Number(params.id))))
		)
	})

	// ── 5.1 Ver lista ─────────────────────────────────────────────────────────

	it('renders game names from the API in the game list', async () => {
		renderWithProviders(<HomeComponent />, { store })

		await screen.findByRole('heading', { level: 3, name: 'Dark Souls' })
		expect(screen.getByRole('heading', { level: 3, name: 'Hollow Knight' })).toBeInTheDocument()
	})

	// ── 5.1 Ver detalles: click opens GameDetails ─────────────────────────────

	it('clicking a game row opens the GameDetails panel', async () => {
		renderWithProviders(<HomeComponent />, { store })

		const gameName = await screen.findByRole('heading', { level: 3, name: 'Dark Souls' })
		await userEvent.click(gameName.querySelector('button')!)

		// The production detail is a lazy chunk. Wait for its actual dialog, not
		// Testing Library's 1s default while a cold import competes with the suite.
		const details = await screen.findByRole('dialog', { name: 'Dark Souls' }, { timeout: 5000 })
		expect(within(details).getByRole('heading', { level: 2, name: 'Dark Souls' })).toBeInTheDocument()
	})

	// ── 5.1 Ver detalles: panel shows correct data ────────────────────────────

	it('GameDetails panel shows the correct game name', async () => {
		renderWithProviders(<HomeComponent />, { store })

		const gameName = await screen.findByRole('heading', { level: 3, name: 'Dark Souls' })
		await userEvent.click(gameName.querySelector('button')!)

		const details = await screen.findByRole('dialog', { name: 'Dark Souls' }, { timeout: 5000 })
		expect(within(details).getByRole('heading', { level: 2, name: 'Dark Souls' })).toBeInTheDocument()
	})

	// ── 5.1 Ver detalles: close button dismisses panel ────────────────────────

	it('the GameDetails close button dismisses the panel', async () => {
		renderWithProviders(<HomeComponent />, { store })

		const gameName = await screen.findByRole('heading', { level: 3, name: 'Dark Souls' })
		await userEvent.click(gameName.querySelector('button')!)

		// Verify panel is open
		const details = await screen.findByRole('dialog', { name: 'Dark Souls' }, { timeout: 5000 })

		// Close the panel
		const closeBtn = within(details).getByRole('button', { name: /^cerrar$/i })
		await userEvent.click(closeBtn)

		// Panel should be gone (or in closing animation — but with css:false it disappears)
		await waitFor(() => {
			expect(screen.queryByRole('dialog', { name: 'Dark Souls' })).not.toBeInTheDocument()
		})
	})
})
