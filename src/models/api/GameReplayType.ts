export interface GameReplayType {
	id: number
	name: string
	color?: string
	sortOrder?: number
	isActive: boolean
	isDefault?: boolean
	replayType?: string // 'None' | 'Replay'
}

export interface GameReplayTypeCreateDto {
	name: string
	color?: string
	sortOrder?: number
	isActive: boolean
	isDefault?: boolean
	replayType?: string
}

export interface GameReplayTypeUpdateDto extends GameReplayTypeCreateDto {
	id: number
}
