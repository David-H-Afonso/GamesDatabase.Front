import { createAsyncThunk } from '@reduxjs/toolkit'
import {
	getGamePlayedStatuses,
	getActiveGamePlayedStatuses,
	createGamePlayedStatus,
	updateGamePlayedStatus,
	deleteGamePlayedStatus,
	getGamePlayedStatusById,
} from '@/services'
import type {
	GamePlayedStatusCreateDto,
	GamePlayedStatusUpdateDto,
} from '@/models/api/GamePlayedStatus'
import type { QueryParameters } from '@/models/api/Game'

export const fetchPlayedStatuses = createAsyncThunk(
	'gamePlayedStatus/fetchPlayedStatuses',
	async (params: QueryParameters = {}, { rejectWithValue }) => {
		try {
			const response = await getGamePlayedStatuses(params)
			return response
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to fetch played statuses')
		}
	}
)

export const fetchActivePlayedStatuses = createAsyncThunk(
	'gamePlayedStatus/fetchActivePlayedStatuses',
	async (_, { rejectWithValue }) => {
		try {
			const response = await getActiveGamePlayedStatuses()
			return response
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to fetch active played statuses')
		}
	}
)

export const createPlayedStatus = createAsyncThunk(
	'gamePlayedStatus/createPlayedStatus',
	async (data: GamePlayedStatusCreateDto, { rejectWithValue }) => {
		try {
			const created = await createGamePlayedStatus(data)
			return created
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to create played status')
		}
	}
)

export const updatePlayedStatus = createAsyncThunk(
	'gamePlayedStatus/updatePlayedStatus',
	async ({ id, data }: { id: number; data: GamePlayedStatusUpdateDto }, { rejectWithValue }) => {
		try {
			await updateGamePlayedStatus(id, data)
			const updated = await getGamePlayedStatusById(id)
			return updated
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to update played status')
		}
	}
)

export const deletePlayedStatus = createAsyncThunk(
	'gamePlayedStatus/deletePlayedStatus',
	async (id: number, { rejectWithValue }) => {
		try {
			await deleteGamePlayedStatus(id)
			return id
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to delete played status')
		}
	}
)
