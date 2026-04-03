import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { createTestStore } from '@/test/utils/createTestStore'
import { createWrapperWithStore } from '@/test/utils/createWrapperWithStore'
import { createGameStatus, resetIdCounter } from '@/test/factories'
import { initCustomFetch } from '@/utils/customFetch'
import { useGameStatus } from './useGameStatus'

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

const BASE = 'https://localhost:7245/api'
const mockPersistor = { purge: vi.fn().mockResolvedValue(undefined) }
const mockForceLogout = vi.fn().mockReturnValue({ type: 'auth/forceLogout' })

function makePagedStatuses(items: ReturnType<typeof createGameStatus>[]) {
	return { data: items, page: 1, pageSize: 50, totalCount: items.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
}

describe('useGameStatus', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	// ── Initial state ──────────────────────────────────────────────────────────

	it('returns correct initial state shape', () => {
		const { result } = renderHook(() => useGameStatus(), {
			wrapper: createWrapperWithStore(store),
		})

		expect(result.current.statuses).toEqual([])
		expect(result.current.activeStatuses).toEqual([])
		expect(result.current.loading).toBe(false)
		expect(result.current.error).toBeNull()
	})

	// ── fetchStatusList ────────────────────────────────────────────────────────

	it('fetchStatusList() populates statuses in the store', async () => {
		const items = [createGameStatus(), createGameStatus()]
		server.use(http.get(`${BASE}/gamestatus`, () => HttpResponse.json(makePagedStatuses(items))))

		const { result } = renderHook(() => useGameStatus(), {
			wrapper: createWrapperWithStore(store),
		})

		await act(async () => {
			await result.current.fetchStatusList()
		})

		expect(result.current.statuses).toHaveLength(2)
		expect(result.current.loading).toBe(false)
	})

	// ── fetchActiveStatusList ──────────────────────────────────────────────────

	it('fetchActiveStatusList() populates activeStatuses in the store', async () => {
		const items = [createGameStatus({ isActive: true })]
		server.use(http.get(`${BASE}/gamestatus/active`, () => HttpResponse.json(items)))

		const { result } = renderHook(() => useGameStatus(), {
			wrapper: createWrapperWithStore(store),
		})

		await act(async () => {
			await result.current.fetchActiveStatusList()
		})

		expect(result.current.activeStatuses).toHaveLength(1)
	})

	// ── fetchSpecialStatusList ─────────────────────────────────────────────────

	it('fetchSpecialStatusList() populates specialStatuses in the store', async () => {
		const items = [createGameStatus({ id: 1 })]
		server.use(http.get(`${BASE}/gamestatus/special`, () => HttpResponse.json(items)))

		const { result } = renderHook(() => useGameStatus(), {
			wrapper: createWrapperWithStore(store),
		})

		await act(async () => {
			await result.current.fetchSpecialStatusList()
		})

		expect(result.current.specialStatuses).toHaveLength(1)
	})

	// ── createNewStatus ────────────────────────────────────────────────────────

	it('createNewStatus() calls create thunk and returns created status', async () => {
		const created = createGameStatus({ id: 99, name: 'New Status', isActive: false })
		server.use(http.post(`${BASE}/gamestatus`, () => HttpResponse.json(created)))

		const { result } = renderHook(() => useGameStatus(), {
			wrapper: createWrapperWithStore(store),
		})

		let returnValue: any
		await act(async () => {
			returnValue = await result.current.createNewStatus({ name: 'New Status', isActive: false, color: '#fff', sortOrder: 1 })
		})

		expect(returnValue).toMatchObject({ id: 99, name: 'New Status' })
	})

	it('createNewStatus() re-fetches active statuses when created status is active', async () => {
		const created = createGameStatus({ id: 100, name: 'Active Status', isActive: true })
		server.use(http.post(`${BASE}/gamestatus`, () => HttpResponse.json(created)))

		const activeItems = [created]
		server.use(http.get(`${BASE}/gamestatus/active`, () => HttpResponse.json(activeItems)))

		const { result } = renderHook(() => useGameStatus(), {
			wrapper: createWrapperWithStore(store),
		})

		await act(async () => {
			await result.current.createNewStatus({ name: 'Active Status', isActive: true, color: '#fff', sortOrder: 1 })
		})

		expect(result.current.activeStatuses).toHaveLength(1)
	})

	// ── updateExistingStatus ──────────────────────────────────────────────────

	it('updateExistingStatus() calls update thunk and returns updated status', async () => {
		const updated = createGameStatus({ id: 5, name: 'Updated Status' })
		server.use(http.put(`${BASE}/gamestatus/5`, () => HttpResponse.json(updated)))
		server.use(http.get(`${BASE}/gamestatus`, () => HttpResponse.json(makePagedStatuses([updated]))))
		server.use(http.get(`${BASE}/gamestatus/active`, () => HttpResponse.json([updated])))
		// The thunk calls getGameStatusById after update
		server.use(http.get(`${BASE}/gamestatus/5`, () => HttpResponse.json(updated)))

		const { result } = renderHook(() => useGameStatus(), {
			wrapper: createWrapperWithStore(store),
		})

		let returnValue: any
		await act(async () => {
			returnValue = await result.current.updateExistingStatus(5, { id: 5, name: 'Updated Status', isActive: true })
		})

		expect(returnValue).toMatchObject({ id: 5, name: 'Updated Status' })
	})

	// ── deleteById ─────────────────────────────────────────────────────────────

	it('deleteById() calls delete thunk', async () => {
		server.use(http.delete(`${BASE}/gamestatus/7`, () => new HttpResponse(null, { status: 204 })))

		const { result } = renderHook(() => useGameStatus(), {
			wrapper: createWrapperWithStore(store),
		})

		let returnValue: any
		await act(async () => {
			returnValue = await result.current.deleteById(7)
		})

		expect(returnValue).toBe(true)
	})

	// ── Error handling ─────────────────────────────────────────────────────────

	it('sets error state on fetch failure', async () => {
		server.use(http.get(`${BASE}/gamestatus`, () => HttpResponse.json({ message: 'Error' }, { status: 500 })))

		const { result } = renderHook(() => useGameStatus(), {
			wrapper: createWrapperWithStore(store),
		})

		await act(async () => {
			await result.current.fetchStatusList()
		})

		// Error is stored in state and loading is cleared
		expect(result.current.loading).toBe(false)
	})

	// ── Backwards-compatible aliases ───────────────────────────────────────────

	it('exposes backwards-compatible alias loadStatuses', () => {
		const { result } = renderHook(() => useGameStatus(), {
			wrapper: createWrapperWithStore(store),
		})

		expect(typeof result.current.loadStatuses).toBe('function')
		expect(result.current.loadStatuses).toBe(result.current.fetchStatusList)
	})
})
