import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { createTestStore } from '@/test/utils/createTestStore'
import { createWrapperWithStore } from '@/test/utils/createWrapperWithStore'
import { createGame as makeGame, createGameList, resetIdCounter } from '@/test/factories'
import { initCustomFetch } from '@/utils/customFetch'
import { useGames } from './useGames'

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
			users: {
				base: '/users',
				byId: (id: number) => `/users/${id}`,
			},
			auth: {
				login: '/auth/login',
				logout: '/auth/logout',
			},
		},
		pagination: { defaultPageSize: 50 },
	},
}))

const BASE = 'https://localhost:7245/api'
const mockPersistor = { purge: vi.fn().mockResolvedValue(undefined) }
const mockForceLogout = vi.fn().mockReturnValue({ type: 'auth/forceLogout' })

function makePagedResult(games = createGameList(0)) {
	return {
		data: games,
		page: 1,
		pageSize: 50,
		totalCount: games.length,
		totalPages: 1,
		hasNextPage: false,
		hasPreviousPage: false,
	}
}

describe('useGames', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	// ── Initial state ──────────────────────────────────────────────────────────

	it('returns correct initial state shape', () => {
		const { result } = renderHook(() => useGames(), {
			wrapper: createWrapperWithStore(store),
		})

		expect(result.current.games).toEqual([])
		expect(result.current.loading).toBe(false)
		expect(result.current.error).toBeNull()
		expect(result.current.pagination).toBeDefined()
		expect(result.current.isDataFresh).toBe(false)
		expect(result.current.currentGame).toBeNull()
	})

	// ── fetchGamesList ─────────────────────────────────────────────────────────

	it('fetchGamesList() fetches games and updates store', async () => {
		const games = createGameList(3)
		server.use(http.get(`${BASE}/games`, () => HttpResponse.json(makePagedResult(games))))

		const { result } = renderHook(() => useGames(), {
			wrapper: createWrapperWithStore(store),
		})

		await act(async () => {
			await result.current.fetchGamesList()
		})

		expect(result.current.games).toHaveLength(3)
		expect(result.current.loading).toBe(false)
		expect(result.current.isDataFresh).toBe(true)
	})

	it('fetchGamesList() skips network call when data is fresh and filters match', async () => {
		const games = createGameList(2)
		server.use(http.get(`${BASE}/games`, () => HttpResponse.json(makePagedResult(games))))

		const { result } = renderHook(() => useGames(), {
			wrapper: createWrapperWithStore(store),
		})

		// First fetch: puts data fresh
		await act(async () => {
			await result.current.fetchGamesList({})
		})

		const gamesAfterFirst = result.current.games.length

		// Second fetch with same params: should skip (data is fresh)
		let networkCallCount = 0
		server.use(
			http.get(`${BASE}/games`, () => {
				networkCallCount++
				return HttpResponse.json(makePagedResult(createGameList(5)))
			})
		)

		await act(async () => {
			await result.current.fetchGamesList({})
		})

		expect(networkCallCount).toBe(0)
		expect(result.current.games).toHaveLength(gamesAfterFirst)
	})

	it('fetchGamesList() does NOT skip when data is stale', async () => {
		const { result } = renderHook(() => useGames(), {
			wrapper: createWrapperWithStore(store),
		})

		// data is not fresh initially — should always fetch
		let callCount = 0
		server.use(
			http.get(`${BASE}/games`, () => {
				callCount++
				return HttpResponse.json(makePagedResult(createGameList(2)))
			})
		)

		await act(async () => {
			await result.current.fetchGamesList()
		})

		expect(callCount).toBe(1)
	})

	// ── refreshGames ───────────────────────────────────────────────────────────

	it('refreshGames() always triggers a network fetch even when data is fresh', async () => {
		const { result } = renderHook(() => useGames(), {
			wrapper: createWrapperWithStore(store),
		})

		// Put data in fresh state via a normal fetch
		server.use(http.get(`${BASE}/games`, () => HttpResponse.json(makePagedResult(createGameList(1)))))
		await act(async () => {
			await result.current.fetchGamesList({})
		})

		// Now refreshGames must bypass the cache
		let refreshCallCount = 0
		server.use(
			http.get(`${BASE}/games`, () => {
				refreshCallCount++
				return HttpResponse.json(makePagedResult(createGameList(4)))
			})
		)

		await act(async () => {
			await result.current.refreshGames({})
		})

		expect(refreshCallCount).toBe(1)
		expect(result.current.games).toHaveLength(4)
	})

	// ── createNewGame ──────────────────────────────────────────────────────────

	it('createNewGame() dispatches createGame thunk and adds game to store', async () => {
		const newGame = makeGame({ id: 99, name: 'New Game' })
		server.use(http.post(`${BASE}/games`, () => HttpResponse.json(newGame)))

		const { result } = renderHook(() => useGames(), {
			wrapper: createWrapperWithStore(store),
		})

		await act(async () => {
			await result.current.createNewGame({ name: 'New Game' } as any)
		})

		expect(store.getState().games.games.some((g) => g.id === 99)).toBe(true)
	})

	// ── updateGameById ─────────────────────────────────────────────────────────

	it('updateGameById() dispatches updateGame thunk and updates game in store', async () => {
		const original = makeGame({ id: 10, name: 'Old Name' })
		store = createTestStore({
			games: {
				games: [original],
				loading: false,
				error: null,
				currentGame: null,
				pagination: { page: 1, pageSize: 50, totalCount: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
				filters: {},
				lastAppliedFilters: null,
				isDataFresh: true,
				needsRefresh: false,
			} as any,
		})
		initCustomFetch(store, mockPersistor, mockForceLogout)

		const updated = makeGame({ id: 10, name: 'New Name' })
		server.use(http.put(`${BASE}/games/10`, () => HttpResponse.json(updated)))
		// updateGame thunk calls getGameById after PUT to fetch the updated resource
		server.use(http.get(`${BASE}/games/10`, () => HttpResponse.json(updated)))

		const { result } = renderHook(() => useGames(), {
			wrapper: createWrapperWithStore(store),
		})

		await act(async () => {
			await result.current.updateGameById(10, { name: 'New Name' } as any)
		})

		const gameInStore = store.getState().games.games.find((g) => g.id === 10)
		expect(gameInStore?.name).toBe('New Name')
	})

	// ── deleteGameById ─────────────────────────────────────────────────────────

	it('deleteGameById() dispatches deleteGame thunk and removes game from store', async () => {
		const game = makeGame({ id: 42 })
		store = createTestStore({
			games: {
				games: [game],
				loading: false,
				error: null,
				currentGame: null,
				pagination: { page: 1, pageSize: 50, totalCount: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
				filters: {},
				lastAppliedFilters: null,
				isDataFresh: true,
				needsRefresh: false,
			} as any,
		})
		initCustomFetch(store, mockPersistor, mockForceLogout)

		server.use(http.delete(`${BASE}/games/42`, () => new HttpResponse(null, { status: 204 })))

		const { result } = renderHook(() => useGames(), {
			wrapper: createWrapperWithStore(store),
		})

		await act(async () => {
			await result.current.deleteGameById(42)
		})

		expect(store.getState().games.games.find((g) => g.id === 42)).toBeUndefined()
	})

	// ── bulkUpdateGamesById ────────────────────────────────────────────────────

	it('bulkUpdateGamesById() dispatches bulkUpdateGames thunk', async () => {
		// bulkUpdateGames uses PATCH (not PUT)
		server.use(http.patch(`${BASE}/games/bulk`, () => HttpResponse.json([])))

		const { result } = renderHook(() => useGames(), {
			wrapper: createWrapperWithStore(store),
		})

		await act(async () => {
			await result.current.bulkUpdateGamesById({ gameIds: [1, 2] } as any)
		})

		// No error means thunk was dispatched successfully
		expect(result.current.error).toBeNull()
	})

	// ── selectGameById helper ──────────────────────────────────────────────────

	it('selectGameById helper returns a selector function', () => {
		const { result } = renderHook(() => useGames(), {
			wrapper: createWrapperWithStore(store),
		})

		const selector = result.current.selectGameById(1)
		expect(typeof selector).toBe('function')
	})
})
