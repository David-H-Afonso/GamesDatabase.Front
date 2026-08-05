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
}

export type PlaylistUpdateDto = Partial<PlaylistCreateDto>

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
