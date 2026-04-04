import { environment } from '@/environments'
import { router } from '@/navigation/router'

type AnyStore = { getState(): any; dispatch(action: any): any }
type AnyPersistor = { purge(): Promise<any> }

let _store: AnyStore | null = null
let _persistor: AnyPersistor | null = null
let _forceLogout: (() => { type: string }) | null = null

export function initCustomFetch(store: AnyStore, persistor: AnyPersistor, forceLogout: () => { type: string }) {
	_store = store
	_persistor = persistor
	_forceLogout = forceLogout
}

export function purgePersistedState(): void {
	_persistor?.purge().catch(console.error)
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

let isHandlingUnauthorized = false
const pendingRequests = new Set<AbortController>()
const REDIRECT_DELAY_MS = 100

const handleUnauthorizedAccess = () => {
	if (isHandlingUnauthorized) return

	isHandlingUnauthorized = true
	const currentPath = window.location.pathname

	pendingRequests.forEach((controller) => {
		try {
			controller.abort('Session expired')
		} catch {
			/* ignore */
		}
	})
	pendingRequests.clear()

	if (!currentPath.includes('/login')) {
		console.warn('Session expired - redirecting to login and clearing all state')

		_store!.dispatch(_forceLogout!())

		_persistor!.purge().catch((error) => {
			console.error('Failed to purge persisted state:', error)
		})

		sessionStorage.clear()

		try {
			localStorage.clear()
		} catch {
			/* ignore */
		}

		setTimeout(() => {
			isHandlingUnauthorized = false
			router.navigate('/login')
		}, REDIRECT_DELAY_MS)
	} else {
		isHandlingUnauthorized = false
	}
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
	const token = _store?.getState().auth.token
	const controller = new AbortController()
	pendingRequests.add(controller)

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
		pendingRequests.delete(controller)
	}
}
