import { createAsyncThunk } from '@reduxjs/toolkit'
import {
	createGame as createGameService,
	updateGame as updateGameService,
	getGameById,
	getGames,
	deleteGame as deleteGameService,
	getReleasedAndStarted,
	getStartedOrStatus,
	getNoStartedByScore,
} from '@/services/GamesService'
import type { GameCreateDto, GameUpdateDto, GameQueryParameters } from '@/models/api/Game'

// Async thunk for fetching games with pagination and filters
export const fetchGames = createAsyncThunk(
	'games/fetchGames',
	async (params: GameQueryParameters = {}, { rejectWithValue }) => {
		try {
			const response = await getGames(params)
			return response
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to fetch games')
		}
	}
)

// Fetch games released and started in a specific year (simple list)
export const fetchReleasedAndStarted = createAsyncThunk(
	'games/fetchReleasedAndStarted',
	async (params: GameQueryParameters & { year?: number } = {}, { rejectWithValue }) => {
		try {
			const response = await getReleasedAndStarted(params)
			return response
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to fetch released-and-started')
		}
	}
)

// Fetch games started in a year or matching a status
export const fetchStartedOrStatus = createAsyncThunk(
	'games/fetchStartedOrStatus',
	async (
		params: GameQueryParameters & { year?: number; status?: string } = {},
		{ rejectWithValue }
	) => {
		try {
			const response = await getStartedOrStatus(params)
			return response
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to fetch started-or-status')
		}
	}
)

// Fetch games with no started date ordered by score
export const fetchNoStartedByScore = createAsyncThunk(
	'games/fetchNoStartedByScore',
	async (params: GameQueryParameters = {}, { rejectWithValue }) => {
		try {
			const response = await getNoStartedByScore(params)
			return response
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to fetch no-started-by-score')
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
