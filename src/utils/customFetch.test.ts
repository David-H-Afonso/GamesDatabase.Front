import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'

// ── Mock external dependencies before importing customFetch ──────────────────
vi.mock('@/navigation/router', () => ({
	router: { navigate: vi.fn() },
}))

vi.mock('@/environments', () => ({
	environment: { baseUrl: 'https://localhost:7245/api' },
}))

import { customFetch, initCustomFetch, purgePersistedState } from './customFetch'
import { router } from '@/navigation/router'

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE = 'https://localhost:7245/api'

function makeStore(token: string | null) {
	return {
		getState: () => ({ auth: { token } }),
		dispatch: vi.fn(),
	}
}

function makePersistor() {
	return { purge: vi.fn().mockResolvedValue(undefined) }
}

const pagedEmpty = { data: [], page: 1, pageSize: 50, totalCount: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false }

let store: ReturnType<typeof makeStore>
let persistor: ReturnType<typeof makePersistor>
let forceLogout: ReturnType<typeof vi.fn>

beforeEach(() => {
	vi.clearAllMocks()
	store = makeStore(null)
	persistor = makePersistor()
	forceLogout = vi.fn().mockReturnValue({ type: 'auth/forceLogout' })
	initCustomFetch(store, persistor, forceLogout)
})

// ── 1. initCustomFetch ────────────────────────────────────────────────────────

describe('initCustomFetch', () => {
	it('reinitializing overwrites the store: new token is used on the next request', async () => {
		const cap = { auth: null as string | null }
		server.use(
			http.get(`${BASE}/probe`, ({ request }) => {
				cap.auth = request.headers.get('Authorization')
				return HttpResponse.json({})
			})
		)

		initCustomFetch(makeStore(null), persistor, forceLogout)
		await customFetch('/probe')
		expect(cap.auth).toBeNull()

		initCustomFetch(makeStore('new-tok'), persistor, forceLogout)
		await customFetch('/probe')
		expect(cap.auth).toBe('Bearer new-tok')
	})
})

// ── 2. purgePersistedState ────────────────────────────────────────────────────

describe('purgePersistedState', () => {
	it('calls persistor.purge() once', () => {
		purgePersistedState()
		expect(persistor.purge).toHaveBeenCalledTimes(1)
	})

	it('is safe to call multiple times', () => {
		purgePersistedState()
		purgePersistedState()
		expect(persistor.purge).toHaveBeenCalledTimes(2)
	})
})

// ── 3. Authorization header ───────────────────────────────────────────────────

describe('Authorization header', () => {
	it('injects Bearer token when the store has a non-empty token', async () => {
		const cap = { auth: null as string | null }
		server.use(
			http.get(`${BASE}/probe`, ({ request }) => {
				cap.auth = request.headers.get('Authorization')
				return HttpResponse.json({})
			})
		)
		initCustomFetch(makeStore('my-jwt-token'), persistor, forceLogout)
		await customFetch('/probe')
		expect(cap.auth).toBe('Bearer my-jwt-token')
	})

	it('omits Authorization when token is null', async () => {
		const cap = { has: true }
		server.use(
			http.get(`${BASE}/probe`, ({ request }) => {
				cap.has = request.headers.has('Authorization')
				return HttpResponse.json({})
			})
		)
		initCustomFetch(makeStore(null), persistor, forceLogout)
		await customFetch('/probe')
		expect(cap.has).toBe(false)
	})

	it('omits Authorization when token is an empty string (falsy)', async () => {
		const cap = { has: true }
		server.use(
			http.get(`${BASE}/probe`, ({ request }) => {
				cap.has = request.headers.has('Authorization')
				return HttpResponse.json({})
			})
		)
		initCustomFetch(makeStore(''), persistor, forceLogout)
		await customFetch('/probe')
		expect(cap.has).toBe(false)
	})
})

// ── 4. Query string building ──────────────────────────────────────────────────

describe('query string building', () => {
	function captureUrl(endpoint = '/games') {
		let url = ''
		server.use(
			http.get(`${BASE}${endpoint}`, ({ request }) => {
				url = request.url
				return HttpResponse.json(pagedEmpty)
			})
		)
		return { get: () => url }
	}

	it('sends no query string when params is omitted', async () => {
		const cap = captureUrl()
		await customFetch('/games')
		expect(cap.get()).not.toContain('?')
	})

	it('sends no query string when params is an empty object', async () => {
		const cap = captureUrl()
		await customFetch('/games', { params: {} })
		expect(cap.get()).not.toContain('?')
	})

	it('appends a single string param', async () => {
		const cap = captureUrl()
		await customFetch('/games', { params: { search: 'zelda' } })
		expect(cap.get()).toContain('search=zelda')
	})

	it('converts a numeric param to its string representation', async () => {
		const cap = captureUrl()
		await customFetch('/games', { params: { page: 3 } })
		expect(cap.get()).toContain('page=3')
	})

	it('converts boolean true to "true"', async () => {
		const cap = captureUrl()
		await customFetch('/games', { params: { isActive: true } })
		expect(cap.get()).toContain('isActive=true')
	})

	it('converts boolean false to "false"', async () => {
		const cap = captureUrl()
		await customFetch('/games', { params: { includePrivate: false } })
		expect(cap.get()).toContain('includePrivate=false')
	})

	it('appends multiple scalar params together', async () => {
		const cap = captureUrl()
		await customFetch('/games', { params: { search: 'mario', page: 2, pageSize: 20 } })
		expect(cap.get()).toContain('search=mario')
		expect(cap.get()).toContain('page=2')
		expect(cap.get()).toContain('pageSize=20')
	})

	it('expands an array param as repeated key=value entries', async () => {
		const cap = captureUrl()
		await customFetch('/games', { params: { excludeStatusIds: [1, 2, 3] } })
		expect(cap.get()).toContain('excludeStatusIds=1')
		expect(cap.get()).toContain('excludeStatusIds=2')
		expect(cap.get()).toContain('excludeStatusIds=3')
	})

	it('handles mixed scalar and array params', async () => {
		const cap = captureUrl()
		await customFetch('/games', { params: { page: 1, statusIds: [10, 20] } })
		expect(cap.get()).toContain('page=1')
		expect(cap.get()).toContain('statusIds=10')
		expect(cap.get()).toContain('statusIds=20')
	})

	it('URL-encodes params with special characters (spaces)', async () => {
		const cap = captureUrl()
		await customFetch('/games', { params: { search: 'the witcher 3' } })
		expect(cap.get()).toMatch(/search=the(%20|\+)witcher(%20|\+)3/)
	})
})

// ── 5. HTTP methods and body handling ────────────────────────────────────────

describe('HTTP methods and body handling', () => {
	it('GET does not send a body even when body option is provided', async () => {
		let ct = 'not-set'
		server.use(
			http.get(`${BASE}/games`, ({ request }) => {
				ct = request.headers.get('content-type') ?? 'not-set'
				return HttpResponse.json(pagedEmpty)
			})
		)
		await customFetch('/games', { method: 'GET', body: { shouldBeIgnored: true } })
		expect(ct).not.toContain('application/json')
	})

	it('HEAD does not send a body even when body option is provided', async () => {
		let ct = 'not-set'
		server.use(
			http.head(`${BASE}/resource`, ({ request }) => {
				ct = request.headers.get('content-type') ?? 'not-set'
				return new HttpResponse(null, { status: 200 })
			})
		)
		await customFetch('/resource', { method: 'HEAD', body: { shouldBeIgnored: true } })
		expect(ct).not.toContain('application/json')
	})

	it('POST sends the body with Content-Type: application/json', async () => {
		let ct = ''
		let body: unknown = null
		server.use(
			http.post(`${BASE}/games`, async ({ request }) => {
				ct = request.headers.get('content-type') ?? ''
				body = await request.json()
				return HttpResponse.json({ id: 1 }, { status: 201 })
			})
		)
		await customFetch('/games', { method: 'POST', body: { name: 'Test Game' } })
		expect(ct).toContain('application/json')
		expect(body).toEqual({ name: 'Test Game' })
	})

	it('PUT sends the body', async () => {
		let body: unknown = null
		server.use(
			http.put(`${BASE}/games/1`, async ({ request }) => {
				body = await request.json()
				return HttpResponse.json({ id: 1 })
			})
		)
		await customFetch('/games/1', { method: 'PUT', body: { name: 'Updated Game' } })
		expect(body).toEqual({ name: 'Updated Game' })
	})

	it('PATCH sends the body', async () => {
		let body: unknown = null
		server.use(
			http.patch(`${BASE}/games/1`, async ({ request }) => {
				body = await request.json()
				return HttpResponse.json({ id: 1 })
			})
		)
		await customFetch('/games/1', { method: 'PATCH', body: { score: 9 } })
		expect(body).toEqual({ score: 9 })
	})

	it('DELETE with 204 No Content resolves without error', async () => {
		server.use(http.delete(`${BASE}/games/5`, () => new HttpResponse(null, { status: 204 })))
		await expect(customFetch('/games/5', { method: 'DELETE' })).resolves.toBeDefined()
	})
})

// ── 6. Body serialization ─────────────────────────────────────────────────────

describe('body serialization', () => {
	it('serializes a plain object as JSON', async () => {
		let body: unknown = null
		server.use(
			http.post(`${BASE}/test`, async ({ request }) => {
				body = await request.json()
				return HttpResponse.json({ ok: true }, { status: 201 })
			})
		)
		await customFetch('/test', { method: 'POST', body: { a: 1, b: 'two' } })
		expect(body).toEqual({ a: 1, b: 'two' })
	})

	it('serializes a nested object correctly', async () => {
		let body: unknown = null
		server.use(
			http.post(`${BASE}/test`, async ({ request }) => {
				body = await request.json()
				return HttpResponse.json({ ok: true }, { status: 201 })
			})
		)
		await customFetch('/test', { method: 'POST', body: { nested: { ids: [1, 2] } } })
		expect(body).toEqual({ nested: { ids: [1, 2] } })
	})

	it('serializes an array as JSON', async () => {
		let body: unknown = null
		server.use(
			http.post(`${BASE}/bulk`, async ({ request }) => {
				body = await request.json()
				return HttpResponse.json({ ok: true }, { status: 200 })
			})
		)
		await customFetch('/bulk', { method: 'POST', body: [1, 2, 3] })
		expect(body).toEqual([1, 2, 3])
	})

	it('does NOT set application/json Content-Type for FormData body', async () => {
		let ct = ''
		server.use(
			http.post(`${BASE}/upload`, ({ request }) => {
				ct = request.headers.get('content-type') ?? ''
				return HttpResponse.json({ ok: true }, { status: 201 })
			})
		)
		const fd = new FormData()
		fd.append('name', 'test')
		await customFetch('/upload', { method: 'POST', body: fd })
		expect(ct).not.toContain('application/json')
	})

	it('does NOT set application/json Content-Type for URLSearchParams body', async () => {
		let ct = ''
		server.use(
			http.post(`${BASE}/form`, ({ request }) => {
				ct = request.headers.get('content-type') ?? ''
				return HttpResponse.json({ ok: true }, { status: 201 })
			})
		)
		await customFetch('/form', { method: 'POST', body: new URLSearchParams({ key: 'value' }) })
		expect(ct).not.toContain('application/json')
	})

	it('does NOT set application/json Content-Type for a Blob body', async () => {
		let ct = ''
		server.use(
			http.post(`${BASE}/blob`, ({ request }) => {
				ct = request.headers.get('content-type') ?? ''
				return HttpResponse.json({ ok: true }, { status: 201 })
			})
		)
		await customFetch('/blob', { method: 'POST', body: new Blob(['data'], { type: 'text/plain' }) })
		expect(ct).not.toContain('application/json')
	})

	it('does not set Content-Type when body is undefined', async () => {
		let ct = 'not-set'
		server.use(
			http.post(`${BASE}/no-body`, ({ request }) => {
				ct = request.headers.get('content-type') ?? 'not-set'
				return HttpResponse.json({ ok: true }, { status: 201 })
			})
		)
		await customFetch('/no-body', { method: 'POST' })
		expect(ct).toBe('not-set')
	})
})

// ── 7. Response parsing ───────────────────────────────────────────────────────

describe('response parsing', () => {
	it('parses application/json responses as a JS object', async () => {
		server.use(http.get(`${BASE}/json`, () => HttpResponse.json({ id: 1, name: 'Zelda' })))
		const result = await customFetch<{ id: number; name: string }>('/json')
		expect(result).toEqual({ id: 1, name: 'Zelda' })
	})

	it('parses text/plain response as a string', async () => {
		server.use(http.get(`${BASE}/plain`, () => new HttpResponse('hello world', { headers: { 'Content-Type': 'text/plain' } })))
		const result = await customFetch<string>('/plain')
		expect(result).toBe('hello world')
	})

	it('parses text/html response as a string', async () => {
		server.use(http.get(`${BASE}/html`, () => new HttpResponse('<h1>Hi</h1>', { headers: { 'Content-Type': 'text/html' } })))
		const result = await customFetch<string>('/html')
		expect(result).toContain('<h1>Hi</h1>')
	})

	it('parses application/octet-stream response as a Blob', async () => {
		server.use(http.get(`${BASE}/binary`, () => new HttpResponse(new Uint8Array([1, 2, 3]).buffer, { headers: { 'Content-Type': 'application/octet-stream' } })))
		const result = await customFetch('/binary')
		// jsdom may return a cross-realm Blob; use constructor name to avoid instanceof pitfall
		expect((result as Blob).constructor.name).toBe('Blob')
		expect((result as Blob).size).toBeGreaterThan(0)
	})

	it('parses image/* response as a Blob', async () => {
		server.use(http.get(`${BASE}/image`, () => new HttpResponse(new Uint8Array([0x89, 0x50]).buffer, { headers: { 'Content-Type': 'image/png' } })))
		const result = await customFetch('/image')
		// jsdom may return a cross-realm Blob; check constructor name
		expect((result as Blob).constructor.name).toBe('Blob')
		expect((result as Blob).type).toBe('image/png')
	})

	it('falls back to text parsing for an unknown content-type', async () => {
		server.use(http.get(`${BASE}/custom`, () => new HttpResponse('raw content', { headers: { 'Content-Type': 'application/x-custom-type' } })))
		const result = await customFetch<string>('/custom')
		expect(typeof result).toBe('string')
		expect(result).toBe('raw content')
	})

	it('resolves (returns empty string) for 204 No Content', async () => {
		server.use(http.delete(`${BASE}/resource/1`, () => new HttpResponse(null, { status: 204 })))
		const result = await customFetch('/resource/1', { method: 'DELETE' })
		expect(result).toBe('')
	})
})

// ── 8. Custom headers ─────────────────────────────────────────────────────────

describe('custom headers', () => {
	it('merges custom headers into the request', async () => {
		let xCustom = ''
		server.use(
			http.get(`${BASE}/probe`, ({ request }) => {
				xCustom = request.headers.get('X-Custom-Header') ?? ''
				return HttpResponse.json({})
			})
		)
		await customFetch('/probe', { headers: { 'X-Custom-Header': 'my-value' } })
		expect(xCustom).toBe('my-value')
	})

	it('Authorization header is present alongside custom headers', async () => {
		const cap = { auth: null as string | null, rid: null as string | null }
		server.use(
			http.get(`${BASE}/probe`, ({ request }) => {
				cap.auth = request.headers.get('Authorization')
				cap.rid = request.headers.get('X-Request-Id')
				return HttpResponse.json({})
			})
		)
		initCustomFetch(makeStore('tok123'), persistor, forceLogout)
		await customFetch('/probe', { headers: { 'X-Request-Id': 'abc-123' } })
		expect(cap.auth).toBe('Bearer tok123')
		expect(cap.rid).toBe('abc-123')
	})

	it('custom headers supplied without a token still reach the server', async () => {
		let xTrace = ''
		server.use(
			http.get(`${BASE}/probe`, ({ request }) => {
				xTrace = request.headers.get('X-Trace-Id') ?? ''
				return HttpResponse.json({})
			})
		)
		// store has no token (default beforeEach)
		await customFetch('/probe', { headers: { 'X-Trace-Id': 'trace-42' } })
		expect(xTrace).toBe('trace-42')
	})
})

// ── 9. baseURL override ───────────────────────────────────────────────────────

describe('baseURL override', () => {
	const ALT = 'http://127.0.0.1:5011/api'

	it('uses the provided baseURL instead of the environment default', async () => {
		let capturedUrl = ''
		server.use(
			http.get(`${ALT}/games`, ({ request }) => {
				capturedUrl = request.url
				return HttpResponse.json(pagedEmpty)
			})
		)
		await customFetch('/games', { baseURL: ALT })
		expect(capturedUrl).toContain(ALT)
	})

	it('combines custom baseURL + endpoint + query string', async () => {
		let capturedUrl = ''
		server.use(
			http.get(`${ALT}/games`, ({ request }) => {
				capturedUrl = request.url
				return HttpResponse.json(pagedEmpty)
			})
		)
		await customFetch('/games', { baseURL: ALT, params: { page: 2 } })
		expect(capturedUrl).toContain(ALT)
		expect(capturedUrl).toContain('page=2')
	})
})

// ── 10. HTTP error handling ───────────────────────────────────────────────────

describe('HTTP error handling', () => {
	it('throws for 400 Bad Request', async () => {
		server.use(http.get(`${BASE}/bad`, () => new HttpResponse('Bad input', { status: 400, statusText: 'Bad Request' })))
		await expect(customFetch('/bad')).rejects.toThrow('HTTP 400')
	})

	it('throws for 403 Forbidden', async () => {
		server.use(http.get(`${BASE}/forbidden`, () => new HttpResponse(null, { status: 403, statusText: 'Forbidden' })))
		await expect(customFetch('/forbidden')).rejects.toThrow('HTTP 403')
	})

	it('throws for 404 Not Found', async () => {
		server.use(http.get(`${BASE}/missing`, () => new HttpResponse('Not found', { status: 404, statusText: 'Not Found' })))
		await expect(customFetch('/missing')).rejects.toThrow('HTTP 404')
	})

	it('throws for 422 Unprocessable Entity', async () => {
		server.use(http.post(`${BASE}/validate`, () => new HttpResponse(null, { status: 422, statusText: 'Unprocessable Entity' })))
		await expect(customFetch('/validate', { method: 'POST', body: {} })).rejects.toThrow('HTTP 422')
	})

	it('throws for 500 Internal Server Error', async () => {
		server.use(http.get(`${BASE}/crash`, () => new HttpResponse(null, { status: 500, statusText: 'Internal Server Error' })))
		await expect(customFetch('/crash')).rejects.toThrow('HTTP 500')
	})

	it('throws for 503 Service Unavailable', async () => {
		server.use(http.get(`${BASE}/down`, () => new HttpResponse(null, { status: 503, statusText: 'Service Unavailable' })))
		await expect(customFetch('/down')).rejects.toThrow('HTTP 503')
	})

	it('includes the plain-text error body in the thrown message', async () => {
		server.use(http.post(`${BASE}/bad`, () => new HttpResponse('name is required', { status: 400, statusText: 'Bad Request' })))
		await expect(customFetch('/bad', { method: 'POST', body: {} })).rejects.toThrow('name is required')
	})

	it('includes stringified JSON error body in the thrown message', async () => {
		server.use(http.post(`${BASE}/bad-json`, () => HttpResponse.json({ error: 'validation failed', field: 'name' }, { status: 400 })))
		await expect(customFetch('/bad-json', { method: 'POST', body: {} })).rejects.toThrow('validation failed')
	})
})

// ── 11. 401 Unauthorized handling ────────────────────────────────────────────

describe('401 unauthorized handling', () => {
	// isHandlingUnauthorized is module-level; fake timers let us control the reset setTimeout
	beforeEach(() => vi.useFakeTimers())
	afterEach(() => {
		vi.runAllTimers()
		vi.useRealTimers()
	})

	it('throws "Session expired" message', async () => {
		server.use(http.get(`${BASE}/protected`, () => new HttpResponse(null, { status: 401 })))
		initCustomFetch(makeStore('expired'), persistor, forceLogout)
		await expect(customFetch('/protected')).rejects.toThrow('Session expired')
	})

	it('calls the forceLogout action creator', async () => {
		server.use(http.get(`${BASE}/protected`, () => new HttpResponse(null, { status: 401 })))
		initCustomFetch(makeStore('tok'), persistor, forceLogout)
		await expect(customFetch('/protected')).rejects.toThrow()
		expect(forceLogout).toHaveBeenCalled()
	})

	it('dispatches the forceLogout action to the store', async () => {
		const s = makeStore('tok')
		server.use(http.get(`${BASE}/protected`, () => new HttpResponse(null, { status: 401 })))
		initCustomFetch(s, persistor, forceLogout)
		await expect(customFetch('/protected')).rejects.toThrow()
		expect(s.dispatch).toHaveBeenCalledWith({ type: 'auth/forceLogout' })
	})

	it('calls persistor.purge() to wipe persisted state', async () => {
		server.use(http.get(`${BASE}/protected`, () => new HttpResponse(null, { status: 401 })))
		initCustomFetch(makeStore('tok'), persistor, forceLogout)
		await expect(customFetch('/protected')).rejects.toThrow()
		expect(persistor.purge).toHaveBeenCalledTimes(1)
	})

	it('clears sessionStorage', async () => {
		sessionStorage.setItem('session-key', 'session-value')
		server.use(http.get(`${BASE}/protected`, () => new HttpResponse(null, { status: 401 })))
		initCustomFetch(makeStore('tok'), persistor, forceLogout)
		await expect(customFetch('/protected')).rejects.toThrow()
		expect(sessionStorage.getItem('session-key')).toBeNull()
	})

	it('clears localStorage', async () => {
		localStorage.setItem('local-key', 'local-value')
		server.use(http.get(`${BASE}/protected`, () => new HttpResponse(null, { status: 401 })))
		initCustomFetch(makeStore('tok'), persistor, forceLogout)
		await expect(customFetch('/protected')).rejects.toThrow()
		expect(localStorage.getItem('local-key')).toBeNull()
	})

	it('navigates to /login after the redirect delay', async () => {
		server.use(http.get(`${BASE}/protected`, () => new HttpResponse(null, { status: 401 })))
		initCustomFetch(makeStore('tok'), persistor, forceLogout)
		await expect(customFetch('/protected')).rejects.toThrow()

		// Not yet — inside the setTimeout delay
		expect(vi.mocked(router.navigate)).not.toHaveBeenCalled()
		vi.runAllTimers()
		expect(vi.mocked(router.navigate)).toHaveBeenCalledWith('/login')
	})

	it('does NOT call forceLogout when already on the /login page', async () => {
		window.history.pushState({}, '', '/login')
		server.use(http.get(`${BASE}/protected`, () => new HttpResponse(null, { status: 401 })))
		initCustomFetch(makeStore('tok'), persistor, forceLogout)
		await expect(customFetch('/protected')).rejects.toThrow()
		expect(forceLogout).not.toHaveBeenCalled()
		window.history.pushState({}, '', '/')
	})

	it('does NOT navigate when already on the /login page', async () => {
		window.history.pushState({}, '', '/login')
		server.use(http.get(`${BASE}/protected`, () => new HttpResponse(null, { status: 401 })))
		initCustomFetch(makeStore('tok'), persistor, forceLogout)
		await expect(customFetch('/protected')).rejects.toThrow()
		vi.runAllTimers()
		expect(vi.mocked(router.navigate)).not.toHaveBeenCalled()
		window.history.pushState({}, '', '/')
	})

	it('concurrent 401 responses are idempotent — forceLogout called only once', async () => {
		server.use(
			http.get(`${BASE}/a`, () => new HttpResponse(null, { status: 401 })),
			http.get(`${BASE}/b`, () => new HttpResponse(null, { status: 401 }))
		)
		const s = makeStore('tok')
		initCustomFetch(s, persistor, forceLogout)

		await Promise.allSettled([customFetch('/a'), customFetch('/b')])

		expect(forceLogout).toHaveBeenCalledTimes(1)
		expect(s.dispatch).toHaveBeenCalledTimes(1)
	})
})

// ── 12. AbortSignal ───────────────────────────────────────────────────────────

describe('AbortSignal', () => {
	it('throws "Request cancelled" when a pre-aborted signal is passed', async () => {
		server.use(http.get(`${BASE}/route`, () => HttpResponse.json({})))
		const controller = new AbortController()
		// Use reason-less abort so the default AbortError reason is used;
		// passing a plain string bypasses the AbortError catch branch in customFetch
		controller.abort()
		await expect(customFetch('/route', { signal: controller.signal })).rejects.toThrow('Request cancelled')
	})

	it('throws "Request cancelled" when the signal is aborted mid-flight', async () => {
		const controller = new AbortController()
		server.use(
			http.get(`${BASE}/slow`, async () => {
				// Respond after 100 ms — abort fires at 10 ms
				await new Promise<void>((resolve) => setTimeout(resolve, 100))
				return HttpResponse.json({ reached: true })
			})
		)
		setTimeout(() => controller.abort(), 10)
		await expect(customFetch('/slow', { signal: controller.signal })).rejects.toThrow('Request cancelled')
	})
})

// ── 13. Timeout ───────────────────────────────────────────────────────────────

describe('timeout', () => {
	it('resolves normally when the request completes before the timeout', async () => {
		server.use(http.get(`${BASE}/fast`, () => HttpResponse.json({ ok: true })))
		await expect(customFetch('/fast', { timeout: 5000 })).resolves.toEqual({ ok: true })
	})

	describe('when the request exceeds the configured timeout', () => {
		beforeEach(() => vi.useFakeTimers())
		afterEach(() => {
			vi.runAllTimers()
			vi.useRealTimers()
		})

		it('rejects with a message containing "timeout"', async () => {
			server.use(
				http.get(`${BASE}/hanging`, async () => {
					await new Promise(() => {}) // never resolves
					return HttpResponse.json({})
				})
			)
			const promise = customFetch('/hanging', { timeout: 200 })
			vi.advanceTimersByTime(300)
			await expect(promise).rejects.toThrow('timeout')
		})

		it('timeout error message includes the configured duration', async () => {
			server.use(
				http.get(`${BASE}/hanging2`, async () => {
					await new Promise(() => {})
					return HttpResponse.json({})
				})
			)
			const promise = customFetch('/hanging2', { timeout: 500 })
			vi.advanceTimersByTime(600)
			await expect(promise).rejects.toThrow('500ms')
		})
	})
})

// ── 14. Network errors ────────────────────────────────────────────────────────

describe('network errors', () => {
	it('wraps a network failure with a descriptive "Request failed for METHOD URL" message', async () => {
		server.use(http.get(`${BASE}/unreachable`, () => HttpResponse.error()))
		await expect(customFetch('/unreachable')).rejects.toThrow('Request failed for GET')
	})

	it('includes the full URL in the network-failure error message', async () => {
		server.use(http.get(`${BASE}/unreachable`, () => HttpResponse.error()))
		await expect(customFetch('/unreachable')).rejects.toThrow('unreachable')
	})

	it('includes the HTTP method in the network-failure error message for non-GET methods', async () => {
		server.use(http.post(`${BASE}/unreachable`, () => HttpResponse.error()))
		await expect(customFetch('/unreachable', { method: 'POST', body: {} })).rejects.toThrow('Request failed for POST')
	})
})
