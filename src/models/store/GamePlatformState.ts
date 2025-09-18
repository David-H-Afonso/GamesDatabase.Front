import type { GamePlatform } from '@/models/api/GamePlatform'
import type { QueryParameters } from '@/models/api/Game'

export interface GamePlatformState {
	platforms: GamePlatform[]
	activePlatforms: GamePlatform[]
	currentPlatform: GamePlatform | null
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
