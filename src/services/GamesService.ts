import { customFetch } from '@/utils/customFetch'
import { environment } from '@/environments'
import type {
	Game,
	GameCreateDto,
	GameUpdateDto,
	GameQueryParameters,
	PagedResult,
} from '@/models/api/Game'

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
 * Returns games released and started in a given year (simple list)
 */
export const getReleasedAndStarted = async (
	params?: GameQueryParameters
): Promise<PagedResult<Game>> => {
	const endpoint = `${BASE}/released-and-started`
	const query = { ...(params || {}) }
	return await customFetch<PagedResult<Game>>(endpoint, {
		method: 'GET',
		params: query,
		baseURL: environment.baseUrl,
	})
}

/**
 * Returns games that were started in a year or match a given status
 */
export const getStartedOrStatus = async (
	params?: GameQueryParameters & { status?: string }
): Promise<PagedResult<Game>> => {
	const endpoint = `${BASE}/started-or-status`
	const query: Record<string, any> = { ...(params || {}) }
	if (params?.status) query.status = params.status
	return await customFetch<PagedResult<Game>>(endpoint, {
		method: 'GET',
		params: query,
		baseURL: environment.baseUrl,
	})
}

/**
 * Returns games with no 'started' date ordered by score (accepts same filters)
 */
export const getNoStartedByScore = async (
	params?: GameQueryParameters
): Promise<PagedResult<Game>> => {
	const endpoint = `${BASE}/no-started-by-score`
	const query: Record<string, any> = { ...(params || {}) }
	return await customFetch<PagedResult<Game>>(endpoint, {
		method: 'GET',
		params: query,
		baseURL: environment.baseUrl,
	})
}
