/**
 * Tipo de operador para filtros
 */
export const FilterOperator = {
	Equals: 'Equals',
	NotEquals: 'NotEquals',
	Contains: 'Contains',
	NotContains: 'NotContains',
	GreaterThan: 'GreaterThan',
	GreaterThanOrEqual: 'GreaterThanOrEqual',
	LessThan: 'LessThan',
	LessThanOrEqual: 'LessThanOrEqual',
	Between: 'Between',
	In: 'In',
	NotIn: 'NotIn',
	IsNull: 'IsNull',
	IsNotNull: 'IsNotNull',
	StartsWith: 'StartsWith',
	EndsWith: 'EndsWith',
	// Nuevos operadores del backend
	IsEmpty: 'IsEmpty',
	IsNotEmpty: 'IsNotEmpty',
} as const

export type FilterOperator = (typeof FilterOperator)[keyof typeof FilterOperator]

/**
 * Tipo de campo para filtros
 */
export const FilterField = {
	Name: 'Name',
	StatusId: 'StatusId',
	PlatformId: 'PlatformId',
	PlayWithId: 'PlayWithId',
	PlayedStatusId: 'PlayedStatusId',
	Grade: 'Grade',
	Critic: 'Critic',
	Story: 'Story',
	Completion: 'Completion',
	Score: 'Score',
	Released: 'Released',
	Started: 'Started',
	Finished: 'Finished',
	Comment: 'Comment',
	CreatedAt: 'CreatedAt',
	UpdatedAt: 'UpdatedAt',
	// Nuevos campos del backend
	ReleaseDate: 'ReleaseDate',
	Description: 'Description',
	Logo: 'Logo',
	Cover: 'Cover',
} as const

export type FilterField = (typeof FilterField)[keyof typeof FilterField]

/**
 * Campo para ordenamiento
 */
export const SortField = {
	Name: 'Name',
	StatusId: 'StatusId',
	Status: 'Status',
	PlatformId: 'PlatformId',
	Platform: 'Platform',
	PlayWithId: 'PlayWithId',
	PlayWith: 'PlayWith',
	PlayedStatusId: 'PlayedStatusId',
	PlayedStatus: 'PlayedStatus',
	Grade: 'Grade',
	Critic: 'Critic',
	Story: 'Story',
	Completion: 'Completion',
	Score: 'Score',
	Released: 'Released',
	Started: 'Started',
	Finished: 'Finished',
	CreatedAt: 'CreatedAt',
	UpdatedAt: 'UpdatedAt',
	Id: 'Id',
} as const

export type SortField = (typeof SortField)[keyof typeof SortField]

/**
 * Dirección de ordenamiento
 */
export const SortDirection = {
	Ascending: 'Ascending',
	Descending: 'Descending',
} as const

export type SortDirection = (typeof SortDirection)[keyof typeof SortDirection]

/**
 * Tipo de combinación lógica para filtros
 */
export const CombineWith = {
	And: 'And',
	Or: 'Or',
} as const

export type CombineWith = (typeof CombineWith)[keyof typeof CombineWith]

/**
 * Definición de un filtro individual
 */
export interface ViewFilter {
	field: FilterField
	operator: FilterOperator
	value?: any
	secondValue?: any // Para operadores como Between
}

/**
 * Definición de un ordenamiento individual
 */
export interface ViewSort {
	field: SortField
	direction: SortDirection
	order: number // Para múltiples ordenamientos
}

/**
 * Grupo de filtros con lógica de combinación interna
 */
export interface FilterGroup {
	filters: ViewFilter[]
	combineWith: CombineWith // Cómo combinar filtros dentro del grupo (AND/OR)
}

/**
 * Configuración completa de filtros para una vista
 */
export interface ViewConfiguration {
	// Nueva estructura con grupos (recomendada)
	filterGroups?: FilterGroup[]
	groupCombineWith?: CombineWith // Cómo combinar grupos entre sí (AND/OR)

	// Estructura legacy (retrocompatibilidad)
	filters?: ViewFilter[]

	sorting: ViewSort[]
}

/**
 * Representa una vista personalizada de juegos con filtros y ordenamientos específicos
 */
export interface GameView {
	id: number
	name: string
	description?: string
	sortOrder?: number
	configuration?: ViewConfiguration // Nueva estructura con grupos
	// Legacy properties para retrocompatibilidad
	filters?: string
	sorting?: string
	isPublic: boolean
	createdBy?: string
	createdAt: string // ISO date string
	updatedAt: string // ISO date string
}

/**
 * DTO para crear una nueva GameView
 */
export interface GameViewCreateDto {
	name: string
	description?: string
	configuration: ViewConfiguration
	isPublic?: boolean
	createdBy?: string
}

/**
 * DTO para actualizar una GameView existente
 */
export interface GameViewUpdateDto extends GameViewCreateDto {
	id: number
}

/**
 * Parámetros de consulta para GameViews
 */
export interface GameViewQueryParameters {
	page?: number
	pageSize?: number
	search?: string
	isPublic?: boolean
	createdBy?: string
}
