export interface GameHistoryEntry {
	id: number
	gameId?: number
	gameName: string
	userId: number
	field: string
	oldValue?: string
	newValue?: string
	description: string
	actionType: 'Created' | 'Updated' | 'Deleted'
	changedAt: string
}

export interface GameHistoryQueryParameters {
	page?: number
	pageSize?: number
	actionType?: string
	field?: string
	gameId?: number
	from?: string
	to?: string
	userId?: number
}
