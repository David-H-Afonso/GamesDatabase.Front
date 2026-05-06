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
import { fetchPlayedStatuses, fetchActivePlayedStatuses, createPlayedStatus, updatePlayedStatus, deletePlayedStatus } from '../thunk'
import { createTestStore } from '@/test/utils/createTestStore'
import { createGamePlayedStatus, resetIdCounter } from '@/test/factories'
import * as services from '@/services'

const BASE = 'https://localhost:7245/api'
const mockPersistor = { purge: vi.fn().mockResolvedValue(undefined) }
const mockForceLogout = vi.fn().mockReturnValue({ type: 'auth/forceLogout' })

function makePagedResult(items = [createGamePlayedStatus()]) {
	return { data: items, page: 1, pageSize: 50, totalCount: items.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
}

describe('gamePlayedStatus thunks — fetchPlayedStatuses', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and populates playedStatuses', async () => {
		const items = [createGamePlayedStatus({ id: 1 }), createGamePlayedStatus({ id: 2 })]
		server.use(http.get(`${BASE}/gameplayedstatus`, () => HttpResponse.json(makePagedResult(items))))
		await store.dispatch(fetchPlayedStatuses({}))
		expect(store.getState().gamePlayedStatus.playedStatuses).toHaveLength(2)
	})

	it('dispatches rejected on API error', async () => {
		server.use(http.get(`${BASE}/gameplayedstatus`, () => HttpResponse.json({}, { status: 500 })))
		const result = await store.dispatch(fetchPlayedStatuses({}))
		expect(result.type).toBe('gamePlayedStatus/fetchPlayedStatuses/rejected')
	})
})

describe('gamePlayedStatus thunks — fetchActivePlayedStatuses', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and populates activePlayedStatuses', async () => {
		const items = [createGamePlayedStatus({ id: 3, isActive: true })]
		server.use(http.get(`${BASE}/gameplayedstatus/active`, () => HttpResponse.json(items)))
		await store.dispatch(fetchActivePlayedStatuses())
		expect(store.getState().gamePlayedStatus.activePlayedStatuses).toHaveLength(1)
	})

	it('dispatches rejected on error', async () => {
		server.use(http.get(`${BASE}/gameplayedstatus/active`, () => HttpResponse.json({}, { status: 500 })))
		const result = await store.dispatch(fetchActivePlayedStatuses())
		expect(result.type).toBe('gamePlayedStatus/fetchActivePlayedStatuses/rejected')
	})
})

describe('gamePlayedStatus thunks — createPlayedStatus', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and prepends status', async () => {
		const created = createGamePlayedStatus({ id: 10, name: 'New PlayedStatus' })
		server.use(http.post(`${BASE}/gameplayedstatus`, () => HttpResponse.json(created, { status: 201 })))
		await store.dispatch(createPlayedStatus({ name: 'New PlayedStatus', isActive: true, color: '#000' }))
		expect(store.getState().gamePlayedStatus.playedStatuses[0].name).toBe('New PlayedStatus')
	})

	it('dispatches rejected on error', async () => {
		server.use(http.post(`${BASE}/gameplayedstatus`, () => HttpResponse.json({}, { status: 500 })))
		const result = await store.dispatch(createPlayedStatus({ name: 'Fail', isActive: true, color: '#000' }))
		expect(result.type).toBe('gamePlayedStatus/createPlayedStatus/rejected')
	})
})

describe('gamePlayedStatus thunks — updatePlayedStatus', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and updates status in store', async () => {
		const original = createGamePlayedStatus({ id: 5, name: 'Old' })
		server.use(http.get(`${BASE}/gameplayedstatus`, () => HttpResponse.json(makePagedResult([original]))))
		await store.dispatch(fetchPlayedStatuses({}))

		const updated = createGamePlayedStatus({ id: 5, name: 'Updated' })
		server.use(
			http.put(`${BASE}/gameplayedstatus/5`, () => new HttpResponse(null, { status: 204 })),
			http.get(`${BASE}/gameplayedstatus/5`, () => HttpResponse.json(updated))
		)
		await store.dispatch(updatePlayedStatus({ id: 5, data: { id: 5, name: 'Updated', isActive: true } }))
		expect(store.getState().gamePlayedStatus.playedStatuses.find((p) => p.id === 5)?.name).toBe('Updated')
	})

	it('dispatches rejected on error', async () => {
		server.use(http.put(`${BASE}/gameplayedstatus/5`, () => HttpResponse.json({}, { status: 500 })))
		const result = await store.dispatch(updatePlayedStatus({ id: 5, data: { id: 5, name: 'Fail', isActive: true } }))
		expect(result.type).toBe('gamePlayedStatus/updatePlayedStatus/rejected')
	})
})

describe('gamePlayedStatus thunks — deletePlayedStatus', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and removes status from store', async () => {
		const p = createGamePlayedStatus({ id: 7 })
		server.use(http.get(`${BASE}/gameplayedstatus`, () => HttpResponse.json(makePagedResult([p]))))
		await store.dispatch(fetchPlayedStatuses({}))

		server.use(http.delete(`${BASE}/gameplayedstatus/7`, () => new HttpResponse(null, { status: 204 })))
		await store.dispatch(deletePlayedStatus(7))
		expect(store.getState().gamePlayedStatus.playedStatuses.find((x) => x.id === 7)).toBeUndefined()
	})

	it('dispatches rejected on error', async () => {
		server.use(http.delete(`${BASE}/gameplayedstatus/99`, () => HttpResponse.json({}, { status: 500 })))
		const result = await store.dispatch(deletePlayedStatus(99))
		expect(result.type).toBe('gamePlayedStatus/deletePlayedStatus/rejected')
	})
})

describe('gamePlayedStatus thunks — error fallback messages', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		store = createTestStore()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('fetchPlayedStatuses uses fallback when error has no message', async () => {
		vi.spyOn(services, 'getGamePlayedStatuses').mockRejectedValueOnce({})
		const result = await store.dispatch(fetchPlayedStatuses({}))
		expect(result.payload).toBe('Failed to fetch played statuses')
	})

	it('fetchActivePlayedStatuses uses fallback when error has no message', async () => {
		vi.spyOn(services, 'getActiveGamePlayedStatuses').mockRejectedValueOnce({})
		const result = await store.dispatch(fetchActivePlayedStatuses())
		expect(result.payload).toBe('Failed to fetch active played statuses')
	})

	it('createPlayedStatus uses fallback when error has no message', async () => {
		vi.spyOn(services, 'createGamePlayedStatus').mockRejectedValueOnce({})
		const result = await store.dispatch(createPlayedStatus({ name: 'X', isActive: true, color: '#FFF' }))
		expect(result.payload).toBe('Failed to create played status')
	})

	it('updatePlayedStatus uses fallback when error has no message', async () => {
		vi.spyOn(services, 'updateGamePlayedStatus').mockRejectedValueOnce({})
		const result = await store.dispatch(updatePlayedStatus({ id: 1, data: { id: 1, name: 'X', isActive: true } }))
		expect(result.payload).toBe('Failed to update played status')
	})

	it('deletePlayedStatus uses fallback when error has no message', async () => {
		vi.spyOn(services, 'deleteGamePlayedStatus').mockRejectedValueOnce({})
		const result = await store.dispatch(deletePlayedStatus(1))
		expect(result.payload).toBe('Failed to delete played status')
	})
})
