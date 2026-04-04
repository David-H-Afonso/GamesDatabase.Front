import { customFetch } from '@/utils/customFetch'
import { environment } from '@/environments'
import type { GamePlayedStatus, GamePlayedStatusCreateDto, GamePlayedStatusUpdateDto } from '@/models/api/GamePlayedStatus'
import type { QueryParameters, PagedResult } from '@/models/api/Game'

const BASE = environment.apiRoutes.gamePlayedStatus.base

/**
 * Returns a paged list of game played statuses.
 * Supports pagination, filtering and sorting via `params`.
 */
export const getGamePlayedStatuses = async (params?: QueryParameters): Promise<PagedResult<GamePlayedStatus>> => {
	const endpoint = BASE
	return await customFetch<PagedResult<GamePlayedStatus>>(endpoint, {
		method: 'GET',
		params: params as Record<string, string | number | boolean> | undefined,
		baseURL: environment.baseUrl,
	})
}

/**
 * Returns active (non-paged) game played statuses.
 */
export const getActiveGamePlayedStatuses = async (): Promise<GamePlayedStatus[]> => {
	const endpoint = environment.apiRoutes.gamePlayedStatus.active
	return await customFetch<GamePlayedStatus[]>(endpoint, {
		method: 'GET',
		baseURL: environment.baseUrl,
	})
}

/**
 * Retrieves a single game played status by its id.
 */
export const getGamePlayedStatusById = async (id: number): Promise<GamePlayedStatus> => {
	const endpoint = environment.apiRoutes.gamePlayedStatus.byId(id)
	return await customFetch<GamePlayedStatus>(endpoint, {
		method: 'GET',
		baseURL: environment.baseUrl,
	})
}

/**
 * Creates a new game played status and returns the created resource.
 */
export const createGamePlayedStatus = async (gamePlayedStatus: GamePlayedStatusCreateDto): Promise<GamePlayedStatus> => {
	const endpoint = environment.apiRoutes.gamePlayedStatus.create
	return await customFetch<GamePlayedStatus>(endpoint, {
		method: 'POST',
		body: gamePlayedStatus,
		baseURL: environment.baseUrl,
	})
}

/**
 * Updates an existing game played status.
 */
export const updateGamePlayedStatus = async (id: number, gamePlayedStatus: GamePlayedStatusUpdateDto): Promise<void> => {
	const endpoint = environment.apiRoutes.gamePlayedStatus.update(id)
	await customFetch<void>(endpoint, {
		method: 'PUT',
		body: gamePlayedStatus,
		baseURL: environment.baseUrl,
	})
}

/**
 * Deletes a game played status by id.
 */
export const deleteGamePlayedStatus = async (id: number): Promise<void> => {
	const endpoint = environment.apiRoutes.gamePlayedStatus.delete(id)
	await customFetch<void>(endpoint, { method: 'DELETE', baseURL: environment.baseUrl })
}

/**
 * Reorder game played statuses by providing an ordered list of IDs.
 */
export const reorderGamePlayedStatuses = async (orderedIds: number[]): Promise<void> => {
	const endpoint = environment.apiRoutes.gamePlayedStatus.reorder
	await customFetch<void>(endpoint, {
		method: 'POST',
		body: { orderedIds },
		baseURL: environment.baseUrl,
	})
}
