import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { createTestStore } from '@/test/utils/createTestStore'
import { createWrapperWithStore } from '@/test/utils/createWrapperWithStore'
import { createGameView, resetIdCounter } from '@/test/factories'
import { initCustomFetch } from '@/utils/customFetch'
import { useGameViews } from './useGameViews'

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

describe('useGameViews', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	// ── Initial state ──────────────────────────────────────────────────────────

	it('returns correct initial state shape', () => {
		const { result } = renderHook(() => useGameViews(), {
			wrapper: createWrapperWithStore(store),
		})

		expect(result.current.gameViews).toEqual([])
		expect(result.current.publicGameViews).toEqual([])
		expect(result.current.currentGameView).toBeNull()
		expect(result.current.loading).toBe(false)
		expect(result.current.error).toBeNull()
		expect(result.current.filters).toBeDefined()
	})

	// ── loadGameViews ──────────────────────────────────────────────────────────

	it('loadGameViews() populates gameViews in the store', async () => {
		const items = [createGameView(), createGameView()]
		// getGameViews returns a GameView[] directly (not paged)
		server.use(http.get(`${BASE}/gameviews`, () => HttpResponse.json(items)))

		const { result } = renderHook(() => useGameViews(), {
			wrapper: createWrapperWithStore(store),
		})

		await act(async () => {
			await result.current.loadGameViews()
		})

		expect(result.current.gameViews).toHaveLength(2)
		expect(result.current.loading).toBe(false)
	})

	// ── loadPublicGameViews ────────────────────────────────────────────────────

	it('loadPublicGameViews() populates publicGameViews in the store', async () => {
		const items = [createGameView({ isPublic: true })]
		// getPublicGameViews internally calls getGameViews({ isPublic: true }) → GET /gameviews
		server.use(http.get(`${BASE}/gameviews`, () => HttpResponse.json(items)))

		const { result } = renderHook(() => useGameViews(), {
			wrapper: createWrapperWithStore(store),
		})

		await act(async () => {
			await result.current.loadPublicGameViews()
		})

		expect(result.current.publicGameViews).toHaveLength(1)
	})

	// ── loadGameViewById ───────────────────────────────────────────────────────

	it('loadGameViewById() fetches and sets currentGameView', async () => {
		const view = createGameView({ id: 5, name: 'My View' })
		server.use(http.get(`${BASE}/gameviews/5`, () => HttpResponse.json(view)))

		const { result } = renderHook(() => useGameViews(), {
			wrapper: createWrapperWithStore(store),
		})

		await act(async () => {
			await result.current.loadGameViewById(5)
		})

		expect(result.current.currentGameView).toMatchObject({ id: 5, name: 'My View' })
	})

	// ── createGameView ─────────────────────────────────────────────────────────

	it('createGameView() calls create thunk and returns created view', async () => {
		const created = createGameView({ id: 99, name: 'New View' })
		server.use(http.post(`${BASE}/gameviews`, () => HttpResponse.json(created)))

		const { result } = renderHook(() => useGameViews(), {
			wrapper: createWrapperWithStore(store),
		})

		let returnValue: any
		await act(async () => {
			returnValue = await result.current.createGameView({ name: 'New View', isPublic: false, configuration: { sorting: [] } })
		})

		expect(returnValue).toMatchObject({ id: 99, name: 'New View' })
	})

	// ── updateGameView ─────────────────────────────────────────────────────────

	it('updateGameView() calls update thunk and returns updated view', async () => {
		const updated = createGameView({ id: 5, name: 'Updated View' })
		server.use(http.put(`${BASE}/gameviews/5`, () => HttpResponse.json(updated)))
		server.use(http.get(`${BASE}/gameviews/5`, () => HttpResponse.json(updated)))

		const { result } = renderHook(() => useGameViews(), {
			wrapper: createWrapperWithStore(store),
		})

		let returnValue: any
		await act(async () => {
			returnValue = await result.current.updateGameView(5, { id: 5, name: 'Updated View', configuration: { sorting: [] } })
		})

		expect(returnValue).toMatchObject({ id: 5, name: 'Updated View' })
	})

	// ── deleteGameView ─────────────────────────────────────────────────────────

	it('deleteGameView() calls delete thunk', async () => {
		server.use(http.delete(`${BASE}/gameviews/7`, () => new HttpResponse(null, { status: 204 })))

		const { result } = renderHook(() => useGameViews(), {
			wrapper: createWrapperWithStore(store),
		})

		await act(async () => {
			await result.current.deleteGameView(7)
		})

		expect(result.current.error).toBeNull()
	})

	// ── updateGameViewConfig ───────────────────────────────────────────────────

	it('updateGameViewConfig() calls configuration update thunk', async () => {
		const updated = createGameView({ id: 5, configuration: { sorting: [{ field: 'name', direction: 'asc' }] } as any })
		server.use(http.put(`${BASE}/gameviews/5/configuration`, () => HttpResponse.json(updated)))

		const { result } = renderHook(() => useGameViews(), {
			wrapper: createWrapperWithStore(store),
		})

		await act(async () => {
			await result.current.updateGameViewConfig(5, { sorting: [{ field: 'name', direction: 'asc' }] })
		})

		expect(result.current.error).toBeNull()
	})

	// ── selectGameView ─────────────────────────────────────────────────────────

	it('selectGameView() sets currentGameView synchronously', () => {
		const view = createGameView({ id: 3, name: 'Test View' })

		const { result } = renderHook(() => useGameViews(), {
			wrapper: createWrapperWithStore(store),
		})

		act(() => {
			result.current.selectGameView(view)
		})

		expect(result.current.currentGameView).toMatchObject({ id: 3, name: 'Test View' })
	})

	// ── setGameViewFilters / resetGameViewFilters ──────────────────────────────

	it('setGameViewFilters() updates filter state', () => {
		const { result } = renderHook(() => useGameViews(), {
			wrapper: createWrapperWithStore(store),
		})

		act(() => {
			result.current.setGameViewFilters({ page: 2 })
		})

		expect(result.current.filters).toMatchObject({ page: 2 })
	})

	it('resetGameViewFilters() clears filter state', () => {
		const { result } = renderHook(() => useGameViews(), {
			wrapper: createWrapperWithStore(store),
		})

		act(() => {
			result.current.setGameViewFilters({ page: 3 })
		})

		act(() => {
			result.current.resetGameViewFilters()
		})

		expect(result.current.filters).toEqual({})
	})
})
