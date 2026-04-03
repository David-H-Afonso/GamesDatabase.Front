import { vi, describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'

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

import { initCustomFetch } from '@/utils/customFetch'
import { fetchGames, fetchGameById, createGame, deleteGame } from './thunk'
import { createTestStore } from '@/test/utils/createTestStore'
import { createGame as makeGame, createGameList, resetIdCounter } from '@/test/factories'

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

describe('games thunks — fetchGames', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled with paged result on success', async () => {
		const games = createGameList(3)
		server.use(http.get(`${BASE}/games`, () => HttpResponse.json(makePagedResult(games))))

		const result = await store.dispatch(fetchGames({}))

		expect(result.type).toBe('games/fetchGames/fulfilled')
		expect((result.payload as any).data).toHaveLength(3)
	})

	it('updates store state after fulfilled — games populated', async () => {
		const games = createGameList(2)
		server.use(http.get(`${BASE}/games`, () => HttpResponse.json(makePagedResult(games))))

		await store.dispatch(fetchGames({}))

		expect(store.getState().games.games).toHaveLength(2)
		expect(store.getState().games.loading).toBe(false)
		expect(store.getState().games.isDataFresh).toBe(true)
	})

	it('dispatches rejected on API error', async () => {
		server.use(http.get(`${BASE}/games`, () => HttpResponse.json({ message: 'Server error' }, { status: 500 })))

		const result = await store.dispatch(fetchGames({}))

		expect(result.type).toBe('games/fetchGames/rejected')
		expect(store.getState().games.loading).toBe(false)
	})

	it('populates pagination in state', async () => {
		const payload = {
			data: [],
			page: 2,
			pageSize: 50,
			totalCount: 100,
			totalPages: 2,
			hasNextPage: false,
			hasPreviousPage: true,
		}
		server.use(http.get(`${BASE}/games`, () => HttpResponse.json(payload)))

		await store.dispatch(fetchGames({ page: 2 }))

		const pg = store.getState().games.pagination
		expect(pg.page).toBe(2)
		expect(pg.totalCount).toBe(100)
	})
})

describe('games thunks — fetchGameById', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and sets currentGame', async () => {
		const game = makeGame({ id: 5 })
		server.use(http.get(`${BASE}/games/5`, () => HttpResponse.json(game)))

		await store.dispatch(fetchGameById(5))

		expect(store.getState().games.currentGame?.id).toBe(5)
	})

	it('dispatches rejected when game not found', async () => {
		server.use(http.get(`${BASE}/games/999`, () => HttpResponse.json({ message: 'Not found' }, { status: 404 })))

		const result = await store.dispatch(fetchGameById(999))

		expect(result.type).toBe('games/fetchGameById/rejected')
	})
})

describe('games thunks — createGame', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and prepends game to store', async () => {
		const created = makeGame({ id: 1, name: 'New Game' })
		server.use(http.post(`${BASE}/games`, () => HttpResponse.json(created, { status: 201 })))

		await store.dispatch(createGame({ name: 'New Game', statusId: 1, playWithIds: [] }))

		expect(store.getState().games.games[0].name).toBe('New Game')
	})
})

describe('games thunks — deleteGame', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and removes game from store', async () => {
		const game = makeGame({ id: 10 })
		// Seed the store with the game
		server.use(
			http.get(`${BASE}/games`, () =>
				HttpResponse.json({
					data: [game],
					page: 1,
					pageSize: 50,
					totalCount: 1,
					totalPages: 1,
					hasNextPage: false,
					hasPreviousPage: false,
				})
			),
			http.delete(`${BASE}/games/10`, () => new HttpResponse(null, { status: 204 }))
		)

		await store.dispatch(fetchGames({}))
		expect(store.getState().games.games).toHaveLength(1)

		await store.dispatch(deleteGame(10))
		expect(store.getState().games.games.find((g) => g.id === 10)).toBeUndefined()
	})
})
