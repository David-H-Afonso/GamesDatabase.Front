export interface GamePlatform {
	id: number
	name: string
	isActive: boolean
	color?: string
}

export interface GamePlatformCreateDto {
	name: string
	isActive: boolean
	color?: string
}

export interface GamePlatformUpdateDto extends GamePlatformCreateDto {
	id: number
}
