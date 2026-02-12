import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { GamePlatformState } from '@/models/store/GamePlatformState'
import type { QueryParameters, PagedResult } from '@/models/api/Game'
import { environment } from '@/environments'
import type { GamePlatform } from '@/models/api/GamePlatform'
import { fetchPlatforms, fetchActivePlatforms, createPlatform as createPlatformThunk, updatePlatform as updatePlatformThunk, deletePlatform as deletePlatformThunk } from './thunk'

const initialState: GamePlatformState = {
	platforms: [],
	activePlatforms: [],
	currentPlatform: null,
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

const gamePlatformSlice = createSlice({
	name: 'gamePlatform',
	initialState,
	reducers: {
		setLoading: (state, action: PayloadAction<boolean>) => {
			state.loading = action.payload
		},
		setError: (state, action: PayloadAction<string | null>) => {
			state.error = action.payload
		},
		setPlatforms: (state, action: PayloadAction<PagedResult<GamePlatform>>) => {
			state.platforms = action.payload.data
			state.pagination = {
				page: action.payload.page,
				pageSize: action.payload.pageSize,
				totalCount: action.payload.totalCount,
				totalPages: action.payload.totalPages,
				hasNextPage: action.payload.hasNextPage,
				hasPreviousPage: action.payload.hasPreviousPage,
			}
		},
		setActivePlatforms: (state, action: PayloadAction<GamePlatform[]>) => {
			state.activePlatforms = action.payload
		},
		setCurrentPlatform: (state, action: PayloadAction<GamePlatform | null>) => {
			state.currentPlatform = action.payload
		},
		addPlatform: (state, action: PayloadAction<GamePlatform>) => {
			state.platforms.push(action.payload)
			if (action.payload.isActive) {
				state.activePlatforms.push(action.payload)
			}
		},
		updatePlatform: (state, action: PayloadAction<GamePlatform>) => {
			const index = state.platforms.findIndex((platform) => platform.id === action.payload.id)
			if (index !== -1) {
				state.platforms[index] = action.payload
			}

			const activeIndex = state.activePlatforms.findIndex((platform) => platform.id === action.payload.id)
			if (action.payload.isActive && activeIndex === -1) {
				state.activePlatforms.push(action.payload)
			} else if (!action.payload.isActive && activeIndex !== -1) {
				state.activePlatforms.splice(activeIndex, 1)
			} else if (action.payload.isActive && activeIndex !== -1) {
				state.activePlatforms[activeIndex] = action.payload
			}
		},
		removePlatform: (state, action: PayloadAction<number>) => {
			state.platforms = state.platforms.filter((platform) => platform.id !== action.payload)
			state.activePlatforms = state.activePlatforms.filter((platform) => platform.id !== action.payload)
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
		builder.addCase(fetchPlatforms.pending, (state) => {
			state.loading = true
			state.error = null
		})
		builder.addCase(fetchPlatforms.fulfilled, (state, action) => {
			state.loading = false
			state.platforms = action.payload.data
			state.pagination = {
				page: action.payload.page,
				pageSize: action.payload.pageSize,
				totalCount: action.payload.totalCount,
				totalPages: action.payload.totalPages,
				hasNextPage: action.payload.hasNextPage,
				hasPreviousPage: action.payload.hasPreviousPage,
			}
		})
		builder.addCase(fetchPlatforms.rejected, (state, action) => {
			state.loading = false
			state.error = action.payload as string
		})

		builder.addCase(fetchActivePlatforms.pending, (state) => {
			state.loading = true
			state.error = null
		})
		builder.addCase(fetchActivePlatforms.fulfilled, (state, action) => {
			state.loading = false
			state.activePlatforms = action.payload
		})
		builder.addCase(fetchActivePlatforms.rejected, (state, action) => {
			state.loading = false
			state.error = action.payload as string
		})

		builder.addCase(createPlatformThunk.pending, (state) => {
			state.loading = true
			state.error = null
		})
		builder.addCase(createPlatformThunk.fulfilled, (state, action) => {
			state.loading = false
			state.platforms.push(action.payload)
			if (action.payload.isActive) state.activePlatforms.push(action.payload)
		})
		builder.addCase(createPlatformThunk.rejected, (state, action) => {
			state.loading = false
			state.error = action.payload as string
		})

		builder.addCase(updatePlatformThunk.pending, (state) => {
			state.loading = true
			state.error = null
		})
		builder.addCase(updatePlatformThunk.fulfilled, (state, action) => {
			state.loading = false
			const updated = action.payload
			const idx = state.platforms.findIndex((p) => p.id === updated.id)
			if (idx !== -1) state.platforms[idx] = updated

			const activeIdx = state.activePlatforms.findIndex((p) => p.id === updated.id)
			if (updated.isActive && activeIdx === -1) {
				state.activePlatforms.push(updated)
			} else if (!updated.isActive && activeIdx !== -1) {
				state.activePlatforms.splice(activeIdx, 1)
			} else if (updated.isActive && activeIdx !== -1) {
				state.activePlatforms[activeIdx] = updated
			}
		})
		builder.addCase(updatePlatformThunk.rejected, (state, action) => {
			state.loading = false
			state.error = action.payload as string
		})

		builder.addCase(deletePlatformThunk.pending, (state) => {
			state.loading = true
			state.error = null
		})
		builder.addCase(deletePlatformThunk.fulfilled, (state, action) => {
			state.loading = false
			const id = action.payload as number
			state.platforms = state.platforms.filter((p) => p.id !== id)
			state.activePlatforms = state.activePlatforms.filter((p) => p.id !== id)
		})
		builder.addCase(deletePlatformThunk.rejected, (state, action) => {
			state.loading = false
			state.error = action.payload as string
		})
	},
})

export const {
	setLoading,
	setError,
	setPlatforms,
	setActivePlatforms,
	setCurrentPlatform,
	addPlatform,
	updatePlatform,
	removePlatform,
	setFilters,
	clearFilters,
	setPagination,
	reset,
} = gamePlatformSlice.actions

export default gamePlatformSlice.reducer
