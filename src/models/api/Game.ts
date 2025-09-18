// Main Game interface
export interface Game {
	comment?: string
	completion?: number // 0-100
	cover?: string
	critic?: number // 0-100
	finished?: string // ISO date string
	grade?: number // 0-100
	id: number
	logo?: string
	name: string
	platformId?: number
	platformName?: string
	playWithId?: number
	playWithName?: string
	playedStatusId?: number
	playedStatusName?: string
	released?: string // ISO date string
	score?: number // 0-100
	started?: string // ISO date string
	statusId: number
	statusName?: string
	story?: number // 0-100
}

// DTOs for create and update operations
export interface GameCreateDto {
	statusId: number
	name: string
	grade?: number
	critic?: number
	story?: number
	completion?: number
	// score is calculated by the backend, not provided on create
	platformId?: number
	released?: string
	started?: string
	finished?: string
	comment?: string
	playWithId?: number
	playedStatusId?: number
}

export interface GameUpdateDto extends GameCreateDto {
	id: number
}

// Query parameters for API requests
export interface QueryParameters {
	page?: number
	pageSize?: number
	search?: string
	sortBy?: string
	sortDescending?: boolean
	isActive?: boolean
}

export interface GameQueryParameters extends QueryParameters {
	statusId?: number
	platformId?: number
	playWithId?: number
	playedStatusId?: number
	minGrade?: number
	maxGrade?: number
	released?: string
	started?: string
	finished?: string
}

// Paginated response wrapper
export interface PagedResult<T> {
	data: T[]
	totalCount: number
	page: number
	pageSize: number
	totalPages: number
	hasNextPage: boolean
	hasPreviousPage: boolean
}
