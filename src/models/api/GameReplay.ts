export interface GameReplay {
	id: number
	gameId: number
	gameName?: string
	replayTypeId: number
	replayTypeName?: string
	replayTypeColor?: string
	started?: string
	finished?: string
	grade?: number
	notes?: string
	userId: number
	createdAt?: string
	updatedAt?: string
}

export interface GameReplayCreateDto {
	gameId: number
	replayTypeId?: number
	started?: string
	finished?: string
	grade?: number
	notes?: string
}

export interface GameReplayUpdateDto extends GameReplayCreateDto {
	id: number
}
