import { createAsyncThunk } from '@reduxjs/toolkit'
import {
	getGameReplayTypes,
	getActiveGameReplayTypes,
	getSpecialGameReplayType,
	getGameReplayTypeById,
	createGameReplayType,
	updateGameReplayType,
	deleteGameReplayType,
} from '@/services'
import type { GameReplayTypeCreateDto, GameReplayTypeUpdateDto } from '@/models/api/GameReplayType'
import type { QueryParameters } from '@/models/api/Game'

export const fetchReplayTypes = createAsyncThunk('gameReplayType/fetchReplayTypes', async (params: QueryParameters = {}, { rejectWithValue }) => {
	try {
		return await getGameReplayTypes(params)
	} catch (error: any) {
		return rejectWithValue(error.message || 'Failed to fetch replay types')
	}
})

export const fetchActiveReplayTypes = createAsyncThunk('gameReplayType/fetchActiveReplayTypes', async (_, { rejectWithValue }) => {
	try {
		return await getActiveGameReplayTypes()
	} catch (error: any) {
		return rejectWithValue(error.message || 'Failed to fetch active replay types')
	}
})

export const fetchSpecialReplayType = createAsyncThunk('gameReplayType/fetchSpecialReplayType', async (_, { rejectWithValue }) => {
	try {
		return await getSpecialGameReplayType()
	} catch (error: any) {
		return rejectWithValue(error.message || 'Failed to fetch special replay type')
	}
})

export const createReplayType = createAsyncThunk('gameReplayType/createReplayType', async (data: GameReplayTypeCreateDto, { rejectWithValue }) => {
	try {
		return await createGameReplayType(data)
	} catch (error: any) {
		return rejectWithValue(error.message || 'Failed to create replay type')
	}
})

export const updateReplayType = createAsyncThunk('gameReplayType/updateReplayType', async ({ id, data }: { id: number; data: GameReplayTypeUpdateDto }, { rejectWithValue }) => {
	try {
		await updateGameReplayType(id, data)
		return await getGameReplayTypeById(id)
	} catch (error: any) {
		return rejectWithValue(error.message || 'Failed to update replay type')
	}
})

export const deleteReplayType = createAsyncThunk('gameReplayType/deleteReplayType', async (id: number, { rejectWithValue }) => {
	try {
		await deleteGameReplayType(id)
		return id
	} catch (error: any) {
		return rejectWithValue(error.message || 'Failed to delete replay type')
	}
})
