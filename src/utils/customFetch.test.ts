import { vi, describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'

// ── Mock external dependencies before importing customFetch ──────────────────
vi.mock('@/navigation/router', () => ({
	router: { navigate: vi.fn() },
}))

vi.mock('@/environments', () => ({
	environment: {
		baseUrl: 'https://localhost:7245/api',
		fallbackUrl: 'http://localhost:5011/api',
	},
}))

import { customFetch, initCustomFetch } from './customFetch'

// ── Helpers ───────────────────────────────────────────────────────────────────
const BASE = 'https://localhost:7245/api'

function makeStore(token: string | null) {
	return {
		getState: () => ({ auth: { token } }),
		dispatch: vi.fn(),
	}
}

const mockPersistor = { purge: vi.fn().mockResolvedValue(undefined) }
const mockForceLogout = vi.fn().mockReturnValue({ type: 'auth/forceLogout' })

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('customFetch', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		// Reset the isHandlingUnauthorized flag between tests by using fake timers
		// on 401 tests, or just let each test manage its own server handlers.
	})

	// ── Authorization header ─────────────────────────────────────────────────
	describe('Authorization header', () => {
		it('injects Bearer token when the store has a token', async () => {
			// Object wrapper prevents TypeScript from narrowing to `null` via control-flow
			const cap = { headers: null as Headers | null }

			server.use(
				http.get(`${BASE}/probe`, ({ request }) => {
					cap.headers = request.headers
					return HttpResponse.json({ ok: true })
				})
			)

			initCustomFetch(makeStore('my-jwt-token'), mockPersistor, mockForceLogout)
			await customFetch('/probe')

			expect(cap.headers?.get('Authorization')).toBe('Bearer my-jwt-token')
		})

		it('omits the Authorization header when there is no token', async () => {
			const cap = { headers: null as Headers | null }

			server.use(
				http.get(`${BASE}/probe`, ({ request }) => {
					cap.headers = request.headers
					return HttpResponse.json({ ok: true })
				})
			)

			initCustomFetch(makeStore(null), mockPersistor, mockForceLogout)
			await customFetch('/probe')

			expect(cap.headers?.has('Authorization')).toBe(false)
		})
	})

	// ── Query string ─────────────────────────────────────────────────────────
	describe('query string building', () => {
		it('appends scalar params as ?key=value pairs', async () => {
			let capturedUrl = ''

			server.use(
				http.get(`${BASE}/games`, ({ request }) => {
					capturedUrl = request.url
					return HttpResponse.json({ data: [], totalCount: 0, page: 1, pageSize: 50, totalPages: 0, hasNextPage: false, hasPreviousPage: false })
				})
			)

			initCustomFetch(makeStore(null), mockPersistor, mockForceLogout)
			await customFetch('/games', { params: { search: 'zelda', page: 2 } })

			expect(capturedUrl).toContain('search=zelda')
			expect(capturedUrl).toContain('page=2')
		})

		it('expands array params as repeated key=value entries', async () => {
			let capturedUrl = ''

			server.use(
				http.get(`${BASE}/games`, ({ request }) => {
					capturedUrl = request.url
					return HttpResponse.json({ data: [], totalCount: 0, page: 1, pageSize: 50, totalPages: 0, hasNextPage: false, hasPreviousPage: false })
				})
			)

			initCustomFetch(makeStore(null), mockPersistor, mockForceLogout)
			await customFetch('/games', { params: { excludeStatusIds: [1, 2, 3] } })

			expect(capturedUrl).toContain('excludeStatusIds=1')
			expect(capturedUrl).toContain('excludeStatusIds=2')
			expect(capturedUrl).toContain('excludeStatusIds=3')
		})

		it('sends no query string when params is empty', async () => {
			let capturedUrl = ''

			server.use(
				http.get(`${BASE}/games`, ({ request }) => {
					capturedUrl = request.url
					return HttpResponse.json({ data: [], totalCount: 0, page: 1, pageSize: 50, totalPages: 0, hasNextPage: false, hasPreviousPage: false })
				})
			)

			initCustomFetch(makeStore(null), mockPersistor, mockForceLogout)
			await customFetch('/games', { params: {} })

			expect(capturedUrl).not.toContain('?')
		})
	})

	// ── Request body ─────────────────────────────────────────────────────────
	describe('request body serialization', () => {
		it('serializes plain objects as JSON and sets Content-Type', async () => {
			let capturedContentType = ''
			let capturedBody: unknown = null

			server.use(
				http.post(`${BASE}/games`, async ({ request }) => {
					capturedContentType = request.headers.get('content-type') ?? ''
					capturedBody = await request.json()
					return HttpResponse.json({ id: 1 }, { status: 201 })
				})
			)

			initCustomFetch(makeStore('tok'), mockPersistor, mockForceLogout)
			await customFetch('/games', { method: 'POST', body: { name: 'Zelda', statusId: 1 } })

			expect(capturedContentType).toContain('application/json')
			expect(capturedBody).toEqual({ name: 'Zelda', statusId: 1 })
		})

		it('does not serialize FormData as JSON', async () => {
			let capturedContentType = ''

			server.use(
				http.post(`${BASE}/upload`, ({ request }) => {
					capturedContentType = request.headers.get('content-type') ?? ''
					return HttpResponse.json({ ok: true }, { status: 201 })
				})
			)

			initCustomFetch(makeStore(null), mockPersistor, mockForceLogout)
			const fd = new FormData()
			fd.append('file', new Blob(['data'], { type: 'text/plain' }), 'test.txt')
			await customFetch('/upload', { method: 'POST', body: fd })

			// FormData should NOT add application/json Content-Type
			expect(capturedContentType).not.toContain('application/json')
		})
	})

	// ── Response parsing ─────────────────────────────────────────────────────
	describe('response parsing', () => {
		it('parses JSON responses', async () => {
			server.use(
				http.get(`${BASE}/json-endpoint`, () => {
					return HttpResponse.json({ value: 42 })
				})
			)

			initCustomFetch(makeStore(null), mockPersistor, mockForceLogout)
			const result = await customFetch<{ value: number }>('/json-endpoint')

			expect(result).toEqual({ value: 42 })
		})

		it('parses text/* responses as string', async () => {
			server.use(
				http.get(`${BASE}/text-endpoint`, () => {
					return new HttpResponse('hello world', {
						headers: { 'Content-Type': 'text/plain' },
					})
				})
			)

			initCustomFetch(makeStore(null), mockPersistor, mockForceLogout)
			const result = await customFetch<string>('/text-endpoint')

			expect(result).toBe('hello world')
		})
	})

	// ── HTTP error handling ──────────────────────────────────────────────────
	describe('HTTP error handling', () => {
		it('throws with HTTP status message for non-401 errors', async () => {
			server.use(
				http.get(`${BASE}/not-found`, () => {
					return new HttpResponse('Not found', { status: 404, statusText: 'Not Found' })
				})
			)

			initCustomFetch(makeStore('tok'), mockPersistor, mockForceLogout)

			await expect(customFetch('/not-found')).rejects.toThrow('HTTP 404')
		})

		it('throws "Session expired" on 401 and calls forceLogout', async () => {
			vi.useFakeTimers()

			server.use(
				http.get(`${BASE}/protected`, () => {
					return new HttpResponse(null, { status: 401 })
				})
			)

			const mockStore = makeStore('expired-token')
			initCustomFetch(mockStore, mockPersistor, mockForceLogout)

			await expect(customFetch('/protected')).rejects.toThrow('Session expired')
			expect(mockForceLogout).toHaveBeenCalled()
			expect(mockStore.dispatch).toHaveBeenCalledWith({ type: 'auth/forceLogout' })

			// Advance timers so the flag resets for subsequent tests
			vi.runAllTimers()
			vi.useRealTimers()
		})
	})

	// ── Timeout ──────────────────────────────────────────────────────────────
	describe('timeout', () => {
		it('rejects with a timeout error when the request exceeds the limit', async () => {
			vi.useFakeTimers()

			server.use(
				http.get(`${BASE}/slow`, async () => {
					// Simulate a hanging response — in fake timer world this never settles
					await new Promise(() => {})
					return HttpResponse.json({})
				})
			)

			initCustomFetch(makeStore(null), mockPersistor, mockForceLogout)

			const fetchPromise = customFetch('/slow', { timeout: 500 })
			vi.advanceTimersByTime(600)

			await expect(fetchPromise).rejects.toThrow('timeout')

			vi.useRealTimers()
		})
	})

	// ── Custom baseURL ────────────────────────────────────────────────────────
	describe('baseURL override', () => {
		it('uses the provided baseURL instead of the environment default', async () => {
			const ALT_BASE = 'http://localhost:5011/api'
			let capturedUrl = ''

			server.use(
				http.get(`${ALT_BASE}/games`, ({ request }) => {
					capturedUrl = request.url
					return HttpResponse.json({ data: [], totalCount: 0, page: 1, pageSize: 50, totalPages: 0, hasNextPage: false, hasPreviousPage: false })
				})
			)

			initCustomFetch(makeStore(null), mockPersistor, mockForceLogout)
			await customFetch('/games', { baseURL: ALT_BASE })

			expect(capturedUrl).toContain(ALT_BASE)
		})
	})
})
