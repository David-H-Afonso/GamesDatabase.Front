import type { GamePlayWith } from '@/models/api/GamePlayWith'
import type { QueryParameters } from '@/models/api/Game'

export interface GamePlayWithState {
	playWithOptions: GamePlayWith[]
	activePlayWithOptions: GamePlayWith[]
	currentPlayWith: GamePlayWith | null
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
	filters: Partial<QueryParameters>
}
