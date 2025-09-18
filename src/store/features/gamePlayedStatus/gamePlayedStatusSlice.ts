import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { GamePlayedStatusState } from '@/models/store/GamePlayedStatusState'
import type { QueryParameters, PagedResult } from '@/models/api/Game'
import { environment } from '@/environments'
import type { GamePlayedStatus } from '@/models/api/GamePlayedStatus'
import {
	fetchPlayedStatuses,
	fetchActivePlayedStatuses,
	createPlayedStatus as createPlayedStatusThunk,
	updatePlayedStatus as updatePlayedStatusThunk,
	deletePlayedStatus as deletePlayedStatusThunk,
} from './thunk'

const initialState: GamePlayedStatusState = {
	playedStatuses: [],
	activePlayedStatuses: [],
	currentPlayedStatus: null,
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
}

const gamePlayedStatusSlice = createSlice({
	name: 'gamePlayedStatus',
	initialState,
	reducers: {
		setLoading: (state, action: PayloadAction<boolean>) => {
			state.loading = action.payload
		},
		setError: (state, action: PayloadAction<string | null>) => {
			state.error = action.payload
		},
		setPlayedStatuses: (state, action: PayloadAction<PagedResult<GamePlayedStatus>>) => {
			state.playedStatuses = action.payload.data
			state.pagination = {
				page: action.payload.page,
				pageSize: action.payload.pageSize,
				totalCount: action.payload.totalCount,
				totalPages: action.payload.totalPages,
				hasNextPage: action.payload.hasNextPage,
				hasPreviousPage: action.payload.hasPreviousPage,
			}
		},
		setActivePlayedStatuses: (state, action: PayloadAction<GamePlayedStatus[]>) => {
			state.activePlayedStatuses = action.payload
		},
		setCurrentPlayedStatus: (state, action: PayloadAction<GamePlayedStatus | null>) => {
			state.currentPlayedStatus = action.payload
		},
		addPlayedStatus: (state, action: PayloadAction<GamePlayedStatus>) => {
			state.playedStatuses.push(action.payload)
			if (action.payload.isActive) {
				state.activePlayedStatuses.push(action.payload)
			}
		},
		updatePlayedStatus: (state, action: PayloadAction<GamePlayedStatus>) => {
			const index = state.playedStatuses.findIndex((status) => status.id === action.payload.id)
			if (index !== -1) {
				state.playedStatuses[index] = action.payload
			}

			const activeIndex = state.activePlayedStatuses.findIndex(
				(status) => status.id === action.payload.id
			)
			if (action.payload.isActive && activeIndex === -1) {
				state.activePlayedStatuses.push(action.payload)
			} else if (!action.payload.isActive && activeIndex !== -1) {
				state.activePlayedStatuses.splice(activeIndex, 1)
			} else if (action.payload.isActive && activeIndex !== -1) {
				state.activePlayedStatuses[activeIndex] = action.payload
			}
		},
		removePlayedStatus: (state, action: PayloadAction<number>) => {
			state.playedStatuses = state.playedStatuses.filter((status) => status.id !== action.payload)
			state.activePlayedStatuses = state.activePlayedStatuses.filter(
				(status) => status.id !== action.payload
			)
		},
		setFilters: (state, action: PayloadAction<Partial<QueryParameters>>) => {
			state.filters = action.payload
		},
		clearFilters: (state) => {
			state.filters = {}
		},
		setPagination: (state, action: PayloadAction<Partial<typeof initialState.pagination>>) => {
			state.pagination = { ...state.pagination, ...action.payload }
		},
		reset: () => initialState,
	},
	extraReducers: (builder) => {
		// fetch played statuses
		builder.addCase(fetchPlayedStatuses.pending, (state) => {
			state.loading = true
			state.error = null
		})
		builder.addCase(fetchPlayedStatuses.fulfilled, (state, action) => {
			state.loading = false
			state.playedStatuses = action.payload.data
			state.pagination = {
				page: action.payload.page,
				pageSize: action.payload.pageSize,
				totalCount: action.payload.totalCount,
				totalPages: action.payload.totalPages,
				hasNextPage: action.payload.hasNextPage,
				hasPreviousPage: action.payload.hasPreviousPage,
			}
		})
		builder.addCase(fetchPlayedStatuses.rejected, (state, action) => {
			state.loading = false
			state.error = action.payload as string
		})

		// fetch active
		builder.addCase(fetchActivePlayedStatuses.pending, (state) => {
			state.loading = true
			state.error = null
		})
		builder.addCase(fetchActivePlayedStatuses.fulfilled, (state, action) => {
			state.loading = false
			state.activePlayedStatuses = action.payload
		})
		builder.addCase(fetchActivePlayedStatuses.rejected, (state, action) => {
			state.loading = false
			state.error = action.payload as string
		})

		// create
		builder.addCase(createPlayedStatusThunk.pending, (state) => {
			state.loading = true
			state.error = null
		})
		builder.addCase(createPlayedStatusThunk.fulfilled, (state, action) => {
			state.loading = false
			state.playedStatuses.push(action.payload)
			if (action.payload.isActive) state.activePlayedStatuses.push(action.payload)
		})
		builder.addCase(createPlayedStatusThunk.rejected, (state, action) => {
			state.loading = false
			state.error = action.payload as string
		})

		// update
		builder.addCase(updatePlayedStatusThunk.pending, (state) => {
			state.loading = true
			state.error = null
		})
		builder.addCase(updatePlayedStatusThunk.fulfilled, (state, action) => {
			state.loading = false
			const updated = action.payload
			const idx = state.playedStatuses.findIndex((s) => s.id === updated.id)
			if (idx !== -1) state.playedStatuses[idx] = updated

			const activeIdx = state.activePlayedStatuses.findIndex((s) => s.id === updated.id)
			if (updated.isActive && activeIdx === -1) {
				state.activePlayedStatuses.push(updated)
			} else if (!updated.isActive && activeIdx !== -1) {
				state.activePlayedStatuses.splice(activeIdx, 1)
			} else if (updated.isActive && activeIdx !== -1) {
				state.activePlayedStatuses[activeIdx] = updated
			}
		})
		builder.addCase(updatePlayedStatusThunk.rejected, (state, action) => {
			state.loading = false
			state.error = action.payload as string
		})

		// delete
		builder.addCase(deletePlayedStatusThunk.pending, (state) => {
			state.loading = true
			state.error = null
		})
		builder.addCase(deletePlayedStatusThunk.fulfilled, (state, action) => {
			state.loading = false
			const id = action.payload as number
			state.playedStatuses = state.playedStatuses.filter((s) => s.id !== id)
			state.activePlayedStatuses = state.activePlayedStatuses.filter((s) => s.id !== id)
		})
		builder.addCase(deletePlayedStatusThunk.rejected, (state, action) => {
			state.loading = false
			state.error = action.payload as string
		})
	},
})

export const {
	setLoading,
	setError,
	setPlayedStatuses,
	setActivePlayedStatuses,
	setCurrentPlayedStatus,
	addPlayedStatus,
	updatePlayedStatus,
	removePlayedStatus,
	setFilters,
	clearFilters,
	setPagination,
	reset,
} = gamePlayedStatusSlice.actions

export default gamePlayedStatusSlice.reducer
