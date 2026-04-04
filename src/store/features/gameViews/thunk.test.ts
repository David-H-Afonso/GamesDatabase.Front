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
			users: { base: '/users', byId: (id: number) => `/users/${id}` },
			auth: { login: '/auth/login', logout: '/auth/logout' },
		},
		pagination: { defaultPageSize: 50 },
	},
}))

import { initCustomFetch } from '@/utils/customFetch'
import { fetchGameViews, fetchPublicGameViews, fetchGameViewById, createGameViewThunk, updateGameViewThunk, deleteGameViewThunk, updateGameViewConfiguration } from './thunk'
import { createTestStore } from '@/test/utils/createTestStore'
import { createGameView, resetIdCounter } from '@/test/factories'
import * as services from '@/services'

const BASE = 'https://localhost:7245/api'
const mockPersistor = { purge: vi.fn().mockResolvedValue(undefined) }
const mockForceLogout = vi.fn().mockReturnValue({ type: 'auth/forceLogout' })

describe('gameViews thunks — fetchGameViews', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and populates gameViews', async () => {
		const items = [createGameView({ id: 1 }), createGameView({ id: 2 })]
		server.use(http.get(`${BASE}/gameviews`, () => HttpResponse.json(items)))
		await store.dispatch(fetchGameViews({}))
		expect(store.getState().gameViews.gameViews).toHaveLength(2)
	})

	it('dispatches rejected on API error', async () => {
		server.use(http.get(`${BASE}/gameviews`, () => HttpResponse.json({ message: 'fail' }, { status: 500 })))
		const result = await store.dispatch(fetchGameViews({}))
		expect(result.type).toBe('gameViews/fetchGameViews/rejected')
	})
})

describe('gameViews thunks — fetchPublicGameViews', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and populates publicGameViews', async () => {
		const items = [createGameView({ id: 3 })]
		server.use(http.get(`${BASE}/gameviews`, () => HttpResponse.json(items)))
		await store.dispatch(fetchPublicGameViews())
		expect(store.getState().gameViews.publicGameViews).toHaveLength(1)
	})

	it('dispatches rejected on error', async () => {
		server.use(http.get(`${BASE}/gameviews`, () => HttpResponse.json({ message: 'fail' }, { status: 500 })))
		const result = await store.dispatch(fetchPublicGameViews())
		expect(result.type).toBe('gameViews/fetchPublicGameViews/rejected')
	})
})

describe('gameViews thunks — fetchGameViewById', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and sets currentGameView', async () => {
		const view = createGameView({ id: 5 })
		server.use(http.get(`${BASE}/gameviews/5`, () => HttpResponse.json(view)))
		await store.dispatch(fetchGameViewById(5))
		expect(store.getState().gameViews.currentGameView?.id).toBe(5)
	})

	it('dispatches rejected on error', async () => {
		server.use(http.get(`${BASE}/gameviews/999`, () => HttpResponse.json({}, { status: 404 })))
		const result = await store.dispatch(fetchGameViewById(999))
		expect(result.type).toBe('gameViews/fetchGameViewById/rejected')
	})
})

describe('gameViews thunks — createGameViewThunk', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and prepends game view', async () => {
		const created = createGameView({ id: 10, name: 'New View' })
		server.use(http.post(`${BASE}/gameviews`, () => HttpResponse.json(created, { status: 201 })))
		await store.dispatch(createGameViewThunk({ name: 'New View', isPublic: true, configuration: { sorting: [] } }))
		expect(store.getState().gameViews.gameViews[0].name).toBe('New View')
	})

	it('dispatches rejected on error', async () => {
		server.use(http.post(`${BASE}/gameviews`, () => HttpResponse.json({}, { status: 500 })))
		const result = await store.dispatch(createGameViewThunk({ name: 'Fail', isPublic: true, configuration: { sorting: [] } }))
		expect(result.type).toBe('gameViews/createGameView/rejected')
	})
})

describe('gameViews thunks — updateGameViewThunk', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and updates view in store', async () => {
		const original = createGameView({ id: 5, name: 'Old' })
		server.use(http.get(`${BASE}/gameviews`, () => HttpResponse.json([original])))
		await store.dispatch(fetchGameViews({}))

		const updated = createGameView({ id: 5, name: 'Updated' })
		server.use(
			http.put(`${BASE}/gameviews/5`, () => new HttpResponse(null, { status: 204 })),
			http.get(`${BASE}/gameviews/5`, () => HttpResponse.json(updated))
		)
		await store.dispatch(updateGameViewThunk({ id: 5, gameViewData: { id: 5, name: 'Updated', isPublic: true, configuration: { sorting: [] } } }))
		expect(store.getState().gameViews.gameViews.find((v) => v.id === 5)?.name).toBe('Updated')
	})

	it('dispatches rejected on error', async () => {
		server.use(http.put(`${BASE}/gameviews/5`, () => HttpResponse.json({}, { status: 500 })))
		const result = await store.dispatch(updateGameViewThunk({ id: 5, gameViewData: { id: 5, name: 'Fail', isPublic: true, configuration: { sorting: [] } } }))
		expect(result.type).toBe('gameViews/updateGameView/rejected')
	})
})

describe('gameViews thunks — deleteGameViewThunk', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and removes view from store', async () => {
		const v = createGameView({ id: 7 })
		server.use(http.get(`${BASE}/gameviews`, () => HttpResponse.json([v])))
		await store.dispatch(fetchGameViews({}))

		server.use(http.delete(`${BASE}/gameviews/7`, () => new HttpResponse(null, { status: 204 })))
		await store.dispatch(deleteGameViewThunk(7))
		expect(store.getState().gameViews.gameViews.find((x) => x.id === 7)).toBeUndefined()
	})

	it('dispatches rejected on error', async () => {
		server.use(http.delete(`${BASE}/gameviews/99`, () => HttpResponse.json({}, { status: 500 })))
		const result = await store.dispatch(deleteGameViewThunk(99))
		expect(result.type).toBe('gameViews/deleteGameView/rejected')
	})
})

describe('gameViews thunks — updateGameViewConfiguration', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled with updated configuration', async () => {
		const updated = createGameView({ id: 3, configuration: { sorting: [{ field: 'Name', direction: 'Ascending', order: 0 }] } })
		server.use(http.put(`${BASE}/gameviews/3/configuration`, () => HttpResponse.json(updated)))
		const result = await store.dispatch(updateGameViewConfiguration({ id: 3, configuration: { columns: ['name'] } }))
		expect(result.type).toBe('gameViews/updateGameViewConfiguration/fulfilled')
	})

	it('dispatches rejected on error', async () => {
		server.use(http.put(`${BASE}/gameviews/3/configuration`, () => HttpResponse.json({}, { status: 500 })))
		const result = await store.dispatch(updateGameViewConfiguration({ id: 3, configuration: {} }))
		expect(result.type).toBe('gameViews/updateGameViewConfiguration/rejected')
	})
})

describe('gameViews thunks — error fallback messages', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		store = createTestStore()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('fetchGameViews uses fallback when error has no message', async () => {
		vi.spyOn(services, 'getGameViews').mockRejectedValueOnce({})
		const result = await store.dispatch(fetchGameViews({}))
		expect(result.payload).toBe('Failed to fetch game views')
	})

	it('fetchPublicGameViews uses fallback when error has no message', async () => {
		vi.spyOn(services, 'getPublicGameViews').mockRejectedValueOnce({})
		const result = await store.dispatch(fetchPublicGameViews())
		expect(result.payload).toBe('Failed to fetch public game views')
	})

	it('fetchGameViewById uses fallback when error has no message', async () => {
		vi.spyOn(services, 'getGameViewById').mockRejectedValueOnce({})
		const result = await store.dispatch(fetchGameViewById(1))
		expect(result.payload).toBe('Failed to fetch game view')
	})

	it('createGameViewThunk uses fallback when error has no message', async () => {
		vi.spyOn(services, 'createGameView').mockRejectedValueOnce({})
		const result = await store.dispatch(createGameViewThunk({ name: 'X', isPublic: false, configuration: { sorting: [] } }))
		expect(result.payload).toBe('Failed to create game view')
	})

	it('updateGameViewThunk uses fallback when error has no message', async () => {
		vi.spyOn(services, 'updateGameView').mockRejectedValueOnce({})
		const result = await store.dispatch(updateGameViewThunk({ id: 1, gameViewData: { id: 1, name: 'X', configuration: { sorting: [] } } }))
		expect(result.payload).toBe('Failed to update game view')
	})

	it('deleteGameViewThunk uses fallback when error has no message', async () => {
		vi.spyOn(services, 'deleteGameView').mockRejectedValueOnce({})
		const result = await store.dispatch(deleteGameViewThunk(1))
		expect(result.payload).toBe('Failed to delete game view')
	})

	it('updateGameViewConfiguration uses fallback when error has no message', async () => {
		vi.spyOn(services, 'updateGameViewConfiguration').mockRejectedValueOnce({})
		const result = await store.dispatch(updateGameViewConfiguration({ id: 1, configuration: {} }))
		expect(result.payload).toBe('Failed to update game view configuration')
	})
})
