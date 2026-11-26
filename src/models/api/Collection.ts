import type { Game } from './Game'
import type { PlaylistRules } from './Playlist'
import type { RecommendationFilters } from './Discovery'

export type HomeSource = { kind: 'playingNow' } | { kind: 'playlist'; playlistId: number } | { kind: 'view'; viewId: number } | { kind: 'filter'; rules: PlaylistRules } | { kind: 'summary' } | { kind: 'recommendations'; recommendations: RecommendationFilters }
export interface HomeRow {
	id: string
	enabled: boolean
	title?: string | null
	source: HomeSource
	presentation: 'cards' | 'covers' | 'row'
	previewCount: number
	highlightFirst: boolean
}
export interface HomeConfig { version: 1; revision: number; rows: HomeRow[] }
export interface HomeRowResult {
	rowId: string
	state: 'ready' | 'empty' | 'unavailable' | 'error'
	sourceName?: string
	errorCode?: string
	totalMatches: number
	returnedCount: number
	hasMore: boolean
	items: Game[]
	summary?: CollectionTotals
	recommendationDay?: string
	refreshAt?: string
	serverTime?: string
}
export interface CollectionTotals {
	totalGames: number
	effectiveMinutes: number
	steamMinutes: number
	manualMinutes: number
	timedGames: number
	missingTimeGames: number
	completedGames: number
	fullyCompletedGames: number
	closureGames: number
	missingFinishGames: number
	missingStoryGames: number
	achievementsUnlocked: number
	achievementsTotal: number
	achievementGames: number
	unknownAchievementDates: number
}
export interface CollectionActivity { id: string; source: 'game' | 'replay'; recordId: number; game: Game; date: string; grade: number | null; type: string }
export interface CollectionStatistics {
	version: 1
	year: number
	month?: number | null
	dateKind: 'started' | 'finished'
	timeBasis: 'accumulated-only'
	dateBasis: 'stored-records-not-sessions'
	years: number[]
	totals: CollectionTotals
	byStatus: Array<{ statusId: number; name: string; color: string; count: number }>
	months: Array<{ month: number; records: number; games: number; mainRecords: number; replayRecords: number; unlocks: number; artworkGame?: Game | null }>
	records: CollectionActivity[]
	ranking: CollectionActivity[]
	distinctGames: number
	mainRecords: number
	replayRecords: number
	ratedGames: number
	average?: number | null
	datedUnlocks: number
	unlocksByGame: Array<{ game: Game; count: number }>
	progressBins: Array<{ minimum: number; label: string; count: number }>
	nearComplete: Game[]
	topPlaytime: Game[]
	developers: Array<{ name: string; count: number; ratedCount: number; average?: number | null; games: Game[] }>
}
export interface GotySelections { revision: number; selections: Record<string, number> }
export type CollectionMetric = 'all' | 'completed' | 'strict' | 'timed' | 'missingTime' | 'missingFinish' | 'missingStory' | 'status' | 'developer' | 'progress' | 'closures' | 'period' | 'started' | 'goty'
