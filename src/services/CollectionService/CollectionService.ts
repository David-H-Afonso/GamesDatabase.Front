import { environment } from '@/environments'
import { customFetch } from '@/utils/customFetch'
import type { CollectionMetric, CollectionStatistics, GotySelections, HomeConfig, HomeRow, HomeRowResult } from '@/models/api/Collection'
import type { Game, PagedResult } from '@/models/api/Game'
import { invalidateCollection } from './collectionEvents'

const options = { baseURL: environment.baseUrl }
export const getHomeConfig = (signal?: AbortSignal) => customFetch<HomeConfig>(environment.apiRoutes.home.config, { ...options, signal })
export const saveHomeConfig = async (config: HomeConfig) => {
	const saved = await customFetch<HomeConfig>(environment.apiRoutes.home.config, { ...options, method: 'PUT', body: config })
	invalidateCollection(); return saved
}
export const resolveHomeRows = (rows: HomeRow[], signal?: AbortSignal) => customFetch<HomeRowResult[]>(environment.apiRoutes.home.resolve, { ...options, method: 'POST', body: { rows }, signal })
export const getCollectionStatistics = (query: { year: number; month?: number; dateKind?: 'started' | 'finished'; allRanking?: boolean }, signal?: AbortSignal) => customFetch<CollectionStatistics>(environment.apiRoutes.collection.statistics, { ...options, params: query, signal })
export const getCollectionGames = (query: { metric: CollectionMetric; year?: number; month?: number; value?: number; developer?: string; page?: number; pageSize?: number; search?: string }, signal?: AbortSignal) => customFetch<PagedResult<Game>>(environment.apiRoutes.collection.games, { ...options, params: query, signal })
export const getHomeRowGames = (rowId: string, query: { page?: number; pageSize?: number; search?: string }, signal?: AbortSignal) => customFetch<PagedResult<Game>>(environment.apiRoutes.home.games(rowId), { ...options, params: query, signal })
export const getGotySelections = (signal?: AbortSignal) => customFetch<GotySelections>(environment.apiRoutes.collection.goty, { ...options, signal })
export const saveGotySelection = async (year: number, gameId: number | null, revision: number) => {
	const saved = await customFetch<GotySelections>(environment.apiRoutes.collection.gotyYear(year), { ...options, method: 'PUT', body: { gameId, revision } })
	invalidateCollection(); return saved
}
