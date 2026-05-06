import { customFetch } from '@/utils/customFetch'
import { environment } from '@/environments'
import type { GameReplayType, GameReplayTypeCreateDto, GameReplayTypeUpdateDto } from '@/models/api/GameReplayType'
import type { QueryParameters, PagedResult } from '@/models/api/Game'

const routes = environment.apiRoutes.gameReplayTypes

export const getGameReplayTypes = async (params?: QueryParameters): Promise<PagedResult<GameReplayType>> => {
	return await customFetch<PagedResult<GameReplayType>>(routes.base, {
		method: 'GET',
		params: params as Record<string, string | number | boolean> | undefined,
		baseURL: environment.baseUrl,
	})
}

export const getActiveGameReplayTypes = async (): Promise<GameReplayType[]> => {
	return await customFetch<GameReplayType[]>(routes.active, { method: 'GET', baseURL: environment.baseUrl })
}

export const getSpecialGameReplayType = async (): Promise<GameReplayType> => {
	return await customFetch<GameReplayType>(routes.special, { method: 'GET', baseURL: environment.baseUrl })
}

export const getGameReplayTypeById = async (id: number): Promise<GameReplayType> => {
	return await customFetch<GameReplayType>(routes.byId(id), { method: 'GET', baseURL: environment.baseUrl })
}

export const createGameReplayType = async (dto: GameReplayTypeCreateDto): Promise<GameReplayType> => {
	return await customFetch<GameReplayType>(routes.create, { method: 'POST', body: dto, baseURL: environment.baseUrl })
}

export const updateGameReplayType = async (id: number, dto: GameReplayTypeUpdateDto): Promise<void> => {
	await customFetch<void>(routes.update(id), { method: 'PUT', body: dto, baseURL: environment.baseUrl })
}

export const deleteGameReplayType = async (id: number): Promise<void> => {
	await customFetch<void>(routes.delete(id), { method: 'DELETE', baseURL: environment.baseUrl })
}

export const reorderGameReplayTypes = async (orderedIds: number[]): Promise<void> => {
	await customFetch<void>(routes.reorder, { method: 'POST', body: orderedIds, baseURL: environment.baseUrl })
}
