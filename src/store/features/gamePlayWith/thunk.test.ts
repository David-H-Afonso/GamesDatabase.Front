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
import { fetchPlayWithOptions, fetchActivePlayWithOptions, createPlayWith, updatePlayWith, deletePlayWith } from './thunk'
import { createTestStore } from '@/test/utils/createTestStore'
import { createGamePlayWith, resetIdCounter } from '@/test/factories'
import * as services from '@/services'

const BASE = 'https://localhost:7245/api'
const mockPersistor = { purge: vi.fn().mockResolvedValue(undefined) }
const mockForceLogout = vi.fn().mockReturnValue({ type: 'auth/forceLogout' })

function makePagedResult(items = [createGamePlayWith()]) {
	return { data: items, page: 1, pageSize: 50, totalCount: items.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
}

describe('gamePlayWith thunks — fetchPlayWithOptions', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and populates playWithOptions', async () => {
		const items = [createGamePlayWith({ id: 1 }), createGamePlayWith({ id: 2 })]
		server.use(http.get(`${BASE}/gameplaywith`, () => HttpResponse.json(makePagedResult(items))))
		await store.dispatch(fetchPlayWithOptions({}))
		expect(store.getState().gamePlayWith.playWithOptions).toHaveLength(2)
	})

	it('dispatches rejected on API error', async () => {
		server.use(http.get(`${BASE}/gameplaywith`, () => HttpResponse.json({}, { status: 500 })))
		const result = await store.dispatch(fetchPlayWithOptions({}))
		expect(result.type).toBe('gamePlayWith/fetchPlayWithOptions/rejected')
	})
})

describe('gamePlayWith thunks — fetchActivePlayWithOptions', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and populates activePlayWithOptions', async () => {
		const items = [createGamePlayWith({ id: 3, isActive: true })]
		server.use(http.get(`${BASE}/gameplaywith/active`, () => HttpResponse.json(items)))
		await store.dispatch(fetchActivePlayWithOptions())
		expect(store.getState().gamePlayWith.activePlayWithOptions).toHaveLength(1)
	})

	it('dispatches rejected on error', async () => {
		server.use(http.get(`${BASE}/gameplaywith/active`, () => HttpResponse.json({}, { status: 500 })))
		const result = await store.dispatch(fetchActivePlayWithOptions())
		expect(result.type).toBe('gamePlayWith/fetchActivePlayWithOptions/rejected')
	})
})

describe('gamePlayWith thunks — createPlayWith', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and prepends option', async () => {
		const created = createGamePlayWith({ id: 10, name: 'New PlayWith' })
		server.use(http.post(`${BASE}/gameplaywith`, () => HttpResponse.json(created, { status: 201 })))
		await store.dispatch(createPlayWith({ name: 'New PlayWith', isActive: true, color: '#000' }))
		expect(store.getState().gamePlayWith.playWithOptions[0].name).toBe('New PlayWith')
	})

	it('dispatches rejected on error', async () => {
		server.use(http.post(`${BASE}/gameplaywith`, () => HttpResponse.json({}, { status: 500 })))
		const result = await store.dispatch(createPlayWith({ name: 'Fail', isActive: true, color: '#000' }))
		expect(result.type).toBe('gamePlayWith/createPlayWith/rejected')
	})
})

describe('gamePlayWith thunks — updatePlayWith', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and updates option in store', async () => {
		const original = createGamePlayWith({ id: 5, name: 'Old' })
		server.use(http.get(`${BASE}/gameplaywith`, () => HttpResponse.json(makePagedResult([original]))))
		await store.dispatch(fetchPlayWithOptions({}))

		const updated = createGamePlayWith({ id: 5, name: 'Updated' })
		server.use(
			http.put(`${BASE}/gameplaywith/5`, () => new HttpResponse(null, { status: 204 })),
			http.get(`${BASE}/gameplaywith/5`, () => HttpResponse.json(updated))
		)
		await store.dispatch(updatePlayWith({ id: 5, data: { id: 5, name: 'Updated', isActive: true } }))
		expect(store.getState().gamePlayWith.playWithOptions.find((p) => p.id === 5)?.name).toBe('Updated')
	})

	it('dispatches rejected on error', async () => {
		server.use(http.put(`${BASE}/gameplaywith/5`, () => HttpResponse.json({}, { status: 500 })))
		const result = await store.dispatch(updatePlayWith({ id: 5, data: { id: 5, name: 'Fail', isActive: true } }))
		expect(result.type).toBe('gamePlayWith/updatePlayWith/rejected')
	})
})

describe('gamePlayWith thunks — deletePlayWith', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and removes option from store', async () => {
		const p = createGamePlayWith({ id: 7 })
		server.use(http.get(`${BASE}/gameplaywith`, () => HttpResponse.json(makePagedResult([p]))))
		await store.dispatch(fetchPlayWithOptions({}))

		server.use(http.delete(`${BASE}/gameplaywith/7`, () => new HttpResponse(null, { status: 204 })))
		await store.dispatch(deletePlayWith(7))
		expect(store.getState().gamePlayWith.playWithOptions.find((x) => x.id === 7)).toBeUndefined()
	})

	it('dispatches rejected on error', async () => {
		server.use(http.delete(`${BASE}/gameplaywith/99`, () => HttpResponse.json({}, { status: 500 })))
		const result = await store.dispatch(deletePlayWith(99))
		expect(result.type).toBe('gamePlayWith/deletePlayWith/rejected')
	})
})

describe('gamePlayWith thunks — error fallback messages', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		store = createTestStore()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('fetchPlayWithOptions uses fallback when error has no message', async () => {
		vi.spyOn(services, 'getGamePlayWithOptions').mockRejectedValueOnce({})
		const result = await store.dispatch(fetchPlayWithOptions({}))
		expect(result.payload).toBe('Failed to fetch playWith options')
	})

	it('fetchActivePlayWithOptions uses fallback when error has no message', async () => {
		vi.spyOn(services, 'getActiveGamePlayWithOptions').mockRejectedValueOnce({})
		const result = await store.dispatch(fetchActivePlayWithOptions())
		expect(result.payload).toBe('Failed to fetch active playWith options')
	})

	it('createPlayWith uses fallback when error has no message', async () => {
		vi.spyOn(services, 'createGamePlayWith').mockRejectedValueOnce({})
		const result = await store.dispatch(createPlayWith({ name: 'X', isActive: true, color: '#FFF' }))
		expect(result.payload).toBe('Failed to create playWith')
	})

	it('updatePlayWith uses fallback when error has no message', async () => {
		vi.spyOn(services, 'updateGamePlayWith').mockRejectedValueOnce({})
		const result = await store.dispatch(updatePlayWith({ id: 1, data: { id: 1, name: 'X', isActive: true } }))
		expect(result.payload).toBe('Failed to update playWith')
	})

	it('deletePlayWith uses fallback when error has no message', async () => {
		vi.spyOn(services, 'deleteGamePlayWith').mockRejectedValueOnce({})
		const result = await store.dispatch(deletePlayWith(1))
		expect(result.payload).toBe('Failed to delete playWith')
	})
})
