import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { GameReplayTypeState } from '@/models/store/GameReplayTypeState'
import type { QueryParameters, PagedResult } from '@/models/api/Game'
import { environment } from '@/environments'
import type { GameReplayType } from '@/models/api/GameReplayType'
import {
	fetchReplayTypes,
	fetchActiveReplayTypes,
	fetchSpecialReplayType,
	createReplayType as createReplayTypeThunk,
	updateReplayType as updateReplayTypeThunk,
	deleteReplayType as deleteReplayTypeThunk,
} from './thunk'

const initialState: GameReplayTypeState = {
	replayTypes: [],
	activeReplayTypes: [],
	specialReplayType: null,
	currentReplayType: null,
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

const gameReplayTypeSlice = createSlice({
	name: 'gameReplayType',
	initialState,
	reducers: {
		setLoading: (state, action: PayloadAction<boolean>) => {
			state.loading = action.payload
		},
		setError: (state, action: PayloadAction<string | null>) => {
			state.error = action.payload
		},
		setReplayTypes: (state, action: PayloadAction<PagedResult<GameReplayType>>) => {
			state.replayTypes = action.payload.data
			state.pagination = {
				page: action.payload.page,
				pageSize: action.payload.pageSize,
				totalCount: action.payload.totalCount,
				totalPages: action.payload.totalPages,
				hasNextPage: action.payload.hasNextPage,
				hasPreviousPage: action.payload.hasPreviousPage,
			}
		},
		setActiveReplayTypes: (state, action: PayloadAction<GameReplayType[]>) => {
			state.activeReplayTypes = action.payload
		},
		setCurrentReplayType: (state, action: PayloadAction<GameReplayType | null>) => {
			state.currentReplayType = action.payload
		},
		setFilters: (state, action: PayloadAction<Partial<QueryParameters>>) => {
			state.filters = action.payload
		},
		clearFilters: (state) => {
			state.filters = {}
		},
		reset: () => initialState,
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchReplayTypes.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(fetchReplayTypes.fulfilled, (state, action) => {
				state.loading = false
				state.replayTypes = action.payload.data
				state.pagination = {
					page: action.payload.page,
					pageSize: action.payload.pageSize,
					totalCount: action.payload.totalCount,
					totalPages: action.payload.totalPages,
					hasNextPage: action.payload.hasNextPage,
					hasPreviousPage: action.payload.hasPreviousPage,
				}
			})
			.addCase(fetchReplayTypes.rejected, (state, action) => {
				state.loading = false
				state.error = (action.payload as string) || 'Failed to fetch replay types'
			})
			.addCase(fetchActiveReplayTypes.fulfilled, (state, action) => {
				state.activeReplayTypes = action.payload
			})
			.addCase(fetchSpecialReplayType.fulfilled, (state, action) => {
				state.specialReplayType = action.payload
			})
			.addCase(fetchSpecialReplayType.rejected, (state) => {
				state.specialReplayType = null
			})
			.addCase(createReplayTypeThunk.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(createReplayTypeThunk.fulfilled, (state, action) => {
				state.loading = false
				state.replayTypes.push(action.payload)
				if (action.payload.isActive) state.activeReplayTypes.push(action.payload)
			})
			.addCase(createReplayTypeThunk.rejected, (state, action) => {
				state.loading = false
				state.error = (action.payload as string) || 'Failed to create replay type'
			})
			.addCase(updateReplayTypeThunk.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(updateReplayTypeThunk.fulfilled, (state, action) => {
				state.loading = false
				const updated = action.payload
				const idx = state.replayTypes.findIndex((type) => type.id === updated.id)
				if (idx !== -1) state.replayTypes[idx] = updated
				const activeIdx = state.activeReplayTypes.findIndex((type) => type.id === updated.id)
				if (updated.isActive && activeIdx === -1) state.activeReplayTypes.push(updated)
				else if (!updated.isActive && activeIdx !== -1) state.activeReplayTypes.splice(activeIdx, 1)
				else if (updated.isActive && activeIdx !== -1) state.activeReplayTypes[activeIdx] = updated
			})
			.addCase(updateReplayTypeThunk.rejected, (state, action) => {
				state.loading = false
				state.error = (action.payload as string) || 'Failed to update replay type'
			})
			.addCase(deleteReplayTypeThunk.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(deleteReplayTypeThunk.fulfilled, (state, action) => {
				state.loading = false
				const id = action.payload
				state.replayTypes = state.replayTypes.filter((type) => type.id !== id)
				state.activeReplayTypes = state.activeReplayTypes.filter((type) => type.id !== id)
			})
			.addCase(deleteReplayTypeThunk.rejected, (state, action) => {
				state.loading = false
				state.error = (action.payload as string) || 'Failed to delete replay type'
			})
	},
})

export const { setLoading, setError, setReplayTypes, setActiveReplayTypes, setCurrentReplayType, setFilters, clearFilters, reset } = gameReplayTypeSlice.actions

export default gameReplayTypeSlice.reducer
