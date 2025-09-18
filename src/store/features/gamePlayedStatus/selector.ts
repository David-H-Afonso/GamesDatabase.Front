import type { RootState } from '@/store'
import type { GamePlayedStatusState } from '@/models/store/GamePlayedStatusState'

const selectState = (state: RootState) => state.gamePlayedStatus as GamePlayedStatusState

// Selector for all played statuses
export const selectPlayedStatuses = (state: RootState) => selectState(state).playedStatuses

// Selector for active played statuses
export const selectActivePlayedStatuses = (state: RootState) =>
	selectState(state).activePlayedStatuses

// Selector for loading state
export const selectPlayedLoading = (state: RootState) => selectState(state).loading

// Selector for error state
export const selectPlayedError = (state: RootState) => selectState(state).error

// Selector for pagination state
export const selectPlayedPagination = (state: RootState) => selectState(state).pagination

// Selector for filters
export const selectPlayedFilters = (state: RootState) => selectState(state).filters

// Selector for complete played status state
export const selectPlayedState = (state: RootState) => selectState(state)

// Selector for a specific played status by ID
export const selectPlayedById = (state: RootState, id: number) =>
	selectState(state).playedStatuses.find((s) => s.id === id) || null
