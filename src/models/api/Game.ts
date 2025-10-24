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
	playWithIds: number[] // Changed to array
	playWithNames: string[] // Changed to array
	playedStatusId?: number
	playedStatusName?: string
	released?: string // ISO date string
	score?: number // 0-100
	started?: string // ISO date string
	statusId: number
	statusName?: string
	story?: number // 0-100
	createdAt?: string // ISO date string - when the game was created
	updatedAt?: string // ISO date string - when the game was last modified
	isCheaperByKey?: boolean // true if game is cheaper by key, false if cheaper in official store
	keyStoreUrl?: string // URL to key store (only if isCheaperByKey is true)
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
	playWithIds?: number[] // Changed to array
	playedStatusId?: number
	isCheaperByKey?: boolean
	keyStoreUrl?: string
}

export interface GameUpdateDto extends GameCreateDto {
	id: number
}

// Query parameters for API requests
export type SortByKey =
	| 'name'
	| 'grade'
	| 'critic'
	| 'released'
	| 'started'
	| 'score'
	| 'storyDuration'
	| 'completionDuration'
	| 'status'
	| 'createdat'
	| 'updatedat'
	| string

export interface QueryParameters {
	page?: number
	pageSize?: number
	search?: string
	sortBy?: SortByKey
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
	// Year filters (backend accepts integer year values)
	releasedYear?: number
	startedYear?: number
	finishedYear?: number
	// Exclude specific status IDs (can be multiple)
	excludeStatusIds?: number[]
	// Filter by price comparison
	isCheaperByKey?: boolean
	// View name for custom views
	viewName?: string
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
