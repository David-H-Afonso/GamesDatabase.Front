import type { GamePlayedStatus } from '@/models/api/GamePlayedStatus'
import type { QueryParameters } from '@/models/api/Game'

export interface GamePlayedStatusState {
	playedStatuses: GamePlayedStatus[]
	activePlayedStatuses: GamePlayedStatus[]
	currentPlayedStatus: GamePlayedStatus | null
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
