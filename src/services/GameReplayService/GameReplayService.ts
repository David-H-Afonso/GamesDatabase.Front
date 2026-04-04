import { customFetch } from '@/utils/customFetch'
import { environment } from '@/environments'
import type { GameReplay, GameReplayCreateDto, GameReplayUpdateDto } from '@/models/api/GameReplay'

const routes = environment.apiRoutes.gameReplays

export const getReplaysByGameId = async (gameId: number): Promise<GameReplay[]> => {
	return await customFetch<GameReplay[]>(routes.byGameId(gameId), { method: 'GET', baseURL: environment.baseUrl })
}

export const createGameReplay = async (gameId: number, dto: GameReplayCreateDto): Promise<GameReplay> => {
	return await customFetch<GameReplay>(routes.byGameId(gameId), { method: 'POST', body: dto, baseURL: environment.baseUrl })
}

export const updateGameReplay = async (gameId: number, id: number, dto: GameReplayUpdateDto): Promise<void> => {
	await customFetch<void>(routes.byId(gameId, id), { method: 'PUT', body: dto, baseURL: environment.baseUrl })
}

export const deleteGameReplay = async (gameId: number, id: number): Promise<void> => {
	await customFetch<void>(routes.byId(gameId, id), { method: 'DELETE', baseURL: environment.baseUrl })
}
