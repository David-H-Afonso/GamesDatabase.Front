import { environment } from '@/environments'
import { store } from '@/store'
import { forceLogout } from '@/store/features/auth/authSlice'
import { persistor } from '@/store'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

// Flag to prevent multiple simultaneous logout operations
let isHandlingUnauthorized = false

// AbortController to cancel all pending requests on logout
const pendingRequests = new Set<AbortController>()

/**
 * Handle unauthorized access (401) - clear all state and redirect to login
 */
const handleUnauthorizedAccess = () => {
	// Prevent multiple simultaneous logout operations
	if (isHandlingUnauthorized) {
		return
	}

	isHandlingUnauthorized = true
	const currentPath = window.location.pathname

	// Cancel all pending requests to stop infinite loops
	pendingRequests.forEach((controller) => {
		try {
			controller.abort('Session expired')
		} catch (error) {
			// Ignore abort errors
		}
	})
	pendingRequests.clear()

	// Only redirect if not already on login page
	if (!currentPath.includes('/login')) {
		console.warn('Session expired - redirecting to login and clearing all state')

		// 1. Dispatch logout action to Redux
		store.dispatch(forceLogout())

		// 2. Purge redux-persist storage completely
		persistor.purge().catch(() => {
			// Fallback: manually clear localStorage
			localStorage.removeItem('persist:root')
		})

		// 3. Clear any other storage
		sessionStorage.clear()

		// 4. Clear any IndexedDB or other storage
		try {
			localStorage.clear()
		} catch (error) {
			// Ignore errors
		}

		// 5. Redirect to login (without reload to avoid loops)
		setTimeout(() => {
			isHandlingUnauthorized = false
			window.location.hash = '#/login'
		}, 100)
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

const buildQueryString = (
	queryParameters?: Record<string, string | number | boolean | number[]>
): string => {
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

	if (
		responseContentType.includes('application/octet-stream') ||
		responseContentType.includes('image/')
	) {
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

export const customFetch = async <T = any>(
	endpoint: string,
	requestOptions: CustomFetchOptions = {}
): Promise<T> => {
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

	// Get token from Redux store
	const token = store.getState().auth.token

	// Create or use existing AbortController to track this request
	let controller: AbortController | undefined
	let signalToUse = abortSignal

	if (!abortSignal) {
		controller = new AbortController()
		signalToUse = controller.signal
		pendingRequests.add(controller)
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
			fetchConfiguration.headers = {
				...fetchConfiguration.headers,
				'Content-Type': 'application/json',
			}
		} else {
			fetchConfiguration.body = requestBody
		}
	}

	try {
		const fetchPromise = fetch(completeUrl, fetchConfiguration)
		const httpResponse = timeoutMs
			? await Promise.race([fetchPromise, createTimeoutPromise(timeoutMs)])
			: await fetchPromise

		const responseData = await parseResponseData(httpResponse)

		if (!httpResponse.ok) {
			if (httpResponse.status === 401) {
				// Handle token expiration - redirect to login and clear all state
				handleUnauthorizedAccess()
				throw new Error('Session expired. Please login again.')
			}

			const errorMessage =
				typeof responseData === 'string' ? responseData : JSON.stringify(responseData)

			throw new Error(`HTTP ${httpResponse.status} ${httpResponse.statusText}: ${errorMessage}`)
		}

		return responseData as T
	} catch (fetchError) {
		// Check if request was aborted due to logout
		if (fetchError instanceof Error && fetchError.name === 'AbortError') {
			throw new Error('Request cancelled')
		}

		if (fetchError instanceof Error) {
			throw new Error(`Request failed for ${method} ${completeUrl}: ${fetchError.message}`)
		}
		throw fetchError
	} finally {
		// Clean up: remove controller from pending requests
		if (controller) {
			pendingRequests.delete(controller)
		}
	}
}
