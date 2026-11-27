import type { MetadataField, MetadataIdentity } from './GameMetadata'

export type MetadataJobState = 'queued' | 'running' | 'waiting' | 'cancelling' | 'completed' | 'cancelled'
export type MetadataJobItemStatus = 'pending' | 'looking' | 'waiting' | 'updated' | 'unchanged' | 'review' | 'failed' | 'partial' | 'cancelled'
export interface MetadataJobItem {
	gameId: number
	name: string
	status: MetadataJobItemStatus
	appliedFields: MetadataField[]
	unchangedFields: MetadataField[]
	notices: string[]
	matches: MetadataIdentity[]
}
export interface MetadataAutofillJob {
	id: string
	clientRequestId: string
	state: MetadataJobState
	overwrite: boolean
	acceptListedPlatformCritic: boolean
	active: boolean
	dismissed: boolean
	revision: number
	createdAt: string
	updatedAt: string
	finishedAt?: string | null
	nextAttemptAt?: string | null
	totalGames: number
	processedGames: number
	updatedGames: number
	unchangedGames: number
	reviewGames: number
	failedGames: number
	partialGames: number
	cancelledGames: number
	currentGameId?: number | null
	currentGameName?: string | null
	phase?: 'looking' | 'saving' | null
	items: MetadataJobItem[]
}
export interface MetadataJobStart {
	clientRequestId: string
	gameIds: number[]
	overwrite: boolean
	acceptListedPlatformCritic: boolean
}
