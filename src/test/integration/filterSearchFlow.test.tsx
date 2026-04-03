/**
 * Phase 5 — Integration Tests: Filter & Search Flow
 *
 * Tests multi-component filter/search interactions in HomeComponent.
 * Verifies that typing in the search box, changing sort, and clicking
 * pagination buttons all produce the correct Redux store state changes.
 * API calls are intercepted by MSW.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
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

describe('Filter & Search Flow — Integration', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
		// getPublicGameViews expects GameView[] directly (not paged result)
		server.use(http.get(`${BASE}/gameviews`, () => HttpResponse.json([])))
	})

	// ── 5.3 Empty state ───────────────────────────────────────────────────────

	it('shows "No games found." when the API returns an empty list', async () => {
		renderWithProviders(<HomeComponent />, { store })

		await screen.findByText('No games found.')
	})

	// ── 5.1 Game list renders from API ────────────────────────────────────────

	it('renders game names returned by the API', async () => {
		server.use(
			http.get(`${BASE}/games`, () =>
				HttpResponse.json({
					data: [
						{ id: 1, name: 'Dark Souls', statusId: 1, playWithIds: [], playWithNames: [] },
						{ id: 2, name: 'Hollow Knight', statusId: 1, playWithIds: [], playWithNames: [] },
					],
					totalCount: 2,
					page: 1,
					pageSize: 50,
					totalPages: 1,
					hasNextPage: false,
					hasPreviousPage: false,
				})
			)
		)

		renderWithProviders(<HomeComponent />, { store })

		await screen.findByText('Dark Souls')
		await screen.findByText('Hollow Knight')
	})

	// ── 5.3.1 Búsqueda texto ─────────────────────────────────────────────────

	it('typing in the search input updates filters.search in the Redux store', async () => {
		renderWithProviders(<HomeComponent />, { store })

		// Wait for the component to fully mount
		await screen.findByText('No games found.')

		const searchInput = screen.getByPlaceholderText(/buscar juegos/i)
		await userEvent.type(searchInput, 'zelda')

		expect(store.getState().games.filters.search).toBe('zelda')
	})

	// ── 5.3.5 Sort ───────────────────────────────────────────────────────────

	it('changing the sort select updates filters.sortBy in the Redux store', async () => {
		renderWithProviders(<HomeComponent />, { store })
		await screen.findByText('No games found.')

		const sortSelect = screen.getByRole('combobox', { name: /ordenar por/i })
		fireEvent.change(sortSelect, { target: { value: 'grade' } })

		expect(store.getState().games.filters.sortBy).toBe('grade')
	})

	// ── 5.3.6 Paginación ─────────────────────────────────────────────────────

	it('clicking the next-page button increments filters.page in the Redux store', async () => {
		server.use(
			http.get(`${BASE}/games`, () =>
				HttpResponse.json({
					data: [{ id: 1, name: 'Game One', statusId: 1, playWithIds: [], playWithNames: [] }],
					totalCount: 100,
					page: 1,
					pageSize: 50,
					totalPages: 2,
					hasNextPage: true,
					hasPreviousPage: false,
				})
			)
		)

		renderWithProviders(<HomeComponent />, { store })

		// Wait for the game to render so pagination reflects loaded data
		await screen.findByText('Game One')

		const nextBtn = screen.getByRole('button', { name: '>' })
		await userEvent.click(nextBtn)

		await waitFor(() => {
			expect(store.getState().games.filters.page).toBe(2)
		})
	})
})
