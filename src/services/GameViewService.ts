import { customFetch } from '@/utils/customFetch'
import { environment } from '@/environments'
import type {
	GameView,
	GameViewCreateDto,
	GameViewUpdateDto,
	GameViewQueryParameters,
} from '@/models/api/GameView'

const BASE = environment.apiRoutes.gameViews.base

/**
 * Fetch paged GameViews with optional query parameters
 */
export const getGameViews = async (params?: GameViewQueryParameters): Promise<GameView[]> => {
	const endpoint = BASE
	const response = await customFetch<GameView[]>(endpoint, {
		method: 'GET',
		params: params as Record<string, string | number | boolean> | undefined,
		baseURL: environment.baseUrl,
	})

	return response
}

/**
 * Fetch a single GameView by id
 */
export const getGameViewById = async (id: number): Promise<GameView> => {
	const endpoint = environment.apiRoutes.gameViews.byId(id)
	const gameView = await customFetch<GameView>(endpoint, {
		method: 'GET',
		baseURL: environment.baseUrl,
	})

	return gameView
}

/**
 * Create a new GameView
 */
export const createGameView = async (gameViewData: GameViewCreateDto): Promise<GameView> => {
	const endpoint = environment.apiRoutes.gameViews.create

	// Build payload: prefer new configuration.filterGroups shape. If only legacy filters are present,
	// convert them into a single FilterGroup so the backend receives a consistent structure.
	const configuration: any = {}

	if (gameViewData.configuration?.filterGroups?.length) {
		configuration.filterGroups = gameViewData.configuration.filterGroups
		configuration.groupCombineWith = gameViewData.configuration.groupCombineWith
	} else if (gameViewData.configuration?.filters) {
		// Wrap legacy filters into a single group
		configuration.filterGroups = [
			{
				combineWith: gameViewData.configuration.groupCombineWith ?? 'And',
				filters: gameViewData.configuration.filters || [],
			},
		]
		configuration.groupCombineWith = gameViewData.configuration.groupCombineWith
	}

	if (gameViewData.configuration?.sorting) {
		configuration.sorting = gameViewData.configuration.sorting
	}

	const payload = {
		name: gameViewData.name,
		description: gameViewData.description,
		configuration,
		isPublic: gameViewData.isPublic ?? true,
		createdBy: gameViewData.createdBy,
	}

	return await customFetch<GameView>(endpoint, {
		method: 'POST',
		body: payload,
		baseURL: environment.baseUrl,
	})
}

/**
 * Update an existing GameView
 */
export const updateGameView = async (
	id: number,
	gameViewData: GameViewUpdateDto
): Promise<void> => {
	const endpoint = environment.apiRoutes.gameViews.update(id)

	// Build payload: prefer new configuration.filterGroups shape. If only legacy filters are present,
	// convert them into a single group so the backend receives a consistent structure.
	const configuration: any = {}

	if (gameViewData.configuration?.filterGroups?.length) {
		configuration.filterGroups = gameViewData.configuration.filterGroups
		configuration.groupCombineWith = gameViewData.configuration.groupCombineWith
	} else if (gameViewData.configuration?.filters) {
		configuration.filterGroups = [
			{
				combineWith: gameViewData.configuration.groupCombineWith ?? 'And',
				filters: gameViewData.configuration.filters || [],
			},
		]
		configuration.groupCombineWith = gameViewData.configuration.groupCombineWith
	}

	if (gameViewData.configuration?.sorting) {
		configuration.sorting = gameViewData.configuration.sorting
	}

	const payload = {
		id,
		name: gameViewData.name,
		description: gameViewData.description,
		configuration,
		isPublic: gameViewData.isPublic ?? true,
		createdBy: gameViewData.createdBy,
	}

	await customFetch<void>(endpoint, {
		method: 'PUT',
		body: payload,
		baseURL: environment.baseUrl,
	})
}

/**
 * Delete a GameView by id
 */
export const deleteGameView = async (id: number): Promise<void> => {
	const endpoint = environment.apiRoutes.gameViews.delete(id)
	await customFetch<void>(endpoint, {
		method: 'DELETE',
		baseURL: environment.baseUrl,
	})
}

/**
 * Get all public GameViews (simplified version for view selector)
 */
export const getPublicGameViews = async (): Promise<GameView[]> => {
	const response = await getGameViews({
		isPublic: true,
		pageSize: 100, // Assume we won't have more than 100 public views
	})
	return response
}

/**
 * Update only the configuration for a GameView.
 * Accepts either a ViewConfiguration object, an array of ViewFilter, or a single ViewFilter
 */
export const updateGameViewConfiguration = async (
	id: number,
	configuration: any
): Promise<GameView> => {
	const endpoint = `${BASE}/${id}/configuration`

	// The API accepts multiple shapes; send configuration as-is
	const body = configuration

	return await customFetch<GameView>(endpoint, {
		method: 'PUT',
		body,
		baseURL: environment.baseUrl,
	})
}

/**
 * Reorder game views by providing an ordered list of IDs.
 */
export const reorderGameViews = async (orderedIds: number[]): Promise<void> => {
	const endpoint = `${BASE}/reorder`
	await customFetch<void>(endpoint, {
		method: 'POST',
		body: { orderedIds },
		baseURL: environment.baseUrl,
	})
}
