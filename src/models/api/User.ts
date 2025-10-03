/**
 * User roles in the system
 */
export type UserRole = 'Admin' | 'Standard'

/**
 * User entity from API
 */
export interface User {
	id: number
	username: string
	role: UserRole
	isDefault: boolean
	createdAt: string
	updatedAt: string
}

export interface LoginRequest {
	username: string
	password: string
}

export interface LoginResponse {
	userId: number
	username: string
	role: UserRole
	token: string
}

export interface UserCreateDto {
	username: string
	password?: string
	role: UserRole
}

export interface UserUpdateDto {
	username?: string
	role?: UserRole
}

export interface ChangePasswordDto {
	newPassword: string
}
