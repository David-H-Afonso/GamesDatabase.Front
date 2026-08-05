import type { Game } from './Game'

export interface PlaylistItem {
	id: number
	gameId: number
	position: number
	game: Game
}

export interface PlaylistSummary {
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
	rules?: PlaylistRules
	sortOrder: number
	gameCount: number
	updatedAt: string
}

export interface Playlist extends PlaylistSummary {
	createdAt: string
	items: PlaylistItem[]
}

export interface PlaylistCreateDto {
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
	search?: string
	statusIds: number[]
	platformIds: number[]
	playedStatusIds: number[]
	favorite?: boolean
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
	sortBy: 'Position' | 'Name' | 'Grade' | 'Critic' | 'Score' | 'Released' | 'Updated'
	sortDescending: boolean
	limit?: number
	orderedGameIds: number[]
}

export interface PlaylistTransfer {
	format: 'games-database-playlist'
	version: 1
	name: string
	description?: string
	heroUrl?: string
	coverUrl?: string
	logoUrl?: string
	games: Array<{ gameId?: number; name?: string }>
}
