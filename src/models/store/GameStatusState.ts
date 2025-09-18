import type { GameStatus } from '@/models/api/GameStatus'
import type { QueryParameters } from '@/models/api/Game'

export interface GameStatusState {
	statuses: GameStatus[]
	activeStatuses: GameStatus[]
	currentStatus: GameStatus | null
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
	filters: QueryParameters
}
