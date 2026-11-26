import type { Game } from './Game'

export interface RecommendationFilters { includedStatusIds: number[]; excludedStatusIds: number[] }
export interface DailyRecommendations { day: string; refreshAt: string; serverTime: string; totalMatches: number; items: Game[] }
