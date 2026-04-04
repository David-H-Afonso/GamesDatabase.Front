import { environment } from '@/environments'
import type { LoginRequest, LoginResponse } from '@/models/api/User'

/**
 * Authentication Service
 * Handles API calls for login - state management is done by Redux
 */
class AuthService {
	/**
	 * Login user via API
	 * Note: Uses native fetch instead of customFetch to avoid circular dependency
	 * (customFetch tries to get token from Redux store)
	 */
	async login(credentials: LoginRequest): Promise<LoginResponse> {
		const url = `${environment.baseUrl}${environment.apiRoutes.users.login}`

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(credentials),
		})

		if (!response.ok) {
			if (response.status === 401) {
				throw new Error('Invalid username or password')
			}
			const errorData = await response.json().catch(() => ({}))
			throw new Error(errorData.message || 'Login failed')
		}

		const data: LoginResponse = await response.json()
		return data
	}

	/**
	 * Logout user - no-op as state is managed by Redux
	 */
	logout(): void {
		// Redux handles clearing state
	}
}

// Export singleton instance
export const authService = new AuthService()
