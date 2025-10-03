import { createAsyncThunk } from '@reduxjs/toolkit'
import { environment } from '@/environments'
import {
	createGame as createGameService,
	updateGame as updateGameService,
	getGameById,
	getGames,
	deleteGame as deleteGameService,
} from '@/services/GamesService'
import type { GameCreateDto, GameUpdateDto, GameQueryParameters } from '@/models/api/Game'

// Async thunk for fetching games with pagination and filters
export const fetchGames = createAsyncThunk(
	'games/fetchGames',
	async (params: GameQueryParameters = {}, { rejectWithValue }) => {
		try {
			const query = { pageSize: environment.pagination.defaultPageSize, ...(params || {}) }
			const response = await getGames(query)
			return response
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to fetch games')
		}
	}
)

// Async thunk for fetching a single game by ID
export const fetchGameById = createAsyncThunk(
	'games/fetchGameById',
	async (id: number, { rejectWithValue }) => {
		try {
			const response = await getGameById(id)
			return response
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to fetch game')
		}
	}
)

// Async thunk for creating a new game
export const createGame = createAsyncThunk(
	'games/createGame',
	async (gameData: GameCreateDto, { rejectWithValue }) => {
		try {
			const response = await createGameService(gameData)
			return response
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to create game')
		}
	}
)

// Async thunk for updating an existing game
export const updateGame = createAsyncThunk(
	'games/updateGame',
	async ({ id, gameData }: { id: number; gameData: GameUpdateDto }, { rejectWithValue }) => {
		try {
			await updateGameService(id, gameData)
			// Return the updated game data for the reducer
			const updatedGame = await getGameById(id)
			return updatedGame
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to update game')
		}
	}
)

// Async thunk for deleting a game
export const deleteGame = createAsyncThunk(
	'games/deleteGame',
	async (id: number, { rejectWithValue }) => {
		try {
			await deleteGameService(id)
			return id
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to delete game')
		}
	}
)
