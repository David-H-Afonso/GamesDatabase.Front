export interface GamePlatform {
	id: number
	name: string
	isActive: boolean
	color?: string
	logo?: string
	sortOrder?: number
}

export interface GamePlatformCreateDto {
	name: string
	isActive: boolean
	color?: string
	logo?: string
}

export interface GamePlatformUpdateDto extends GamePlatformCreateDto {
	id: number
	sortOrder?: number
}
