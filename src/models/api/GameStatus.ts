export interface GameStatus {
	id: number
	name: string
	isActive: boolean
	color?: string
}

export interface GameStatusCreateDto {
	name: string
	isActive: boolean
	color?: string
}

export interface GameStatusUpdateDto extends GameStatusCreateDto {
	id: number
}
