import type { GameReplayType } from '@/models/api/GameReplayType'
import type { QueryParameters } from '@/models/api/Game'

export interface GameReplayTypeState {
	replayTypes: GameReplayType[]
	activeReplayTypes: GameReplayType[]
	specialReplayType: GameReplayType | null
	currentReplayType: GameReplayType | null
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
