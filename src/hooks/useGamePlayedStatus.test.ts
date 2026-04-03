import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { createTestStore } from '@/test/utils/createTestStore'
import { createWrapperWithStore } from '@/test/utils/createWrapperWithStore'
import { createGamePlayedStatus, resetIdCounter } from '@/test/factories'
import { initCustomFetch } from '@/utils/customFetch'
import { useGamePlayedStatus } from './useGamePlayedStatus'

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

function makePagedPlayedStatuses(items: ReturnType<typeof createGamePlayedStatus>[]) {
	return { data: items, page: 1, pageSize: 50, totalCount: items.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
}

describe('useGamePlayedStatus', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	// ── Initial state ──────────────────────────────────────────────────────────

	it('returns correct initial state shape', () => {
		const { result } = renderHook(() => useGamePlayedStatus(), {
			wrapper: createWrapperWithStore(store),
		})

		expect(result.current.items).toEqual([])
		expect(result.current.activeItems).toEqual([])
		expect(result.current.loading).toBe(false)
		expect(result.current.error).toBeNull()
		// Backwards-compatible aliases
		expect(result.current.playedStatuses).toBe(result.current.items)
		expect(result.current.activePlayedStatuses).toBe(result.current.activeItems)
	})

	// ── fetchList ──────────────────────────────────────────────────────────────

	it('fetchList() populates items in the store', async () => {
		const items = [createGamePlayedStatus(), createGamePlayedStatus()]
		server.use(http.get(`${BASE}/gameplayedstatus`, () => HttpResponse.json(makePagedPlayedStatuses(items))))

		const { result } = renderHook(() => useGamePlayedStatus(), {
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
		const items = [createGamePlayedStatus({ isActive: true })]
		server.use(http.get(`${BASE}/gameplayedstatus/active`, () => HttpResponse.json(items)))

		const { result } = renderHook(() => useGamePlayedStatus(), {
			wrapper: createWrapperWithStore(store),
		})

		await act(async () => {
			await result.current.fetchActiveList()
		})

		expect(result.current.activeItems).toHaveLength(1)
	})

	// ── createItem ─────────────────────────────────────────────────────────────

	it('createItem() calls create thunk and returns created item', async () => {
		const created = createGamePlayedStatus({ id: 99, name: 'Finished', isActive: false })
		server.use(http.post(`${BASE}/gameplayedstatus`, () => HttpResponse.json(created)))

		const { result } = renderHook(() => useGamePlayedStatus(), {
			wrapper: createWrapperWithStore(store),
		})

		let returnValue: any
		await act(async () => {
			returnValue = await result.current.createItem({ name: 'Finished', isActive: false, color: '#fff' })
		})

		expect(returnValue).toMatchObject({ id: 99, name: 'Finished' })
	})

	it('createItem() re-fetches active items when created item is active', async () => {
		const created = createGamePlayedStatus({ id: 100, name: 'Playing', isActive: true })
		server.use(http.post(`${BASE}/gameplayedstatus`, () => HttpResponse.json(created)))
		server.use(http.get(`${BASE}/gameplayedstatus/active`, () => HttpResponse.json([created])))

		const { result } = renderHook(() => useGamePlayedStatus(), {
			wrapper: createWrapperWithStore(store),
		})

		await act(async () => {
			await result.current.createItem({ name: 'Playing', isActive: true, color: '#fff' })
		})

		expect(result.current.activeItems).toHaveLength(1)
	})

	// ── updateItem ─────────────────────────────────────────────────────────────

	it('updateItem() calls update thunk and returns updated item', async () => {
		const updated = createGamePlayedStatus({ id: 5, name: 'Updated Status' })
		server.use(http.put(`${BASE}/gameplayedstatus/5`, () => HttpResponse.json(updated)))
		server.use(http.get(`${BASE}/gameplayedstatus/5`, () => HttpResponse.json(updated)))
		server.use(http.get(`${BASE}/gameplayedstatus/active`, () => HttpResponse.json([updated])))

		const { result } = renderHook(() => useGamePlayedStatus(), {
			wrapper: createWrapperWithStore(store),
		})

		let returnValue: any
		await act(async () => {
			returnValue = await result.current.updateItem(5, { id: 5, name: 'Updated Status', isActive: true })
		})

		expect(returnValue).toMatchObject({ id: 5, name: 'Updated Status' })
	})

	// ── deleteItem ─────────────────────────────────────────────────────────────

	it('deleteItem() calls delete thunk and returns true', async () => {
		server.use(http.delete(`${BASE}/gameplayedstatus/7`, () => new HttpResponse(null, { status: 204 })))

		const { result } = renderHook(() => useGamePlayedStatus(), {
			wrapper: createWrapperWithStore(store),
		})

		let returnValue: any
		await act(async () => {
			returnValue = await result.current.deleteItem(7)
		})

		expect(returnValue).toBe(true)
	})

	// ── Backwards-compatible aliases ───────────────────────────────────────────

	it('exposes backwards-compatible aliases', () => {
		const { result } = renderHook(() => useGamePlayedStatus(), {
			wrapper: createWrapperWithStore(store),
		})

		expect(typeof result.current.loadPlayedStatuses).toBe('function')
		expect(typeof result.current.createPlayedStatus).toBe('function')
		expect(typeof result.current.updatePlayedStatus).toBe('function')
		expect(typeof result.current.deletePlayedStatus).toBe('function')
	})
})
