import type { Game } from './Game'
import type { NameSearch } from './NameSearch'

export interface PlaylistItem {
	id: number
	gameId: number
	position: number
	game: Game
}

export interface PlaylistSummary {
	groupId?: number | null
	maxLength?: number | null
	id: number
	name: string
	description?: string
	heroUrl?: string
	coverUrl?: string
	logoUrl?: string
	heroUrlOverride?: string
	coverUrlOverride?: string
	logoUrlOverride?: string
	isAutomatic: boolean
	isSample?: boolean
	rules?: PlaylistRules
	sortOrder: number
	gameCount: number
	updatedAt: string
}

export interface PlaylistGroup { id: number; name: string; sortOrder: number }

export interface Playlist extends PlaylistSummary {
	createdAt: string
	items: PlaylistItem[]
}

export interface PlaylistCreateDto {
	maxLength?: number | null
	name: string
	description?: string
	heroUrl?: string
	coverUrl?: string
	logoUrl?: string
	isAutomatic?: boolean
	rules?: PlaylistRules
}

export type PlaylistUpdateDto = Partial<PlaylistCreateDto>

export interface PlaylistRules {
	nameSearch?: NameSearch | null
	search?: string
	statusIds: number[]
	platformIds: number[]
	playedStatusIds: number[]
	favorite?: boolean
	playingNow?: boolean
	upcomingReleases?: boolean
	releaseTimeZone?: string | null
	minGrade?: number
	maxGrade?: number
	minCritic?: number
	maxCritic?: number
	minScore?: number
	maxScore?: number
	releasedFromYear?: number
	releasedToYear?: number
	hasSteam?: boolean
	fullCompletion?: boolean
	allAchievements?: boolean
	sortBy: 'Position' | 'Name' | 'Grade' | 'Critic' | 'Score' | 'Released' | 'Story' | 'Updated'
	sortDescending: boolean
	limit?: number
	orderedGameIds: number[]
	statusPriorityIds?: number[]
	groupByStatus?: boolean
	excludedGameIds?: number[]
}

export interface PlaylistPreview {
	totalMatches: number
	returnedCount: number
	games: Game[]
}

export interface PlaylistTransfer {
	maxLength?: number | null
	format: 'games-database-playlist'
	version: 1
	name: string
	description?: string
	heroUrl?: string
	coverUrl?: string
	logoUrl?: string
	games: Array<{ gameId?: number; name?: string }>
}
