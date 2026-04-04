import { environment } from '@/environments'
import { router } from '@/navigation/router'

type AnyStore = { getState(): any; dispatch(action: any): any }
type AnyPersistor = { purge(): Promise<any> }

type FetchRefs = {
	store: AnyStore | null
	persistor: AnyPersistor | null
	forceLogout: (() => { type: string }) | null
	handlingUnauthorized: boolean
	pending: Set<AbortController>
}

const refs: FetchRefs = ((globalThis as any).__customFetchRefs ??= {
	store: null,
	persistor: null,
	forceLogout: null,
	handlingUnauthorized: false,
	pending: new Set<AbortController>(),
})

export function initCustomFetch(store: AnyStore, persistor: AnyPersistor, forceLogout: () => { type: string }) {
	refs.store = store
	refs.persistor = persistor
	refs.forceLogout = forceLogout
	refs.handlingUnauthorized = false
}

export function purgePersistedState(): void {
	refs.persistor?.purge().catch(console.error)
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

const handleUnauthorizedAccess = () => {
	if (refs.handlingUnauthorized) return
	refs.handlingUnauthorized = true

	for (const controller of refs.pending) {
		try {
			controller.abort('Session expired')
		} catch {
			/* already aborted */
		}
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
	sessionStorage.clear()
	try {
		localStorage.clear()
	} catch {
		/* ignore */
	}

	setTimeout(() => {
		refs.handlingUnauthorized = false
		router.navigate('/login')
	}, 100)
}

type CustomFetchOptions = {
	method?: HttpMethod
	headers?: Record<string, string>
	body?: any
	params?: Record<string, string | number | boolean | number[]>
	signal?: AbortSignal
	timeout?: number
	baseURL?: string
}

const buildQueryString = (queryParameters?: Record<string, string | number | boolean | number[]>): string => {
	if (!queryParameters || Object.keys(queryParameters).length === 0) {
		return ''
	}

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

const shouldSerializeAsJson = (requestBody: any): boolean => {
	return (
		typeof requestBody === 'object' &&
		requestBody !== null &&
		!(requestBody instanceof FormData) &&
		!(requestBody instanceof URLSearchParams) &&
		!(requestBody instanceof Blob) &&
		!(requestBody instanceof ArrayBuffer)
	)
}

const parseResponseData = async (httpResponse: Response): Promise<any> => {
	const responseContentType = httpResponse.headers.get('content-type') || ''

	if (responseContentType.includes('application/json')) {
		return await httpResponse.json()
	}

	if (responseContentType.includes('text/')) {
		return await httpResponse.text()
	}

	if (responseContentType.includes('application/octet-stream') || responseContentType.includes('image/')) {
		return await httpResponse.blob()
	}

	return await httpResponse.text()
}

const createTimeoutPromise = (timeoutMs: number): Promise<never> => {
	return new Promise((_, reject) => {
		setTimeout(() => {
			reject(new Error(`Request timeout after ${timeoutMs}ms`))
		}, timeoutMs)
	})
}

export const customFetch = async <T = any>(endpoint: string, requestOptions: CustomFetchOptions = {}): Promise<T> => {
	if (refs.handlingUnauthorized) {
		throw new Error('Request cancelled')
	}

	const {
		method = 'GET',
		headers: customHeaders = {},
		body: requestBody,
		params: queryParams,
		signal: abortSignal,
		timeout: timeoutMs,
		baseURL: baseUrl = environment.baseUrl,
	} = requestOptions

	const completeUrl = baseUrl + endpoint + buildQueryString(queryParams)
	const token = refs.store?.getState().auth.token

	const controller = new AbortController()
	refs.pending.add(controller)

	const signalToUse = controller.signal
	if (abortSignal) {
		if (abortSignal.aborted) {
			controller.abort(abortSignal.reason)
		} else {
			abortSignal.addEventListener('abort', () => controller.abort(abortSignal.reason))
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
		const httpResponse = timeoutMs ? await Promise.race([fetchPromise, createTimeoutPromise(timeoutMs)]) : await fetchPromise
		const responseData = await parseResponseData(httpResponse)

		if (!httpResponse.ok) {
			if (httpResponse.status === 401) {
				handleUnauthorizedAccess()
				throw new Error('Session expired. Please login again.')
			}
			const errorMessage = typeof responseData === 'string' ? responseData : JSON.stringify(responseData)
			throw new Error(`HTTP ${httpResponse.status} ${httpResponse.statusText}: ${errorMessage}`)
		}

		return responseData as T
	} catch (fetchError) {
		if (fetchError instanceof Error && fetchError.name === 'AbortError') {
			throw new Error('Request cancelled')
		}
		if (fetchError instanceof Error) {
			throw new Error(`Request failed for ${method} ${completeUrl}: ${fetchError.message}`)
		}
		throw fetchError
	} finally {
		refs.pending.delete(controller)
	}
}
