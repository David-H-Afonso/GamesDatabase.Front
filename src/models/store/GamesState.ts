import type { Game, GameQueryParameters } from '@/models/api/Game'

export interface GamesState {
	games: Game[]
	currentGame: Game | null
	loading: boolean
	error: string | null
	pagination: {
		page: number
		pageSize: number
		totalCount: number
		totalPages: number
		hasNextPage: boolean
		hasPreviousPage: boolean
	}
	filters: GameQueryParameters
	lastAppliedFilters: GameQueryParameters | null // Para caché de filtros
	isDataFresh: boolean // Indica si los datos actuales corresponden a los filtros
}
