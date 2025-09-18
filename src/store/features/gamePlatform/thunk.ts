import { createAsyncThunk } from '@reduxjs/toolkit'
import {
	getGamePlatforms,
	getActiveGamePlatforms,
	createGamePlatform,
	updateGamePlatform,
	deleteGamePlatform,
	getGamePlatformById,
} from '@/services'
import type { GamePlatformCreateDto, GamePlatformUpdateDto } from '@/models/api/GamePlatform'
import type { QueryParameters } from '@/models/api/Game'

export const fetchPlatforms = createAsyncThunk(
	'gamePlatform/fetchPlatforms',
	async (params: QueryParameters = {}, { rejectWithValue }) => {
		try {
			const response = await getGamePlatforms(params)
			return response
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to fetch platforms')
		}
	}
)

export const fetchActivePlatforms = createAsyncThunk(
	'gamePlatform/fetchActivePlatforms',
	async (_, { rejectWithValue }) => {
		try {
			const response = await getActiveGamePlatforms()
			return response
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to fetch active platforms')
		}
	}
)

export const createPlatform = createAsyncThunk(
	'gamePlatform/createPlatform',
	async (data: GamePlatformCreateDto, { rejectWithValue }) => {
		try {
			const created = await createGamePlatform(data)
			return created
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to create platform')
		}
	}
)

export const updatePlatform = createAsyncThunk(
	'gamePlatform/updatePlatform',
	async ({ id, data }: { id: number; data: GamePlatformUpdateDto }, { rejectWithValue }) => {
		try {
			await updateGamePlatform(id, data)
			const updated = await getGamePlatformById(id)
			return updated
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to update platform')
		}
	}
)

export const deletePlatform = createAsyncThunk(
	'gamePlatform/deletePlatform',
	async (id: number, { rejectWithValue }) => {
		try {
			await deleteGamePlatform(id)
			return id
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to delete platform')
		}
	}
)
