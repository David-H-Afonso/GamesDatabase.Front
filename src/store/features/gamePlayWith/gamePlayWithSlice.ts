import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { GamePlayWithState } from '@/models/store/GamePlayWithState'
import type { QueryParameters, PagedResult } from '@/models/api/Game'
import { environment } from '@/environments'
import type { GamePlayWith } from '@/models/api/GamePlayWith'
import {
	fetchPlayWithOptions,
	fetchActivePlayWithOptions,
	createPlayWith as createPlayWithThunk,
	updatePlayWith as updatePlayWithThunk,
	deletePlayWith as deletePlayWithThunk,
} from './thunk'

const initialState: GamePlayWithState = {
	playWithOptions: [],
	activePlayWithOptions: [],
	currentPlayWith: null,
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

const gamePlayWithSlice = createSlice({
	name: 'gamePlayWith',
	initialState,
	reducers: {
		setLoading: (state, action: PayloadAction<boolean>) => {
			state.loading = action.payload
		},
		setError: (state, action: PayloadAction<string | null>) => {
			state.error = action.payload
		},
		setPlayWithOptions: (state, action: PayloadAction<PagedResult<GamePlayWith>>) => {
			state.playWithOptions = action.payload.data
			state.pagination = {
				page: action.payload.page,
				pageSize: action.payload.pageSize,
				totalCount: action.payload.totalCount,
				totalPages: action.payload.totalPages,
				hasNextPage: action.payload.hasNextPage,
				hasPreviousPage: action.payload.hasPreviousPage,
			}
		},
		setActivePlayWithOptions: (state, action: PayloadAction<GamePlayWith[]>) => {
			state.activePlayWithOptions = action.payload
		},
		setCurrentPlayWith: (state, action: PayloadAction<GamePlayWith | null>) => {
			state.currentPlayWith = action.payload
		},
		addPlayWith: (state, action: PayloadAction<GamePlayWith>) => {
			state.playWithOptions.push(action.payload)
			if (action.payload.isActive) {
				state.activePlayWithOptions.push(action.payload)
			}
		},
		updatePlayWith: (state, action: PayloadAction<GamePlayWith>) => {
			const index = state.playWithOptions.findIndex((option) => option.id === action.payload.id)
			if (index !== -1) state.playWithOptions[index] = action.payload

			const activeIndex = state.activePlayWithOptions.findIndex((option) => option.id === action.payload.id)
			if (action.payload.isActive && activeIndex === -1) state.activePlayWithOptions.push(action.payload)
			else if (!action.payload.isActive && activeIndex !== -1) state.activePlayWithOptions.splice(activeIndex, 1)
			else if (action.payload.isActive && activeIndex !== -1) state.activePlayWithOptions[activeIndex] = action.payload
		},
		removePlayWith: (state, action: PayloadAction<number>) => {
			state.playWithOptions = state.playWithOptions.filter((option) => option.id !== action.payload)
			state.activePlayWithOptions = state.activePlayWithOptions.filter((option) => option.id !== action.payload)
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
		builder
			.addCase(fetchPlayWithOptions.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(fetchPlayWithOptions.fulfilled, (state, action) => {
				state.loading = false
				state.playWithOptions = action.payload.data
				state.pagination = {
					page: action.payload.page,
					pageSize: action.payload.pageSize,
					totalCount: action.payload.totalCount,
					totalPages: action.payload.totalPages,
					hasNextPage: action.payload.hasNextPage,
					hasPreviousPage: action.payload.hasPreviousPage,
				}
			})
			.addCase(fetchPlayWithOptions.rejected, (state, action) => {
				state.loading = false
				state.error = (action.payload as string) || 'Failed to fetch playWith options'
			})
			.addCase(fetchActivePlayWithOptions.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(fetchActivePlayWithOptions.fulfilled, (state, action) => {
				state.loading = false
				state.activePlayWithOptions = action.payload
			})
			.addCase(fetchActivePlayWithOptions.rejected, (state, action) => {
				state.loading = false
				state.error = (action.payload as string) || 'Failed to fetch active playWith options'
			})
			.addCase(createPlayWithThunk.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(createPlayWithThunk.fulfilled, (state, action) => {
				state.loading = false
				state.playWithOptions.push(action.payload)
				if (action.payload.isActive) state.activePlayWithOptions.push(action.payload)
			})
			.addCase(createPlayWithThunk.rejected, (state, action) => {
				state.loading = false
				state.error = (action.payload as string) || 'Failed to create playWith'
			})
			.addCase(updatePlayWithThunk.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(updatePlayWithThunk.fulfilled, (state, action) => {
				state.loading = false
				const updated = action.payload
				const idx = state.playWithOptions.findIndex((p) => p.id === updated.id)
				if (idx !== -1) state.playWithOptions[idx] = updated
				const activeIdx = state.activePlayWithOptions.findIndex((p) => p.id === updated.id)
				if (updated.isActive && activeIdx === -1) state.activePlayWithOptions.push(updated)
				else if (!updated.isActive && activeIdx !== -1) state.activePlayWithOptions.splice(activeIdx, 1)
				else if (updated.isActive && activeIdx !== -1) state.activePlayWithOptions[activeIdx] = updated
			})
			.addCase(updatePlayWithThunk.rejected, (state, action) => {
				state.loading = false
				state.error = (action.payload as string) || 'Failed to update playWith'
			})
			.addCase(deletePlayWithThunk.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(deletePlayWithThunk.fulfilled, (state, action) => {
				state.loading = false
				const id = action.payload
				state.playWithOptions = state.playWithOptions.filter((p) => p.id !== id)
				state.activePlayWithOptions = state.activePlayWithOptions.filter((p) => p.id !== id)
			})
			.addCase(deletePlayWithThunk.rejected, (state, action) => {
				state.loading = false
				state.error = (action.payload as string) || 'Failed to delete playWith'
			})
	},
})

export const {
	setLoading,
	setError,
	setPlayWithOptions,
	setActivePlayWithOptions,
	setCurrentPlayWith,
	addPlayWith,
	updatePlayWith,
	removePlayWith,
	setFilters,
	clearFilters,
	setPagination,
	reset,
} = gamePlayWithSlice.actions

export default gamePlayWithSlice.reducer
