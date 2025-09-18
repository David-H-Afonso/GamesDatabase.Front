import type { RootState } from '@/store'

// Selector for all games
export const selectGames = (state: RootState) => state.games.games

// Selector for current game
export const selectCurrentGame = (state: RootState) => state.games.currentGame

// Selector for loading state
export const selectGamesLoading = (state: RootState) => state.games.loading

// Selector for error state
export const selectGamesError = (state: RootState) => state.games.error

// Selector for pagination info
export const selectGamesPagination = (state: RootState) => state.games.pagination

// Selector for filters
export const selectGamesFilters = (state: RootState) => state.games.filters

// Selector for last applied filters (caché)
export const selectLastAppliedFilters = (state: RootState) => state.games.lastAppliedFilters

// Selector for data freshness
export const selectIsDataFresh = (state: RootState) => state.games.isDataFresh

// Selector for complete games state
export const selectGamesState = (state: RootState) => state.games

// Selector for a specific game by ID
export const selectGameById = (gameId: number) => (state: RootState) =>
	state.games.games.find((game) => game.id === gameId)

// Selector for games by status
export const selectGamesByStatus = (statusId: number) => (state: RootState) =>
	state.games.games.filter((game) => game.statusId === statusId)

// Selector for games by platform
export const selectGamesByPlatform = (platformId: number) => (state: RootState) =>
	state.games.games.filter((game) => game.platformId === platformId)
