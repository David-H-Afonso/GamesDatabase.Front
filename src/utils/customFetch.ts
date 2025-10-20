import { environment } from '@/environments'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

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
	const token = localStorage.getItem('authToken')
	const fetchConfiguration: RequestInit = {
		method,
		headers: {
			...customHeaders,
			...(token && { Authorization: `Bearer ${token}` }),
		},
		signal: abortSignal,
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
				// Evitar múltiples redirects simultáneos usando una flag global
				const isRedirecting = sessionStorage.getItem('isRedirectingToLogin')

				if (!isRedirecting) {
					sessionStorage.setItem('isRedirectingToLogin', 'true')

					// Limpiar autenticación
					localStorage.removeItem('authToken')
					localStorage.removeItem('userId')
					localStorage.removeItem('username')
					localStorage.removeItem('userRole')

					// Usar setTimeout para evitar interrumpir otras operaciones
					setTimeout(() => {
						sessionStorage.removeItem('isRedirectingToLogin')
						// Solo redirigir si no estamos ya en login
						if (!window.location.pathname.includes('/login')) {
							window.location.href = '/#/login'
						}
					}, 100)
				}

				throw new Error('Authentication expired. Please login again.')
			}

			const errorMessage =
				typeof responseData === 'string' ? responseData : JSON.stringify(responseData)

			throw new Error(`HTTP ${httpResponse.status} ${httpResponse.statusText}: ${errorMessage}`)
		}

		return responseData as T
	} catch (fetchError) {
		if (fetchError instanceof Error) {
			throw new Error(`Request failed for ${method} ${completeUrl}: ${fetchError.message}`)
		}
		throw fetchError
	}
}
