import { customFetch } from '@/utils/customFetch'
import { environment } from '@/environments'
import type { User, UserCreateDto, UserUpdateDto, ChangePasswordDto } from '@/models/api/User'

/** Anonymous initial-setup state returned by the API. */
export interface SetupStatus {
	defaultCredentialsAvailable: boolean
	defaultUsername?: string | null
}

/**
 * User Management Service
 * Handles CRUD operations for users (Admin only, except for reading own data)
 */
class UserService {
	/**
	 * Anonymous check for whether the seeded default admin still has no password,
	 * so the login screen may safely offer the bootstrap sign-in. Never returns
	 * real, user-chosen account names.
	 */
	async getSetupStatus(): Promise<SetupStatus> {
		return await customFetch<SetupStatus>(environment.apiRoutes.users.setupStatus)
	}

	/**
	 * Get all users (Admin only)
	 */
	async getAllUsers(): Promise<User[]> {
		const response = await customFetch<User[]>(environment.apiRoutes.users.base)
		return response
	}

	/**
	 * Get user by ID (Admin or the user themselves)
	 */
	async getUserById(id: number): Promise<User> {
		const response = await customFetch<User>(environment.apiRoutes.users.byId(id))
		return response
	}

	/**
	 * Create a new user (Admin only)
	 * Note: When a user is created, default catalog data is automatically seeded
	 */
	async createUser(data: UserCreateDto): Promise<User> {
		const response = await customFetch<User>(environment.apiRoutes.users.create, {
			method: 'POST',
			body: data,
		})
		return response
	}

	async updateUser(id: number, data: UserUpdateDto): Promise<void> {
		await customFetch<void>(environment.apiRoutes.users.update(id), {
			method: 'PUT',
			body: data,
		})
	}

	/**
	 * Delete a user (Admin only)
	 * Note: Deleting a user cascades and deletes all their data (games, platforms, etc.)
	 * Cannot delete the default admin or the last admin
	 */
	async deleteUser(id: number): Promise<void> {
		await customFetch<void>(environment.apiRoutes.users.delete(id), {
			method: 'DELETE',
		})
	}

	/**
	 * Change a user's password
	 * - Admin: Can change any user's password
	 * - Standard: Can only change their own password
	 */
	async changePassword(id: number, data: ChangePasswordDto): Promise<void> {
		await customFetch<void>(environment.apiRoutes.users.changePassword(id), {
			method: 'POST',
			body: data,
		})
	}
}

export const userService = new UserService()
