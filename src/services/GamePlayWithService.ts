import { customFetch } from '@/utils/customFetch'
import { environment } from '@/environments'
import type {
	GamePlayWith,
	GamePlayWithCreateDto,
	GamePlayWithUpdateDto,
} from '@/models/api/GamePlayWith'
import type { QueryParameters, PagedResult } from '@/models/api/Game'

const BASE = environment.apiRoutes.gamePlayWith.base

/**
 * Returns paged game play-with options with optional query parameters.
 */
export const getGamePlayWithOptions = async (
	params?: QueryParameters
): Promise<PagedResult<GamePlayWith>> => {
	const endpoint = BASE
	return await customFetch<PagedResult<GamePlayWith>>(endpoint, {
		method: 'GET',
		params: params as Record<string, string | number | boolean> | undefined,
		baseURL: environment.baseUrl,
	})
}

/**
 * Returns only active (non-paginated) play-with options.
 */
export const getActiveGamePlayWithOptions = async (): Promise<GamePlayWith[]> => {
	const endpoint = environment.apiRoutes.gamePlayWith.active
	return await customFetch<GamePlayWith[]>(endpoint, {
		method: 'GET',
		baseURL: environment.baseUrl,
	})
}

/**
 * Fetches a single play-with option by id.
 */
export const getGamePlayWithById = async (id: number): Promise<GamePlayWith> => {
	const endpoint = environment.apiRoutes.gamePlayWith.byId(id)
	return await customFetch<GamePlayWith>(endpoint, { method: 'GET', baseURL: environment.baseUrl })
}

/**
 * Creates a new play-with option and returns the created resource.
 */
export const createGamePlayWith = async (
	gamePlayWith: GamePlayWithCreateDto
): Promise<GamePlayWith> => {
	const endpoint = environment.apiRoutes.gamePlayWith.create
	return await customFetch<GamePlayWith>(endpoint, {
		method: 'POST',
		body: gamePlayWith,
		baseURL: environment.baseUrl,
	})
}

/**
 * Updates an existing play-with option.
 */
export const updateGamePlayWith = async (
	id: number,
	gamePlayWith: GamePlayWithUpdateDto
): Promise<void> => {
	const endpoint = environment.apiRoutes.gamePlayWith.update(id)
	await customFetch<void>(endpoint, {
		method: 'PUT',
		body: gamePlayWith,
		baseURL: environment.baseUrl,
	})
}

/**
 * Deletes a play-with option by id.
 */
export const deleteGamePlayWith = async (id: number): Promise<void> => {
	const endpoint = environment.apiRoutes.gamePlayWith.delete(id)
	await customFetch<void>(endpoint, { method: 'DELETE', baseURL: environment.baseUrl })
}

/**
 * Reorder game play-with options by providing an ordered list of IDs.
 */
export const reorderGamePlayWith = async (orderedIds: number[]): Promise<void> => {
	const endpoint = environment.apiRoutes.gamePlayWith.reorder
	await customFetch<void>(endpoint, {
		method: 'POST',
		body: { orderedIds },
		baseURL: environment.baseUrl,
	})
}
