import { environment } from '@/environments'
import { router } from '@/navigation/router'

type AnyStore = { getState(): any; dispatch(action: any): any }
type AnyPersistor = { purge(): Promise<any> }

type FetchRefs = {
	store: AnyStore | null
	persistor: AnyPersistor | null
	forceLogout: (() => { type: string }) | null
	setRefreshedTokens: ((tokens: { token: string; refreshToken: string }) => { type: string }) | null
	handlingUnauthorized: boolean
	pending: Set<AbortController>
	/** Shared promise while a refresh is in-flight — prevents multiple parallel refresh calls */
	refreshPromise: Promise<boolean> | null
	refreshStore?: AnyStore | null
	refreshUserId?: number
}

const refs: FetchRefs = ((globalThis as any).__customFetchRefs ??= {
	store: null,
	persistor: null,
	forceLogout: null,
	setRefreshedTokens: null,
	handlingUnauthorized: false,
	pending: new Set<AbortController>(),
	refreshPromise: null,
})

export function initCustomFetch(
	store: AnyStore,
	persistor: AnyPersistor,
	forceLogout: () => { type: string },
	setRefreshedTokens: (tokens: { token: string; refreshToken: string }) => { type: string }
) {
	refs.store = store
	refs.persistor = persistor
	refs.forceLogout = forceLogout
	refs.setRefreshedTokens = setRefreshedTokens
	refs.handlingUnauthorized = false
	refs.refreshPromise = null
}

export function purgePersistedState(): void {
	refs.persistor?.purge().catch(console.error)
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

// ── Force-logout (aborts pending requests + redirects to /login) ──────────────

const handleUnauthorizedAccess = () => {
	if (refs.handlingUnauthorized) return
	refs.handlingUnauthorized = true

	for (const controller of refs.pending) {
		try { controller.abort('Session expired') } catch { /* already aborted */ }
	}
	refs.pending.clear()

	const onLoginPage = (globalThis.location?.pathname ?? '').includes('/login')
	if (onLoginPage) {
		refs.handlingUnauthorized = false
		return
	}

	console.warn('Session expired - redirecting to login')

	if (refs.store && refs.forceLogout) {
		refs.store.dispatch(refs.forceLogout())
	}

	refs.persistor?.purge().catch(console.error)

	setTimeout(() => {
		refs.handlingUnauthorized = false
		router.navigate('/login')
	}, 100)
}

// ── Refresh token logic ───────────────────────────────────────────────────────

/**
 * Attempts to obtain a new access token using the stored refresh token.
 * Multiple concurrent 401 responses share the same in-flight refresh call.
 * Returns true if the token was refreshed and stored, false otherwise.
 */
const tryRefreshToken = (): Promise<boolean> => {
	const requestStore = refs.store, userId = requestStore?.getState().auth?.user?.id
	if (refs.refreshPromise && refs.refreshStore === requestStore && refs.refreshUserId === userId) return refs.refreshPromise

	const promise = (async (): Promise<boolean> => {
		try {
			const refreshToken = requestStore?.getState().auth?.refreshToken
			if (!refreshToken) return false

			const baseUrl = environment.baseUrl
			const response = await fetch(`${baseUrl}/users/refresh`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ refreshToken }),
			})

			if (!response.ok) return false

			const data: { token: string; refreshToken: string } = await response.json()
			if (refs.store !== requestStore || requestStore?.getState().auth?.user?.id !== userId || requestStore?.getState().auth?.refreshToken !== refreshToken) return false

			if (refs.store && refs.setRefreshedTokens) {
				refs.store.dispatch(refs.setRefreshedTokens({ token: data.token, refreshToken: data.refreshToken }))
			}

			return true
		} catch {
			return false
		}
	})()
	refs.refreshStore = requestStore; refs.refreshUserId = userId; refs.refreshPromise = promise
	void promise.finally(() => { if (refs.refreshPromise === promise) refs.refreshPromise = null })
	return promise
}

// ── Main fetch wrapper ────────────────────────────────────────────────────────

type CustomFetchOptions = {
	method?: HttpMethod
	headers?: Record<string, string>
	body?: any
	params?: Record<string, string | number | boolean | number[]>
	signal?: AbortSignal
	timeout?: number
	baseURL?: string
	/** Internal flag: prevents a second refresh attempt on a retried request */
	_skipRefresh?: boolean
}

const buildQueryString = (queryParameters?: Record<string, string | number | boolean | number[]>): string => {
	if (!queryParameters || Object.keys(queryParameters).length === 0) return ''

	const encodeURIComponent = window.encodeURIComponent
	const queryPairs: string[] = []

	Object.entries(queryParameters)
		.filter(([_, value]) => value !== null && value !== undefined)
		.forEach(([key, value]) => {
			if (Array.isArray(value)) {
				value.forEach((item) => {
					queryPairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`)
				})
			} else {
				queryPairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
			}
		})

	return queryPairs.length > 0 ? `?${queryPairs.join('&')}` : ''
}

const shouldSerializeAsJson = (requestBody: any): boolean =>
	typeof requestBody === 'object' &&
	requestBody !== null &&
	!(requestBody instanceof FormData) &&
	!(requestBody instanceof URLSearchParams) &&
	!(requestBody instanceof Blob) &&
	!(requestBody instanceof ArrayBuffer)

const parseResponseData = async (httpResponse: Response): Promise<any> => {
	const responseContentType = httpResponse.headers.get('content-type') || ''

	if (responseContentType.includes('application/json')) return await httpResponse.json()
	if (responseContentType.includes('text/')) return await httpResponse.text()
	if (
		responseContentType.includes('application/zip') ||
		responseContentType.includes('application/octet-stream') ||
		responseContentType.includes('image/')
	)
		return await httpResponse.blob()
	return await httpResponse.text()
}

const retryAfterSeconds = (header: string | null): number | undefined => {
	if (!header) return undefined
	const seconds = /^\d+$/.test(header) ? Number(header) : /^[A-Za-z]{3},/.test(header) ? Math.ceil((Date.parse(header) - Date.now()) / 1000) : NaN
	return Number.isSafeInteger(seconds) ? Math.max(0, seconds) : undefined
}

export const customFetch = async <T = any>(endpoint: string, requestOptions: CustomFetchOptions = {}): Promise<T> => {
	if (refs.handlingUnauthorized) throw new Error('Request cancelled')

	const {
		method = 'GET',
		headers: customHeaders = {},
		body: requestBody,
		params: queryParams,
		signal: abortSignal,
		timeout: timeoutMs,
		baseURL: baseUrl = environment.baseUrl,
		_skipRefresh = false,
	} = requestOptions

	const completeUrl = baseUrl + endpoint + buildQueryString(queryParams)
	const token = refs.store?.getState().auth?.token
	const hasAuthToken = Boolean(token)
	const requestStore = refs.store, userId = requestStore?.getState().auth?.user?.id
	const assertOwner = () => { if (hasAuthToken && (refs.store !== requestStore || requestStore?.getState().auth?.user?.id !== userId)) throw new Error('Request cancelled after account change') }

	const controller = new AbortController()
	refs.pending.add(controller)
	let timeoutHandle: ReturnType<typeof setTimeout> | undefined
	let abortListener: (() => void) | undefined

	const signalToUse = controller.signal
	if (abortSignal) {
		if (abortSignal.aborted) {
			controller.abort(abortSignal.reason)
		} else {
			abortListener = () => controller.abort(abortSignal.reason)
			abortSignal.addEventListener('abort', abortListener, { once: true })
		}
	}

	const fetchConfiguration: RequestInit = {
		method,
		headers: {
			...customHeaders,
			...(token && { Authorization: `Bearer ${token}` }),
		},
		signal: signalToUse,
	}

	if (requestBody !== undefined && method !== 'GET' && method !== 'HEAD') {
		if (shouldSerializeAsJson(requestBody)) {
			fetchConfiguration.body = JSON.stringify(requestBody)
			fetchConfiguration.headers = { ...fetchConfiguration.headers, 'Content-Type': 'application/json' }
		} else {
			fetchConfiguration.body = requestBody
		}
	}

	try {
		const fetchPromise = fetch(completeUrl, fetchConfiguration)
		const httpResponse = timeoutMs
			? await Promise.race([fetchPromise, new Promise<never>((_, reject) => {
				timeoutHandle = setTimeout(() => {
					reject(new Error(`Request timeout after ${timeoutMs}ms`))
					controller.abort()
				}, timeoutMs)
			})])
			: await fetchPromise
		assertOwner()
		const responseData = await parseResponseData(httpResponse)
		assertOwner()

		if (!httpResponse.ok) {
			if (httpResponse.status === 401) {
				// ── Refresh token flow ────────────────────────────────────────
				// Only attempt refresh once per request (skipRefresh guards the retry)
				if (hasAuthToken && !_skipRefresh) {
					const refreshed = await tryRefreshToken()
					assertOwner()
					if (refreshed) {
						// Retry the original request with the newly stored token
						return customFetch<T>(endpoint, { ...requestOptions, _skipRefresh: true })
					}
				}
				// Refresh failed or no refresh token — force logout
				if (hasAuthToken) {
					handleUnauthorizedAccess()
					throw new Error('Session expired. Please login again.')
				}
				throw new Error('Authentication required. Please login.')
			}
			const errorMessage = typeof responseData === 'string' ? responseData : JSON.stringify(responseData)
			const retry = retryAfterSeconds(httpResponse.headers.get('Retry-After'))
			throw Object.assign(new Error(`HTTP ${httpResponse.status} ${httpResponse.statusText}: ${errorMessage}`), { status: httpResponse.status, ...(retry != null ? { retryAfterSeconds: retry } : {}), ...(responseData && typeof responseData === 'object' && typeof responseData.code === 'string' ? { code: responseData.code } : {}) })
		}

		return responseData as T
	} catch (fetchError) {
		if (fetchError instanceof Error && fetchError.name === 'AbortError') throw new Error('Request cancelled', { cause: fetchError })
		if (fetchError instanceof Error)
			throw Object.assign(new Error(`Request failed for ${method} ${completeUrl}: ${fetchError.message}`, { cause: fetchError }), 'status' in fetchError ? { status: fetchError.status } : {}, 'code' in fetchError ? { code: fetchError.code } : {}, 'retryAfterSeconds' in fetchError ? { retryAfterSeconds: fetchError.retryAfterSeconds } : {})
		throw fetchError
	} finally {
		clearTimeout(timeoutHandle)
		if (abortListener) abortSignal?.removeEventListener('abort', abortListener)
		refs.pending.delete(controller)
	}
}
