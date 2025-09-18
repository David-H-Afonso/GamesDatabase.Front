import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { GamesState } from '@/models/store/GamesState'
import type { Game, GameQueryParameters, PagedResult } from '@/models/api/Game'
import { environment } from '@/environments'
import { fetchGames, fetchGameById, createGame, updateGame, deleteGame } from './thunk'

const initialState: GamesState = {
	games: [],
	currentGame: null,
	loading: false,
	error: null,
	pagination: {
		page: 1,
		pageSize: environment.pagination.defaultPageSize,
		totalCount: 0,
		totalPages: 0,
		hasNextPage: false,
		hasPreviousPage: false,
	},
	filters: {},
	lastAppliedFilters: null,
	isDataFresh: false,
}

const gamesSlice = createSlice({
	name: 'games',
	initialState,
	reducers: {
		setLoading: (state, action: PayloadAction<boolean>) => {
			state.loading = action.payload
		},
		setError: (state, action: PayloadAction<string | null>) => {
			state.error = action.payload
		},
		setGames: (state, action: PayloadAction<PagedResult<Game>>) => {
			state.games = action.payload.data
			state.pagination = {
				page: action.payload.page,
				pageSize: action.payload.pageSize,
				totalCount: action.payload.totalCount,
				totalPages: action.payload.totalPages,
				hasNextPage: action.payload.hasNextPage,
				hasPreviousPage: action.payload.hasPreviousPage,
			}
		},
		setCurrentGame: (state, action: PayloadAction<Game | null>) => {
			state.currentGame = action.payload
		},
		addGame: (state, action: PayloadAction<Game>) => {
			state.games.unshift(action.payload)
			state.pagination.totalCount += 1
		},
		updateGame: (state, action: PayloadAction<Game>) => {
			const index = state.games.findIndex((game) => game.id === action.payload.id)
			if (index !== -1) {
				state.games[index] = action.payload
			}
			if (state.currentGame?.id === action.payload.id) {
				state.currentGame = action.payload
			}
		},
		removeGame: (state, action: PayloadAction<number>) => {
			state.games = state.games.filter((game) => game.id !== action.payload)
			state.pagination.totalCount -= 1
			if (state.currentGame?.id === action.payload) {
				state.currentGame = null
			}
		},
		setFilters: (state, action: PayloadAction<GameQueryParameters>) => {
			state.filters = action.payload
			// Marcar datos como no frescos si los filtros cambiaron
			state.isDataFresh = false
		},
		resetFilters: (state) => {
			state.filters = {}
			state.isDataFresh = false
		},
		// Nuevo reducer para marcar cuando los datos están actualizados
		markDataAsFresh: (state, action: PayloadAction<GameQueryParameters>) => {
			state.lastAppliedFilters = action.payload
			state.isDataFresh = true
		},
		// Nuevo reducer para verificar si necesitamos hacer fetch
		invalidateCache: (state) => {
			state.isDataFresh = false
		},
		resetState: () => initialState,
	},
	extraReducers: (builder) => {
		// Fetch games
		builder
			.addCase(fetchGames.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(fetchGames.fulfilled, (state, action) => {
				state.loading = false
				state.games = action.payload.data
				state.pagination = {
					page: action.payload.page,
					pageSize: action.payload.pageSize,
					totalCount: action.payload.totalCount,
					totalPages: action.payload.totalPages,
					hasNextPage: action.payload.hasNextPage,
					hasPreviousPage: action.payload.hasPreviousPage,
				}
				// Marcar datos como frescos con los filtros utilizados
				state.lastAppliedFilters = action.meta.arg || {}
				state.isDataFresh = true
			})
			.addCase(fetchGames.rejected, (state, action) => {
				state.loading = false
				state.error = (action.payload as string) || 'Failed to fetch games'
			})

		// Fetch game by ID
		builder
			.addCase(fetchGameById.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(fetchGameById.fulfilled, (state, action) => {
				state.loading = false
				state.currentGame = action.payload
			})
			.addCase(fetchGameById.rejected, (state, action) => {
				state.loading = false
				state.error = (action.payload as string) || 'Failed to fetch game'
			})

		// Create game
		builder
			.addCase(createGame.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(createGame.fulfilled, (state, action) => {
				state.loading = false
				state.games.unshift(action.payload)
				state.pagination.totalCount += 1
				// Invalidar caché porque la lista cambió
				state.isDataFresh = false
			})
			.addCase(createGame.rejected, (state, action) => {
				state.loading = false
				state.error = (action.payload as string) || 'Failed to create game'
			})

		// Update game
		builder
			.addCase(updateGame.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(updateGame.fulfilled, (state, action) => {
				state.loading = false
				const index = state.games.findIndex((game) => game.id === action.payload.id)
				if (index !== -1) {
					state.games[index] = action.payload
				}
				if (state.currentGame?.id === action.payload.id) {
					state.currentGame = action.payload
				}
				// Invalidar caché porque un juego cambió
				state.isDataFresh = false
			})
			.addCase(updateGame.rejected, (state, action) => {
				state.loading = false
				state.error = (action.payload as string) || 'Failed to update game'
			})

		// Delete game
		builder
			.addCase(deleteGame.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(deleteGame.fulfilled, (state, action) => {
				state.loading = false
				state.games = state.games.filter((game) => game.id !== action.payload)
				state.pagination.totalCount -= 1
				if (state.currentGame?.id === action.payload) {
					state.currentGame = null
				}
				// Invalidar caché porque la lista cambió
				state.isDataFresh = false
			})
			.addCase(deleteGame.rejected, (state, action) => {
				state.loading = false
				state.error = (action.payload as string) || 'Failed to delete game'
			})
	},
})

export const {
	setLoading,
	setError,
	setGames,
	setCurrentGame,
	addGame,
	updateGame: updateGameAction,
	removeGame,
	setFilters,
	resetFilters,
	markDataAsFresh,
	invalidateCache,
	resetState,
} = gamesSlice.actions

export default gamesSlice.reducer
