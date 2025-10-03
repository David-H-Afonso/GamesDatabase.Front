import { createAsyncThunk } from '@reduxjs/toolkit'
import {
	getGameViews,
	getGameViewById,
	createGameView,
	updateGameView,
	updateGameViewConfiguration as updateGameViewConfigurationService,
	deleteGameView,
	getPublicGameViews,
} from '@/services'
import type {
	GameViewCreateDto,
	GameViewUpdateDto,
	GameViewQueryParameters,
} from '@/models/api/GameView'

// Fetch paged GameViews
export const fetchGameViews = createAsyncThunk(
	'gameViews/fetchGameViews',
	async (params: GameViewQueryParameters = {}, { rejectWithValue }) => {
		try {
			const response = await getGameViews(params)
			return response
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to fetch game views')
		}
	}
)

// Fetch public GameViews for view selector
export const fetchPublicGameViews = createAsyncThunk(
	'gameViews/fetchPublicGameViews',
	async (_, { rejectWithValue }) => {
		try {
			const response = await getPublicGameViews()
			return response
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to fetch public game views')
		}
	}
)

// Fetch single GameView by id
export const fetchGameViewById = createAsyncThunk(
	'gameViews/fetchGameViewById',
	async (id: number, { rejectWithValue }) => {
		try {
			const response = await getGameViewById(id)
			return response
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to fetch game view')
		}
	}
)

// Create new GameView
export const createGameViewThunk = createAsyncThunk(
	'gameViews/createGameView',
	async (gameViewData: GameViewCreateDto, { rejectWithValue }) => {
		try {
			const created = await createGameView(gameViewData)
			return created
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to create game view')
		}
	}
)

// Update existing GameView
export const updateGameViewThunk = createAsyncThunk(
	'gameViews/updateGameView',
	async (
		{ id, gameViewData }: { id: number; gameViewData: GameViewUpdateDto },
		{ rejectWithValue }
	) => {
		try {
			await updateGameView(id, gameViewData)
			const updated = await getGameViewById(id)
			return updated
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to update game view')
		}
	}
)

// Delete GameView by id
export const deleteGameViewThunk = createAsyncThunk(
	'gameViews/deleteGameView',
	async (id: number, { rejectWithValue }) => {
		try {
			await deleteGameView(id)
			return id
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to delete game view')
		}
	}
)

// Update only configuration for a GameView
export const updateGameViewConfiguration = createAsyncThunk(
	'gameViews/updateGameViewConfiguration',
	async ({ id, configuration }: { id: number; configuration: any }, { rejectWithValue }) => {
		try {
			const updated = await updateGameViewConfigurationService(id, configuration)
			return updated
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to update game view configuration')
		}
	}
)
