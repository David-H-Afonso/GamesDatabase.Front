import type { RootState } from '@/store'
import type { GameStatus } from '@/models/api/GameStatus'

// Selector for all statuses
export const selectStatuses = (state: RootState) => state.gameStatus.statuses

// Selector for active statuses
export const selectActiveStatuses = (state: RootState) => state.gameStatus.activeStatuses

// Selector for loading state
export const selectStatusLoading = (state: RootState) => state.gameStatus.loading

// Selector for error state
export const selectStatusError = (state: RootState) => state.gameStatus.error

// Selector for pagination info
export const selectStatusPagination = (state: RootState) => state.gameStatus.pagination

// Selector for filters
export const selectStatusFilters = (state: RootState) => state.gameStatus.filters

// Selector for complete statuses state
export const selectStatusesState = (state: RootState) => state.gameStatus

// Selector for a specific status by ID
export const selectStatusById =
	(id: number) =>
	(state: RootState): GameStatus | undefined =>
		state.gameStatus.statuses.find((s) => s.id === id)
