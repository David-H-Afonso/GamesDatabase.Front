import { createAsyncThunk } from '@reduxjs/toolkit'
import {
	getGameStatuses,
	getActiveGameStatuses,
	createGameStatus,
	updateGameStatus,
	deleteGameStatus,
	getGameStatusById,
} from '@/services'
import type { GameStatusCreateDto, GameStatusUpdateDto } from '@/models/api/GameStatus'
import type { QueryParameters } from '@/models/api/Game'

// Fetch paged statuses (supports filters, sort, pagination)
export const fetchStatuses = createAsyncThunk(
	'gameStatus/fetchStatuses',
	async (params: QueryParameters = {}, { rejectWithValue }) => {
		try {
			const response = await getGameStatuses(params)
			return response
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to fetch statuses')
		}
	}
)

// Fetch active statuses (non-paged)
export const fetchActiveStatuses = createAsyncThunk(
	'gameStatus/fetchActiveStatuses',
	async (_, { rejectWithValue }) => {
		try {
			const response = await getActiveGameStatuses()
			return response
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to fetch active statuses')
		}
	}
)

// Create a new status
export const createStatus = createAsyncThunk(
	'gameStatus/createStatus',
	async (statusData: GameStatusCreateDto, { rejectWithValue }) => {
		try {
			const created = await createGameStatus(statusData)
			return created
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to create status')
		}
	}
)

// Update existing status and return updated resource
export const updateStatus = createAsyncThunk(
	'gameStatus/updateStatus',
	async (
		{ id, statusData }: { id: number; statusData: GameStatusUpdateDto },
		{ rejectWithValue }
	) => {
		try {
			await updateGameStatus(id, statusData)
			const updated = await getGameStatusById(id)
			return updated
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to update status')
		}
	}
)

// Delete status by id
export const deleteStatus = createAsyncThunk(
	'gameStatus/deleteStatus',
	async (id: number, { rejectWithValue }) => {
		try {
			await deleteGameStatus(id)
			return id
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to delete status')
		}
	}
)
