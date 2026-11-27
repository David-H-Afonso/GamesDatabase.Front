import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { GameViewState } from '@/models/store/GameViewState'
import type { GameView, GameViewQueryParameters } from '@/models/api/GameView'

import { fetchGameViews, fetchPublicGameViews, fetchGameViewById, createGameViewThunk, updateGameViewThunk, updateGameViewConfiguration, deleteGameViewThunk } from './thunk'

const initialState: GameViewState = {
	gameViews: [],
	publicGameViews: [],
	currentGameView: null,
	loading: false,
	error: null,
	filters: {},
	pinRevision: 0,
}

const gameViewSlice = createSlice({
	name: 'gameViews',
	initialState,
	reducers: {
		setLoading: (state, action: PayloadAction<boolean>) => {
			state.loading = action.payload
		},
		setError: (state, action: PayloadAction<string | null>) => {
			state.error = action.payload
		},
		setCurrentGameView: (state, action: PayloadAction<GameView | null>) => {
			state.currentGameView = action.payload
		},
		addGameView: (state, action: PayloadAction<GameView>) => {
			state.gameViews.unshift(action.payload)
			// Add to public views if it's public
			if (action.payload.isPublic) {
				state.publicGameViews.unshift(action.payload)
			}
		},
		updateGameView: (state, action: PayloadAction<GameView>) => {
			const index = state.gameViews.findIndex((view) => view.id === action.payload.id)
			if (index !== -1) {
				state.gameViews[index] = action.payload
			}
			// Update in public views
			const publicIndex = state.publicGameViews.findIndex((view) => view.id === action.payload.id)
			if (action.payload.isPublic) {
				if (publicIndex !== -1) {
					state.publicGameViews[publicIndex] = action.payload
				} else {
					state.publicGameViews.push(action.payload)
				}
			} else if (publicIndex !== -1) {
				// Remove from public views if no longer public
				state.publicGameViews.splice(publicIndex, 1)
			}
			// Update current view if it's the same
			if (state.currentGameView?.id === action.payload.id) {
				state.currentGameView = action.payload
			}
		},
		removeGameView: (state, action: PayloadAction<number>) => {
			state.gameViews = state.gameViews.filter((view) => view.id !== action.payload)
			state.publicGameViews = state.publicGameViews.filter((view) => view.id !== action.payload)
			if (state.currentGameView?.id === action.payload) {
				state.currentGameView = null
			}
		},
		setFilters: (state, action: PayloadAction<GameViewQueryParameters>) => {
			state.filters = action.payload
		},
		resetFilters: (state) => {
			state.filters = {}
		},
		resetState: () => initialState,
		recordViewUsage: (state, action: PayloadAction<Array<Pick<GameView, 'id' | 'lastUsedAt'>>>) => {
			const byId = new Map(action.payload.map(view => [view.id, view.lastUsedAt]))
			for (const view of [...state.gameViews, ...state.publicGameViews, ...(state.currentGameView ? [state.currentGameView] : [])]) {
				const timestamp = byId.get(view.id)
				const next = Date.parse(timestamp ?? ''), previous = Date.parse(view.lastUsedAt ?? '')
				if (timestamp && Number.isFinite(next) && (!Number.isFinite(previous) || next > previous)) view.lastUsedAt = timestamp
			}
		},
		applyViewPins: (state, action: PayloadAction<Array<Pick<GameView, 'id' | 'pinnedSlot'>>>) => {
			const pins = new Map(action.payload.map(view => [view.id, view.pinnedSlot]))
			for (const view of [...state.gameViews, ...state.publicGameViews, ...(state.currentGameView ? [state.currentGameView] : [])]) if (pins.has(view.id)) view.pinnedSlot = pins.get(view.id)
			state.pinRevision = (state.pinRevision ?? 0) + 1
		},
	},
	extraReducers: (builder) => {
		// Fetch GameViews
		builder
			.addCase(fetchGameViews.pending, (state, action) => {
				state.loading = true
				state.error = null
				state.viewsRead = { requestId: action.meta.requestId, pinRevision: state.pinRevision ?? 0 }
			})
			.addCase(fetchGameViews.fulfilled, (state, action) => {
				if (state.viewsRead && state.viewsRead.requestId !== action.meta.requestId) return
				if (state.viewsRead && state.viewsRead.pinRevision !== (state.pinRevision ?? 0)) { state.loading = false; return }
				state.loading = false
				state.error = null
				// Replace the current list with the fetched ones
				state.gameViews = action.payload || []
			})
			.addCase(fetchGameViews.rejected, (state, action) => {
				if (state.viewsRead && (state.viewsRead.requestId !== action.meta.requestId || state.viewsRead.pinRevision !== (state.pinRevision ?? 0))) return
				state.loading = false
				state.error = action.payload as string
			})

			// Fetch public game views
			.addCase(fetchPublicGameViews.pending, (state, action) => {
				state.publicViewsRead = { requestId: action.meta.requestId, pinRevision: state.pinRevision ?? 0 }
			})
			.addCase(fetchPublicGameViews.fulfilled, (state, action) => {
				if (state.publicViewsRead && (state.publicViewsRead.requestId !== action.meta.requestId || state.publicViewsRead.pinRevision !== (state.pinRevision ?? 0))) return
				state.loading = false
				state.error = null
				state.publicGameViews = action.payload || []
			})

		// Fetch GameView by id
		builder
			.addCase(fetchGameViewById.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(fetchGameViewById.fulfilled, (state, action) => {
				state.loading = false
				state.currentGameView = action.payload
			})
			.addCase(fetchGameViewById.rejected, (state, action) => {
				state.loading = false
				state.error = action.payload as string
			})

		// Create GameView
		builder
			.addCase(createGameViewThunk.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(createGameViewThunk.fulfilled, (state, action) => {
				state.loading = false
				const created: any = action.payload
				if (created) {
					// Insert to head
					state.gameViews.unshift(created)
					if (created.isPublic) state.publicGameViews.unshift(created)
				}
			})
			.addCase(createGameViewThunk.rejected, (state, action) => {
				state.loading = false
				state.error = action.payload as string
			})

		// Update GameView
		builder
			.addCase(updateGameViewThunk.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(updateGameViewThunk.fulfilled, (state, action) => {
				state.loading = false
				const updated = action.payload
				const index = state.gameViews.findIndex((view) => view.id === updated.id)
				if (index !== -1) {
					state.gameViews[index] = updated
				}
				// Update in public views
				const publicIndex = state.publicGameViews.findIndex((view) => view.id === updated.id)
				if (updated.isPublic) {
					if (publicIndex !== -1) {
						state.publicGameViews[publicIndex] = updated
					} else {
						state.publicGameViews.push(updated)
					}
				} else if (publicIndex !== -1) {
					state.publicGameViews.splice(publicIndex, 1)
				}
				if (state.currentGameView?.id === updated.id) {
					state.currentGameView = updated
				}
			})
			.addCase(updateGameViewThunk.rejected, (state, action) => {
				state.loading = false
				state.error = action.payload as string
			})

			// Update GameView Configuration (partial)
			.addCase(updateGameViewConfiguration.fulfilled, (state, action) => {
				const updated = action.payload
				state.loading = false
				// Update currentGameView if matches
				if (state.currentGameView?.id === updated.id) {
					state.currentGameView = updated
				}
				// Update in lists if present
				const index = state.gameViews.findIndex((v) => v.id === updated.id)
				if (index !== -1) state.gameViews[index] = updated
				const publicIndex = state.publicGameViews.findIndex((v) => v.id === updated.id)
				if (publicIndex !== -1) state.publicGameViews[publicIndex] = updated
			})

		// Delete GameView
		builder
			.addCase(deleteGameViewThunk.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(deleteGameViewThunk.fulfilled, (state, action) => {
				state.loading = false
				const id = action.payload
				state.gameViews = state.gameViews.filter((view) => view.id !== id)
				state.publicGameViews = state.publicGameViews.filter((view) => view.id !== id)
				if (state.currentGameView?.id === id) {
					state.currentGameView = null
				}
			})
			.addCase(deleteGameViewThunk.rejected, (state, action) => {
				state.loading = false
				state.error = action.payload as string
			})
	},
})

export const { setLoading, setError, setCurrentGameView, addGameView, updateGameView, removeGameView, setFilters, resetFilters, resetState, recordViewUsage, applyViewPins } = gameViewSlice.actions

export default gameViewSlice.reducer
