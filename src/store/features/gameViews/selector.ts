import type { RootState } from '@/store'

// Selector for all game views
export const selectGameViews = (state: RootState) => state.gameViews.gameViews

// Selector for public game views
export const selectPublicGameViews = (state: RootState) => state.gameViews.publicGameViews

// Selector for current game view
export const selectCurrentGameView = (state: RootState) => state.gameViews.currentGameView

// Selector for loading state
export const selectGameViewsLoading = (state: RootState) => state.gameViews.loading

// Selector for error state
export const selectGameViewsError = (state: RootState) => state.gameViews.error

// Selector for filters
export const selectGameViewsFilters = (state: RootState) => state.gameViews.filters

// Selector for complete game views state
export const selectGameViewsState = (state: RootState) => state.gameViews

// Selector for a specific game view by ID
export const selectGameViewById = (id: number) => (state: RootState) =>
	state.gameViews.gameViews.find((view) => view.id === id) || state.gameViews.publicGameViews.find((view) => view.id === id)
