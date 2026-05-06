import { customFetch } from '@/utils/customFetch'
import { environment } from '@/environments'
import type { GamePlatform, GamePlatformCreateDto, GamePlatformUpdateDto } from '@/models/api/GamePlatform'
import type { QueryParameters, PagedResult } from '@/models/api/Game'

const BASE = environment.apiRoutes.gamePlatform.base

/**
 * Returns a paged list of game platforms.
 * Accepts optional query parameters for pagination, filtering and sorting.
 */
export const getGamePlatforms = async (params?: QueryParameters): Promise<PagedResult<GamePlatform>> => {
	const endpoint = BASE
	return await customFetch<PagedResult<GamePlatform>>(endpoint, {
		method: 'GET',
		params: params as Record<string, string | number | boolean> | undefined,
		baseURL: environment.baseUrl,
	})
}

/**
 * Returns active (non-paged) game platforms.
 */
export const getActiveGamePlatforms = async (): Promise<GamePlatform[]> => {
	const endpoint = environment.apiRoutes.gamePlatform.active
	return await customFetch<GamePlatform[]>(endpoint, {
		method: 'GET',
		baseURL: environment.baseUrl,
	})
}

/**
 * Retrieves a single game platform by its id.
 */
export const getGamePlatformById = async (id: number): Promise<GamePlatform> => {
	const endpoint = environment.apiRoutes.gamePlatform.byId(id)
	return await customFetch<GamePlatform>(endpoint, { method: 'GET', baseURL: environment.baseUrl })
}

/**
 * Creates a new game platform and returns the created resource.
 */
export const createGamePlatform = async (gamePlatform: GamePlatformCreateDto): Promise<GamePlatform> => {
	const endpoint = environment.apiRoutes.gamePlatform.create
	return await customFetch<GamePlatform>(endpoint, {
		method: 'POST',
		body: gamePlatform,
		baseURL: environment.baseUrl,
	})
}

/**
 * Updates an existing game platform.
 */
export const updateGamePlatform = async (id: number, gamePlatform: GamePlatformUpdateDto): Promise<void> => {
	const endpoint = environment.apiRoutes.gamePlatform.update(id)
	await customFetch<void>(endpoint, {
		method: 'PUT',
		body: gamePlatform,
		baseURL: environment.baseUrl,
	})
}

/**
 * Deletes a game platform by id.
 */
export const deleteGamePlatform = async (id: number): Promise<void> => {
	const endpoint = environment.apiRoutes.gamePlatform.delete(id)
	await customFetch<void>(endpoint, { method: 'DELETE', baseURL: environment.baseUrl })
}

/**
 * Reorder game platforms by providing an ordered list of IDs.
 */
export const reorderGamePlatforms = async (orderedIds: number[]): Promise<void> => {
	const endpoint = environment.apiRoutes.gamePlatform.reorder
	await customFetch<void>(endpoint, {
		method: 'POST',
		body: { orderedIds },
		baseURL: environment.baseUrl,
	})
}
