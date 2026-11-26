import { environment } from '@/environments'
import { customFetch } from '@/utils/customFetch'
import type { Game } from '@/models/api/Game'
import type { DailyRecommendations, RecommendationFilters } from '@/models/api/Discovery'

export const getRandomGame = (signal?: AbortSignal, gameIds?: number[]) => customFetch<Game>(environment.apiRoutes.collection.randomGame, gameIds ? { method: 'POST', body: { gameIds }, signal } : { signal })
export const previewRecommendations = (filters: RecommendationFilters, signal?: AbortSignal) => customFetch<DailyRecommendations>(environment.apiRoutes.collection.recommendations, { method: 'POST', body: filters, signal })
