import { environment } from '@/environments'
import type { LoginRequest, LoginResponse } from '@/models/api/User'

const TOKEN_KEY = 'authToken'
const USER_ID_KEY = 'userId'
const USERNAME_KEY = 'username'
const USER_ROLE_KEY = 'userRole'

/**
 * Authentication Service
 * Handles login, logout, and token management
 */
class AuthService {
	/**
	 * Login user and store authentication data
	 * Note: Uses native fetch instead of customFetch to avoid circular dependency
	 * (customFetch tries to get token from authService)
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

		// Store authentication data in localStorage
		this.setAuthData(data)

		return data
	}

	/**
	 * Logout user and clear authentication data
	 */
	logout(): void {
		localStorage.removeItem(TOKEN_KEY)
		localStorage.removeItem(USER_ID_KEY)
		localStorage.removeItem(USERNAME_KEY)
		localStorage.removeItem(USER_ROLE_KEY)
	}

	/**
	 * Get current JWT token
	 */
	getToken(): string | null {
		return localStorage.getItem(TOKEN_KEY)
	}

	/**
	 * Get current user ID
	 */
	getUserId(): number | null {
		const userId = localStorage.getItem(USER_ID_KEY)
		return userId ? parseInt(userId, 10) : null
	}

	/**
	 * Get current username
	 */
	getUsername(): string | null {
		return localStorage.getItem(USERNAME_KEY)
	}

	/**
	 * Get current user role
	 */
	getUserRole(): 'Admin' | 'Standard' | null {
		return localStorage.getItem(USER_ROLE_KEY) as 'Admin' | 'Standard' | null
	}

	/**
	 * Check if user is authenticated
	 */
	isAuthenticated(): boolean {
		return this.getToken() !== null
	}

	/**
	 * Check if current user is admin
	 */
	isAdmin(): boolean {
		return this.getUserRole() === 'Admin'
	}

	/**
	 * Get current user data
	 */
	getCurrentUser(): { id: number; username: string; role: 'Admin' | 'Standard' } | null {
		const userId = this.getUserId()
		const username = this.getUsername()
		const role = this.getUserRole()

		if (!userId || !username || !role) {
			return null
		}

		return { id: userId, username, role }
	}

	/**
	 * Store authentication data in localStorage
	 */
	private setAuthData(data: LoginResponse): void {
		localStorage.setItem(TOKEN_KEY, data.token)
		localStorage.setItem(USER_ID_KEY, data.userId.toString())
		localStorage.setItem(USERNAME_KEY, data.username)
		localStorage.setItem(USER_ROLE_KEY, data.role)
	}
}

// Export singleton instance
export const authService = new AuthService()
