import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { createTestStore } from '@/test/utils/createTestStore'
import { createWrapperWithStore } from '@/test/utils/createWrapperWithStore'
import { createGamePlatform, resetIdCounter } from '@/test/factories'
import { initCustomFetch } from '@/utils/customFetch'
import { useGamePlatform } from './useGamePlatform'

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

function makePagedPlatforms(items: ReturnType<typeof createGamePlatform>[]) {
	return { data: items, page: 1, pageSize: 50, totalCount: items.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
}

describe('useGamePlatform', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	// ── Initial state ──────────────────────────────────────────────────────────

	it('returns correct initial state shape', () => {
		const { result } = renderHook(() => useGamePlatform(), {
			wrapper: createWrapperWithStore(store),
		})

		expect(result.current.items).toEqual([])
		expect(result.current.activeItems).toEqual([])
		expect(result.current.loading).toBe(false)
		expect(result.current.error).toBeNull()
		// Backwards-compatible aliases
		expect(result.current.platforms).toBe(result.current.items)
		expect(result.current.activePlatforms).toBe(result.current.activeItems)
	})

	// ── fetchList ──────────────────────────────────────────────────────────────

	it('fetchList() populates platforms in the store', async () => {
		const items = [createGamePlatform(), createGamePlatform()]
		server.use(http.get(`${BASE}/gameplatforms`, () => HttpResponse.json(makePagedPlatforms(items))))

		const { result } = renderHook(() => useGamePlatform(), {
			wrapper: createWrapperWithStore(store),
		})

		await act(async () => {
			await result.current.fetchList()
		})

		expect(result.current.items).toHaveLength(2)
		expect(result.current.loading).toBe(false)
	})

	// ── fetchActiveList ────────────────────────────────────────────────────────

	it('fetchActiveList() populates activeItems in the store', async () => {
		const items = [createGamePlatform({ isActive: true })]
		server.use(http.get(`${BASE}/gameplatforms/active`, () => HttpResponse.json(items)))

		const { result } = renderHook(() => useGamePlatform(), {
			wrapper: createWrapperWithStore(store),
		})

		await act(async () => {
			await result.current.fetchActiveList()
		})

		expect(result.current.activeItems).toHaveLength(1)
	})

	// ── createItem ─────────────────────────────────────────────────────────────

	it('createItem() calls create thunk and returns created platform', async () => {
		const created = createGamePlatform({ id: 99, name: 'PC', isActive: false })
		server.use(http.post(`${BASE}/gameplatforms`, () => HttpResponse.json(created)))

		const { result } = renderHook(() => useGamePlatform(), {
			wrapper: createWrapperWithStore(store),
		})

		let returnValue: any
		await act(async () => {
			returnValue = await result.current.createItem({ name: 'PC', isActive: false, color: '#fff' })
		})

		expect(returnValue).toMatchObject({ id: 99, name: 'PC' })
	})

	it('createItem() re-fetches active platforms when created item is active', async () => {
		const created = createGamePlatform({ id: 100, name: 'Xbox', isActive: true })
		server.use(http.post(`${BASE}/gameplatforms`, () => HttpResponse.json(created)))
		server.use(http.get(`${BASE}/gameplatforms/active`, () => HttpResponse.json([created])))

		const { result } = renderHook(() => useGamePlatform(), {
			wrapper: createWrapperWithStore(store),
		})

		await act(async () => {
			await result.current.createItem({ name: 'Xbox', isActive: true, color: '#fff' })
		})

		expect(result.current.activeItems).toHaveLength(1)
	})

	// ── updateItem ─────────────────────────────────────────────────────────────

	it('updateItem() calls update thunk and returns updated platform', async () => {
		const updated = createGamePlatform({ id: 5, name: 'Updated Platform' })
		server.use(http.put(`${BASE}/gameplatforms/5`, () => HttpResponse.json(updated)))
		server.use(http.get(`${BASE}/gameplatforms/5`, () => HttpResponse.json(updated)))
		server.use(http.get(`${BASE}/gameplatforms/active`, () => HttpResponse.json([updated])))

		const { result } = renderHook(() => useGamePlatform(), {
			wrapper: createWrapperWithStore(store),
		})

		let returnValue: any
		await act(async () => {
			returnValue = await result.current.updateItem(5, { id: 5, name: 'Updated Platform', isActive: true })
		})

		expect(returnValue).toMatchObject({ id: 5, name: 'Updated Platform' })
	})

	// ── deleteItem ─────────────────────────────────────────────────────────────

	it('deleteItem() calls delete thunk and returns true', async () => {
		server.use(http.delete(`${BASE}/gameplatforms/7`, () => new HttpResponse(null, { status: 204 })))

		const { result } = renderHook(() => useGamePlatform(), {
			wrapper: createWrapperWithStore(store),
		})

		let returnValue: any
		await act(async () => {
			returnValue = await result.current.deleteItem(7)
		})

		expect(returnValue).toBe(true)
	})

	// ── Backwards-compatible aliases ───────────────────────────────────────────

	it('exposes backwards-compatible alias loadPlatforms', () => {
		const { result } = renderHook(() => useGamePlatform(), {
			wrapper: createWrapperWithStore(store),
		})

		expect(typeof result.current.loadPlatforms).toBe('function')
	})

	it('exposes backwards-compatible alias createPlatform', () => {
		const { result } = renderHook(() => useGamePlatform(), {
			wrapper: createWrapperWithStore(store),
		})

		expect(typeof result.current.createPlatform).toBe('function')
	})

	// ── Error handling for each function ───────────────────────────────────────

	it('fetchActiveList rejects on failure', async () => {
		server.use(http.get(`${BASE}/gameplatforms/active`, () => HttpResponse.json({ message: 'fail' }, { status: 500 })))

		const { result } = renderHook(() => useGamePlatform(), { wrapper: createWrapperWithStore(store) })

		await act(async () => {
			await expect(result.current.fetchActiveList()).rejects.toBeDefined()
		})

		expect(result.current.loading).toBe(false)
	})

	it('createItem rejects on failure', async () => {
		server.use(http.post(`${BASE}/gameplatforms`, () => HttpResponse.json({ message: 'fail' }, { status: 500 })))

		const { result } = renderHook(() => useGamePlatform(), { wrapper: createWrapperWithStore(store) })

		await act(async () => {
			await expect(result.current.createItem({ name: 'Fail', isActive: true, color: '#f00' })).rejects.toBeDefined()
		})

		expect(result.current.loading).toBe(false)
	})

	it('updateItem rejects on failure', async () => {
		server.use(http.put(`${BASE}/gameplatforms/5`, () => HttpResponse.json({ message: 'fail' }, { status: 500 })))

		const { result } = renderHook(() => useGamePlatform(), { wrapper: createWrapperWithStore(store) })

		await act(async () => {
			await expect(result.current.updateItem(5, { id: 5, name: 'Fail', isActive: true })).rejects.toBeDefined()
		})

		expect(result.current.loading).toBe(false)
	})

	it('deleteItem rejects on failure', async () => {
		server.use(http.delete(`${BASE}/gameplatforms/99`, () => HttpResponse.json({ message: 'fail' }, { status: 500 })))

		const { result } = renderHook(() => useGamePlatform(), { wrapper: createWrapperWithStore(store) })

		await act(async () => {
			await expect(result.current.deleteItem(99)).rejects.toBeDefined()
		})

		expect(result.current.loading).toBe(false)
	})
})
