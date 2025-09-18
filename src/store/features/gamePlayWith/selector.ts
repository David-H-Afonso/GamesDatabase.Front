import type { RootState } from '@/store'
import type { GamePlayWith } from '@/models/api/GamePlayWith'

// Selector for all play-with options
export const selectPlayWithOptions = (state: RootState) => state.gamePlayWith.playWithOptions

// Selector for active play-with options
export const selectActivePlayWithOptions = (state: RootState) =>
	state.gamePlayWith.activePlayWithOptions

// Selector for loading state
export const selectPlayWithLoading = (state: RootState) => state.gamePlayWith.loading

// Selector for error state
export const selectPlayWithError = (state: RootState) => state.gamePlayWith.error

// Selector for pagination state
export const selectPlayWithPagination = (state: RootState) => state.gamePlayWith.pagination

// Selector for filters
export const selectPlayWithFilters = (state: RootState) => state.gamePlayWith.filters

// Selector for complete play-with state
export const selectPlayWithState = (state: RootState) => state.gamePlayWith

// Selector for a specific play-with option by ID
export const selectPlayWithById =
	(id: number) =>
	(state: RootState): GamePlayWith | undefined =>
		state.gamePlayWith.playWithOptions.find((p) => p.id === id)
