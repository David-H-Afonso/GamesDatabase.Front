import { customFetch } from '@/utils/customFetch'
import { environment } from '@/environments'
import type { GameHistoryEntry, GameHistoryQueryParameters } from '@/models/api/GameHistoryEntry'
import type { PagedResult } from '@/models/api/Game'

const routes = environment.apiRoutes.gameHistory

export const getHistoryByGameId = async (gameId: number, page = 1, pageSize = 50): Promise<PagedResult<GameHistoryEntry>> => {
	return await customFetch<PagedResult<GameHistoryEntry>>(routes.byGameId(gameId), {
		method: 'GET',
		params: { page, pageSize },
		baseURL: environment.baseUrl,
	})
}

export const deleteHistoryEntry = async (gameId: number, entryId: number): Promise<void> => {
	await customFetch<void>(routes.entryById(gameId, entryId), { method: 'DELETE', baseURL: environment.baseUrl })
}

export const clearGameHistory = async (gameId: number): Promise<void> => {
	await customFetch<void>(routes.byGameId(gameId), { method: 'DELETE', baseURL: environment.baseUrl })
}

export const getGlobalHistory = async (params?: GameHistoryQueryParameters): Promise<PagedResult<GameHistoryEntry>> => {
	return await customFetch<PagedResult<GameHistoryEntry>>(routes.global, {
		method: 'GET',
		params: params as Record<string, string | number | boolean> | undefined,
		baseURL: environment.baseUrl,
	})
}

export const getAdminHistory = async (params?: GameHistoryQueryParameters): Promise<PagedResult<GameHistoryEntry>> => {
	return await customFetch<PagedResult<GameHistoryEntry>>(routes.adminGlobal, {
		method: 'GET',
		params: params as Record<string, string | number | boolean> | undefined,
		baseURL: environment.baseUrl,
	})
}
