export interface GamePlayedStatus {
	id: number
	name: string
	isActive: boolean
	color?: string
	sortOrder?: number
}

export interface GamePlayedStatusCreateDto {
	name: string
	isActive: boolean
	color?: string
}

export interface GamePlayedStatusUpdateDto extends GamePlayedStatusCreateDto {
	id: number
	sortOrder?: number
}
