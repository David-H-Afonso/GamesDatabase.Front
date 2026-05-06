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
import { fetchPlatforms, fetchActivePlatforms, createPlatform, updatePlatform, deletePlatform } from '../thunk'
import { createTestStore } from '@/test/utils/createTestStore'
import { createGamePlatform, resetIdCounter } from '@/test/factories'
import * as services from '@/services'

const BASE = 'https://localhost:7245/api'
const mockPersistor = { purge: vi.fn().mockResolvedValue(undefined) }
const mockForceLogout = vi.fn().mockReturnValue({ type: 'auth/forceLogout' })

function makePagedResult(items = [createGamePlatform()]) {
	return { data: items, page: 1, pageSize: 50, totalCount: items.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
}

describe('gamePlatform thunks — fetchPlatforms', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and populates platforms', async () => {
		const items = [createGamePlatform({ id: 1 }), createGamePlatform({ id: 2 })]
		server.use(http.get(`${BASE}/gameplatforms`, () => HttpResponse.json(makePagedResult(items))))

		await store.dispatch(fetchPlatforms({}))
		expect(store.getState().gamePlatform.platforms).toHaveLength(2)
	})

	it('dispatches rejected on API error', async () => {
		server.use(http.get(`${BASE}/gameplatforms`, () => HttpResponse.json({}, { status: 500 })))
		const result = await store.dispatch(fetchPlatforms({}))
		expect(result.type).toBe('gamePlatform/fetchPlatforms/rejected')
	})
})

describe('gamePlatform thunks — fetchActivePlatforms', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and populates activePlatforms', async () => {
		const items = [createGamePlatform({ id: 3, isActive: true })]
		server.use(http.get(`${BASE}/gameplatforms/active`, () => HttpResponse.json(items)))
		await store.dispatch(fetchActivePlatforms())
		expect(store.getState().gamePlatform.activePlatforms).toHaveLength(1)
	})

	it('dispatches rejected on error', async () => {
		server.use(http.get(`${BASE}/gameplatforms/active`, () => HttpResponse.json({}, { status: 500 })))
		const result = await store.dispatch(fetchActivePlatforms())
		expect(result.type).toBe('gamePlatform/fetchActivePlatforms/rejected')
	})
})

describe('gamePlatform thunks — createPlatform', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and prepends platform', async () => {
		const created = createGamePlatform({ id: 10, name: 'New Platform' })
		server.use(http.post(`${BASE}/gameplatforms`, () => HttpResponse.json(created, { status: 201 })))
		await store.dispatch(createPlatform({ name: 'New Platform', isActive: true, color: '#000' }))
		expect(store.getState().gamePlatform.platforms[0].name).toBe('New Platform')
	})

	it('dispatches rejected on error', async () => {
		server.use(http.post(`${BASE}/gameplatforms`, () => HttpResponse.json({}, { status: 500 })))
		const result = await store.dispatch(createPlatform({ name: 'Fail', isActive: true, color: '#000' }))
		expect(result.type).toBe('gamePlatform/createPlatform/rejected')
	})
})

describe('gamePlatform thunks — updatePlatform', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and updates platform in store', async () => {
		const original = createGamePlatform({ id: 5, name: 'Old' })
		server.use(http.get(`${BASE}/gameplatforms`, () => HttpResponse.json(makePagedResult([original]))))
		await store.dispatch(fetchPlatforms({}))

		const updated = createGamePlatform({ id: 5, name: 'Updated' })
		server.use(
			http.put(`${BASE}/gameplatforms/5`, () => new HttpResponse(null, { status: 204 })),
			http.get(`${BASE}/gameplatforms/5`, () => HttpResponse.json(updated))
		)
		await store.dispatch(updatePlatform({ id: 5, data: { id: 5, name: 'Updated', isActive: true } }))
		expect(store.getState().gamePlatform.platforms.find((p) => p.id === 5)?.name).toBe('Updated')
	})

	it('dispatches rejected on error', async () => {
		server.use(http.put(`${BASE}/gameplatforms/5`, () => HttpResponse.json({}, { status: 500 })))
		const result = await store.dispatch(updatePlatform({ id: 5, data: { id: 5, name: 'Fail', isActive: true } }))
		expect(result.type).toBe('gamePlatform/updatePlatform/rejected')
	})
})

describe('gamePlatform thunks — deletePlatform', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and removes platform from store', async () => {
		const p = createGamePlatform({ id: 7 })
		server.use(http.get(`${BASE}/gameplatforms`, () => HttpResponse.json(makePagedResult([p]))))
		await store.dispatch(fetchPlatforms({}))

		server.use(http.delete(`${BASE}/gameplatforms/7`, () => new HttpResponse(null, { status: 204 })))
		await store.dispatch(deletePlatform(7))
		expect(store.getState().gamePlatform.platforms.find((x) => x.id === 7)).toBeUndefined()
	})

	it('dispatches rejected on error', async () => {
		server.use(http.delete(`${BASE}/gameplatforms/99`, () => HttpResponse.json({}, { status: 500 })))
		const result = await store.dispatch(deletePlatform(99))
		expect(result.type).toBe('gamePlatform/deletePlatform/rejected')
	})
})

describe('gamePlatform thunks — error fallback messages', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		store = createTestStore()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('fetchPlatforms uses fallback when error has no message', async () => {
		vi.spyOn(services, 'getGamePlatforms').mockRejectedValueOnce({})
		const result = await store.dispatch(fetchPlatforms({}))
		expect(result.payload).toBe('Failed to fetch platforms')
	})

	it('fetchActivePlatforms uses fallback when error has no message', async () => {
		vi.spyOn(services, 'getActiveGamePlatforms').mockRejectedValueOnce({})
		const result = await store.dispatch(fetchActivePlatforms())
		expect(result.payload).toBe('Failed to fetch active platforms')
	})

	it('createPlatform uses fallback when error has no message', async () => {
		vi.spyOn(services, 'createGamePlatform').mockRejectedValueOnce({})
		const result = await store.dispatch(createPlatform({ name: 'X', isActive: true, color: '#FFF' }))
		expect(result.payload).toBe('Failed to create platform')
	})

	it('updatePlatform uses fallback when error has no message', async () => {
		vi.spyOn(services, 'updateGamePlatform').mockRejectedValueOnce({})
		const result = await store.dispatch(updatePlatform({ id: 1, data: { id: 1, name: 'X', isActive: true } }))
		expect(result.payload).toBe('Failed to update platform')
	})

	it('deletePlatform uses fallback when error has no message', async () => {
		vi.spyOn(services, 'deleteGamePlatform').mockRejectedValueOnce({})
		const result = await store.dispatch(deletePlatform(1))
		expect(result.payload).toBe('Failed to delete platform')
	})
})
