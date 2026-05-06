import { customFetch } from '@/utils/customFetch'
import { environment } from '@/environments'
import type { GameStatus, GameStatusCreateDto, GameStatusUpdateDto } from '@/models/api/GameStatus'
import type { QueryParameters, PagedResult } from '@/models/api/Game'

const BASE = environment.apiRoutes.gameStatus.base

/**
 * Fetch special (predefined) game statuses provided by the API.
 */
export const getSpecialGameStatuses = async (): Promise<GameStatus[]> => {
	const endpoint = environment.apiRoutes.gameStatus.special
	return await customFetch<GameStatus[]>(endpoint, { method: 'GET', baseURL: environment.baseUrl })
}

/**
 * Fetch paged game statuses with optional query params.
 */
export const getGameStatuses = async (params?: QueryParameters): Promise<PagedResult<GameStatus>> => {
	const endpoint = BASE
	return await customFetch<PagedResult<GameStatus>>(endpoint, {
		method: 'GET',
		params: params as Record<string, string | number | boolean> | undefined,
		baseURL: environment.baseUrl,
	})
}

/**
 * Fetch active (non-paginated) game statuses.
 */
export const getActiveGameStatuses = async (): Promise<GameStatus[]> => {
	const endpoint = environment.apiRoutes.gameStatus.active
	return await customFetch<GameStatus[]>(endpoint, { method: 'GET', baseURL: environment.baseUrl })
}

/**
 * Fetch a single game status by id.
 */
export const getGameStatusById = async (id: number): Promise<GameStatus> => {
	const endpoint = environment.apiRoutes.gameStatus.byId(id)
	return await customFetch<GameStatus>(endpoint, { method: 'GET', baseURL: environment.baseUrl })
}

/**
 * Create a new game status and return the created resource.
 */
export const createGameStatus = async (gameStatus: GameStatusCreateDto): Promise<GameStatus> => {
	const endpoint = environment.apiRoutes.gameStatus.create
	return await customFetch<GameStatus>(endpoint, {
		method: 'POST',
		body: gameStatus,
		baseURL: environment.baseUrl,
	})
}

/**
 * Update an existing game status.
 */
export const updateGameStatus = async (id: number, gameStatus: GameStatusUpdateDto): Promise<void> => {
	const endpoint = environment.apiRoutes.gameStatus.update(id)
	await customFetch<void>(endpoint, {
		method: 'PUT',
		body: gameStatus,
		baseURL: environment.baseUrl,
	})
}

/**
 * Delete a game status by id.
 */
export const deleteGameStatus = async (id: number): Promise<void> => {
	const endpoint = environment.apiRoutes.gameStatus.delete(id)
	await customFetch<void>(endpoint, { method: 'DELETE', baseURL: environment.baseUrl })
}

/**
 * Reassign special statuses of a given statusType to a new default status id.
 */
export const reassignSpecialStatuses = async (payload: { newDefaultStatusId: number; statusType: string }): Promise<void> => {
	const endpoint = environment.apiRoutes.gameStatus.reassignSpecial
	await customFetch<void>(endpoint, { method: 'POST', body: payload, baseURL: environment.baseUrl })
}

/**
 * Reorder game statuses by providing an ordered list of IDs.
 */
export const reorderGameStatuses = async (orderedIds: number[]): Promise<void> => {
	const endpoint = environment.apiRoutes.gameStatus.reorder
	await customFetch<void>(endpoint, {
		method: 'POST',
		body: { orderedIds },
		baseURL: environment.baseUrl,
	})
}
