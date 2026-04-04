import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { createTestStore } from '@/test/utils/createTestStore'
import { createWrapperWithStore } from '@/test/utils/createWrapperWithStore'
import { createGamePlayWith, resetIdCounter } from '@/test/factories'
import { initCustomFetch } from '@/utils/customFetch'
import { useGamePlayWith } from './useGamePlayWith'

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

function makePagedPlayWith(items: ReturnType<typeof createGamePlayWith>[]) {
	return { data: items, page: 1, pageSize: 50, totalCount: items.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
}

describe('useGamePlayWith', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		resetIdCounter()
		store = createTestStore()
		initCustomFetch(store, mockPersistor, mockForceLogout)
	})

	// ── Initial state ──────────────────────────────────────────────────────────

	it('returns correct initial state shape', () => {
		const { result } = renderHook(() => useGamePlayWith(), {
			wrapper: createWrapperWithStore(store),
		})

		expect(result.current.options).toEqual([])
		expect(result.current.activeOptions).toEqual([])
		expect(result.current.loading).toBe(false)
		expect(result.current.error).toBeNull()
		// Backwards-compatible aliases
		expect(result.current.playWiths).toBe(result.current.options)
		expect(result.current.activePlayWiths).toBe(result.current.activeOptions)
	})

	// ── fetchOptions ───────────────────────────────────────────────────────────

	it('fetchOptions() populates options in the store', async () => {
		const items = [createGamePlayWith(), createGamePlayWith()]
		server.use(http.get(`${BASE}/gameplaywith`, () => HttpResponse.json(makePagedPlayWith(items))))

		const { result } = renderHook(() => useGamePlayWith(), {
			wrapper: createWrapperWithStore(store),
		})

		await act(async () => {
			await result.current.fetchOptions()
		})

		expect(result.current.options).toHaveLength(2)
		expect(result.current.loading).toBe(false)
	})

	// ── fetchActiveOptions ─────────────────────────────────────────────────────

	it('fetchActiveOptions() populates activeOptions in the store', async () => {
		const items = [createGamePlayWith({ isActive: true })]
		server.use(http.get(`${BASE}/gameplaywith/active`, () => HttpResponse.json(items)))

		const { result } = renderHook(() => useGamePlayWith(), {
			wrapper: createWrapperWithStore(store),
		})

		await act(async () => {
			await result.current.fetchActiveOptions()
		})

		expect(result.current.activeOptions).toHaveLength(1)
	})

	// ── createOption ───────────────────────────────────────────────────────────

	it('createOption() calls create thunk and returns created option', async () => {
		const created = createGamePlayWith({ id: 99, name: 'Solo', isActive: false })
		server.use(http.post(`${BASE}/gameplaywith`, () => HttpResponse.json(created)))

		const { result } = renderHook(() => useGamePlayWith(), {
			wrapper: createWrapperWithStore(store),
		})

		let returnValue: any
		await act(async () => {
			returnValue = await result.current.createOption({ name: 'Solo', isActive: false, color: '#fff' })
		})

		expect(returnValue).toMatchObject({ id: 99, name: 'Solo' })
	})

	it('createOption() re-fetches active options when created option is active', async () => {
		const created = createGamePlayWith({ id: 100, name: 'Co-op', isActive: true })
		server.use(http.post(`${BASE}/gameplaywith`, () => HttpResponse.json(created)))
		server.use(http.get(`${BASE}/gameplaywith/active`, () => HttpResponse.json([created])))

		const { result } = renderHook(() => useGamePlayWith(), {
			wrapper: createWrapperWithStore(store),
		})

		await act(async () => {
			await result.current.createOption({ name: 'Co-op', isActive: true, color: '#fff' })
		})

		expect(result.current.activeOptions).toHaveLength(1)
	})

	// ── updateOption ───────────────────────────────────────────────────────────

	it('updateOption() calls update thunk and returns updated option', async () => {
		const updated = createGamePlayWith({ id: 5, name: 'Updated Co-op' })
		server.use(http.put(`${BASE}/gameplaywith/5`, () => HttpResponse.json(updated)))
		server.use(http.get(`${BASE}/gameplaywith/5`, () => HttpResponse.json(updated)))
		server.use(http.get(`${BASE}/gameplaywith`, () => HttpResponse.json(makePagedPlayWith([updated]))))
		server.use(http.get(`${BASE}/gameplaywith/active`, () => HttpResponse.json([updated])))

		const { result } = renderHook(() => useGamePlayWith(), {
			wrapper: createWrapperWithStore(store),
		})

		let returnValue: any
		await act(async () => {
			returnValue = await result.current.updateOption(5, { id: 5, name: 'Updated Co-op', isActive: true })
		})

		expect(returnValue).toMatchObject({ id: 5, name: 'Updated Co-op' })
	})

	// ── deleteOption ───────────────────────────────────────────────────────────

	it('deleteOption() calls delete thunk and returns true', async () => {
		server.use(http.delete(`${BASE}/gameplaywith/7`, () => new HttpResponse(null, { status: 204 })))

		const { result } = renderHook(() => useGamePlayWith(), {
			wrapper: createWrapperWithStore(store),
		})

		let returnValue: any
		await act(async () => {
			returnValue = await result.current.deleteOption(7)
		})

		expect(returnValue).toBe(true)
	})

	// ── Error handling ─────────────────────────────────────────────────────────

	it('sets error state on fetch failure', async () => {
		server.use(http.get(`${BASE}/gameplaywith`, () => HttpResponse.json({ message: 'Error' }, { status: 500 })))

		const { result } = renderHook(() => useGamePlayWith(), {
			wrapper: createWrapperWithStore(store),
		})

		await act(async () => {
			await result.current.fetchOptions()
		})

		expect(result.current.loading).toBe(false)
	})

	// ── Backwards-compatible aliases ───────────────────────────────────────────

	it('exposes backwards-compatible aliases', () => {
		const { result } = renderHook(() => useGamePlayWith(), {
			wrapper: createWrapperWithStore(store),
		})

		expect(typeof result.current.loadPlayWiths).toBe('function')
		expect(typeof result.current.createPlayWith).toBe('function')
		expect(typeof result.current.updatePlayWith).toBe('function')
		expect(typeof result.current.deletePlayWith).toBe('function')
	})

	// ── Error handling for each function ───────────────────────────────────────

	it('fetchActiveOptions sets error on failure', async () => {
		server.use(http.get(`${BASE}/gameplaywith/active`, () => HttpResponse.json({ message: 'fail' }, { status: 500 })))

		const { result } = renderHook(() => useGamePlayWith(), { wrapper: createWrapperWithStore(store) })

		await act(async () => {
			await result.current.fetchActiveOptions()
		})

		expect(result.current.loading).toBe(false)
	})

	it('createOption sets error and throws on failure', async () => {
		server.use(http.post(`${BASE}/gameplaywith`, () => HttpResponse.json({ message: 'fail' }, { status: 500 })))

		const { result } = renderHook(() => useGamePlayWith(), { wrapper: createWrapperWithStore(store) })

		await act(async () => {
			await expect(result.current.createOption({ name: 'Fail', isActive: true, color: '#f00' })).rejects.toBeDefined()
		})

		expect(result.current.loading).toBe(false)
	})

	it('updateOption sets error and throws on failure', async () => {
		server.use(http.put(`${BASE}/gameplaywith/5`, () => HttpResponse.json({ message: 'fail' }, { status: 500 })))

		const { result } = renderHook(() => useGamePlayWith(), { wrapper: createWrapperWithStore(store) })

		await act(async () => {
			await expect(result.current.updateOption(5, { id: 5, name: 'Fail', isActive: true })).rejects.toBeDefined()
		})

		expect(result.current.loading).toBe(false)
	})

	it('deleteOption sets error and throws on failure', async () => {
		server.use(http.delete(`${BASE}/gameplaywith/99`, () => HttpResponse.json({ message: 'fail' }, { status: 500 })))

		const { result } = renderHook(() => useGamePlayWith(), { wrapper: createWrapperWithStore(store) })

		await act(async () => {
			await expect(result.current.deleteOption(99)).rejects.toBeDefined()
		})

		expect(result.current.loading).toBe(false)
	})
})
