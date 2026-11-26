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
	hasPassword: boolean
	useScoreColors: boolean
	scoreProvider: string
	showPriceComparisonIcon: boolean
	tutorialEnabled?: boolean
	steamId?: string
	steamNickname?: string
	steamAvatarUrl?: string
	steamLinkedAt?: string
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
	refreshToken: string
	steamId?: string
	steamNickname?: string
	steamAvatarUrl?: string
}

export interface UserCreateDto {
	username: string
	password?: string
	role: UserRole
	tutorialEnabled?: boolean
}

export interface UserUpdateDto {
	username?: string
	role?: UserRole
	useScoreColors?: boolean
	scoreProvider?: string
	showPriceComparisonIcon?: boolean
	tutorialEnabled?: boolean
}

export interface ChangePasswordDto {
	newPassword: string
}
