import { customFetch } from '@/utils/customFetch'
import { environment } from '@/environments'
import type { Game, GameCreateDto, GameUpdateDto, GameQueryParameters, PagedResult } from '@/models/api/Game'

const BASE = environment.apiRoutes.games.base

/**
 * Fetch paged games with optional query parameters (filter, sort, page, etc.).
 */
export const getGames = async (params?: GameQueryParameters): Promise<PagedResult<Game>> => {
	const endpoint = BASE
	return await customFetch<PagedResult<Game>>(endpoint, {
		method: 'GET',
		params: params as Record<string, string | number | boolean> | undefined,
		baseURL: environment.baseUrl,
	})
}

/**
 * Fetch a single game by id.
 */
export const getGameById = async (id: number): Promise<Game> => {
	const endpoint = environment.apiRoutes.games.byId(id)
	return await customFetch<Game>(endpoint, { method: 'GET', baseURL: environment.baseUrl })
}

/**
 * Create a new game and return the created resource.
 */
export const createGame = async (game: GameCreateDto): Promise<Game> => {
	const endpoint = environment.apiRoutes.games.create
	return await customFetch<Game>(endpoint, {
		method: 'POST',
		body: game,
		baseURL: environment.baseUrl,
	})
}

/**
 * Update an existing game.
 */
export const updateGame = async (id: number, game: GameUpdateDto): Promise<void> => {
	const endpoint = environment.apiRoutes.games.update(id)
	await customFetch<void>(endpoint, { method: 'PUT', body: game, baseURL: environment.baseUrl })
}

/**
 * Delete a game by id.
 */
export const deleteGame = async (id: number): Promise<void> => {
	const endpoint = environment.apiRoutes.games.delete(id)
	await customFetch<void>(endpoint, { method: 'DELETE', baseURL: environment.baseUrl })
}

/**
 * Bulk update multiple games.
 */
export const bulkUpdateGames = async (data: import('@/models/api/Game').BulkUpdateGameDto): Promise<import('@/models/api/Game').BulkUpdateResult> => {
	const endpoint = `${BASE}/bulk`
	return await customFetch<import('@/models/api/Game').BulkUpdateResult>(endpoint, {
		method: 'PATCH',
		body: data,
		baseURL: environment.baseUrl,
	})
}
