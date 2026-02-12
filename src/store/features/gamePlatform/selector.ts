import type { RootState } from '@/store'
import type { GamePlatformState } from '@/models/store/GamePlatformState'

const selectState = (state: RootState) => state.gamePlatform as GamePlatformState

// Selector for all platforms
export const selectPlatforms = (state: RootState) => selectState(state).platforms

// Selector for active platforms
export const selectActivePlatforms = (state: RootState) => selectState(state).activePlatforms

// Selector for loading state
export const selectPlatformLoading = (state: RootState) => selectState(state).loading

// Selector for error state
export const selectPlatformError = (state: RootState) => selectState(state).error

// Selector for pagination state
export const selectPlatformPagination = (state: RootState) => selectState(state).pagination

// Selector for filters
export const selectPlatformFilters = (state: RootState) => selectState(state).filters

// Selector for complete platform state
export const selectPlatformState = (state: RootState) => selectState(state)

// Selector for a specific platform by ID
export const selectPlatformById = (state: RootState, id: number) => selectState(state).platforms.find((p) => p.id === id) || null
