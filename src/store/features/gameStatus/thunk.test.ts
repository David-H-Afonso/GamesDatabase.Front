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
import { fetchStatuses, fetchActiveStatuses, createStatus, updateStatus, deleteStatus } from './thunk'
import { createTestStore } from '@/test/utils/createTestStore'
import { createGameStatus, resetIdCounter } from '@/test/factories'

const BASE = 'https://localhost:7245/api'

const mockPersistor = { purge: vi.fn().mockResolvedValue(undefined) }
const mockForceLogout = vi.fn().mockReturnValue({ type: 'auth/forceLogout' })

function makePagedResult(items = [createGameStatus()]) {
	return { data: items, page: 1, pageSize: 50, totalCount: items.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
}

describe('gameStatus thunks — fetchStatuses', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and populates statuses in store', async () => {
		const items = [createGameStatus({ id: 1 }), createGameStatus({ id: 2 })]
		server.use(http.get(`${BASE}/gamestatus`, () => HttpResponse.json(makePagedResult(items))))

		await store.dispatch(fetchStatuses({}))

		expect(store.getState().gameStatus.statuses).toHaveLength(2)
		expect(store.getState().gameStatus.loading).toBe(false)
	})

	it('dispatches rejected on API error', async () => {
		server.use(http.get(`${BASE}/gamestatus`, () => HttpResponse.json({}, { status: 500 })))

		const result = await store.dispatch(fetchStatuses({}))

		expect(result.type).toBe('gameStatus/fetchStatuses/rejected')
		expect(store.getState().gameStatus.loading).toBe(false)
	})
})

describe('gameStatus thunks — fetchActiveStatuses', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and populates activeStatuses', async () => {
		const items = [createGameStatus({ id: 3, isActive: true })]
		server.use(http.get(`${BASE}/gamestatus/active`, () => HttpResponse.json(items)))

		await store.dispatch(fetchActiveStatuses())

		expect(store.getState().gameStatus.activeStatuses).toHaveLength(1)
	})
})

describe('gameStatus thunks — createStatus', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and prepends status', async () => {
		const created = createGameStatus({ id: 10, name: 'New Status' })
		server.use(http.post(`${BASE}/gamestatus`, () => HttpResponse.json(created, { status: 201 })))

		await store.dispatch(createStatus({ name: 'New Status', isActive: true, color: '#000', sortOrder: 1 }))

		expect(store.getState().gameStatus.statuses[0].name).toBe('New Status')
	})
})

describe('gameStatus thunks — updateStatus', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and updates status in store', async () => {
		const original = createGameStatus({ id: 5, name: 'Old', isActive: true })
		const updated = createGameStatus({ id: 5, name: 'Updated', isActive: true })

		// Seed store with original status
		server.use(http.get(`${BASE}/gamestatus`, () => HttpResponse.json(makePagedResult([original]))))
		await store.dispatch(fetchStatuses({}))

		server.use(
			http.put(`${BASE}/gamestatus/5`, () => new HttpResponse(null, { status: 204 })),
			http.get(`${BASE}/gamestatus/5`, () => HttpResponse.json(updated))
		)

		await store.dispatch(updateStatus({ id: 5, statusData: { id: 5, name: 'Updated', isActive: true } }))

		expect(store.getState().gameStatus.statuses.find((s) => s.id === 5)?.name).toBe('Updated')
	})
})

describe('gameStatus thunks — deleteStatus', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	it('dispatches fulfilled and removes status from store', async () => {
		const s = createGameStatus({ id: 7, isActive: true })
		server.use(http.get(`${BASE}/gamestatus`, () => HttpResponse.json(makePagedResult([s]))))
		await store.dispatch(fetchStatuses({}))
		expect(store.getState().gameStatus.statuses).toHaveLength(1)

		server.use(http.delete(`${BASE}/gamestatus/7`, () => new HttpResponse(null, { status: 204 })))
		await store.dispatch(deleteStatus(7))

		expect(store.getState().gameStatus.statuses.find((x) => x.id === 7)).toBeUndefined()
	})
})
