import { createAsyncThunk } from '@reduxjs/toolkit'
import { getGamePlayWithOptions, getActiveGamePlayWithOptions, createGamePlayWith, updateGamePlayWith, deleteGamePlayWith, getGamePlayWithById } from '@/services'
import type { GamePlayWithCreateDto, GamePlayWithUpdateDto } from '@/models/api/GamePlayWith'
import type { QueryParameters } from '@/models/api/Game'

export const fetchPlayWithOptions = createAsyncThunk('gamePlayWith/fetchPlayWithOptions', async (params: QueryParameters = {}, { rejectWithValue }) => {
	try {
		const response = await getGamePlayWithOptions(params)
		return response
	} catch (error: any) {
		return rejectWithValue(error.message || 'Failed to fetch playWith options')
	}
})

export const fetchActivePlayWithOptions = createAsyncThunk('gamePlayWith/fetchActivePlayWithOptions', async (_, { rejectWithValue }) => {
	try {
		const response = await getActiveGamePlayWithOptions()
		return response
	} catch (error: any) {
		return rejectWithValue(error.message || 'Failed to fetch active playWith options')
	}
})

export const createPlayWith = createAsyncThunk('gamePlayWith/createPlayWith', async (data: GamePlayWithCreateDto, { rejectWithValue }) => {
	try {
		const created = await createGamePlayWith(data)
		return created
	} catch (error: any) {
		return rejectWithValue(error.message || 'Failed to create playWith')
	}
})

export const updatePlayWith = createAsyncThunk('gamePlayWith/updatePlayWith', async ({ id, data }: { id: number; data: GamePlayWithUpdateDto }, { rejectWithValue }) => {
	try {
		await updateGamePlayWith(id, data)
		const updated = await getGamePlayWithById(id)
		return updated
	} catch (error: any) {
		return rejectWithValue(error.message || 'Failed to update playWith')
	}
})

export const deletePlayWith = createAsyncThunk('gamePlayWith/deletePlayWith', async (id: number, { rejectWithValue }) => {
	try {
		await deleteGamePlayWith(id)
		return id
	} catch (error: any) {
		return rejectWithValue(error.message || 'Failed to delete playWith')
	}
})
