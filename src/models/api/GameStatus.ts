export interface GameStatus {
	id: number
	name: string
	isActive: boolean
	color?: string
	/** Order used for display and manual reordering */
	sortOrder?: number
	/** Optional: represents a predefined type for special statuses (e.g. 'NotFulfilled') */
	statusType?: string
	/** Optional flag indicating this is a default/system status */
	isDefault?: boolean
	/** Optional flag indicating this is a special status provided by the system */
	isSpecialStatus?: boolean
}

export interface GameStatusCreateDto {
	name: string
	isActive: boolean
	color?: string
	sortOrder?: number
	statusType?: string
	isDefault?: boolean
	isSpecialStatus?: boolean
}

export interface GameStatusUpdateDto extends GameStatusCreateDto {
	id: number
}
