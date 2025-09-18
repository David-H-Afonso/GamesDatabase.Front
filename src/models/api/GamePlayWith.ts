export interface GamePlayWith {
	id: number
	name: string
	isActive: boolean
	color?: string
}

export interface GamePlayWithCreateDto {
	name: string
	isActive: boolean
	color?: string
}

export interface GamePlayWithUpdateDto extends GamePlayWithCreateDto {
	id: number
}
