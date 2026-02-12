import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { GameStatusState } from '@/models/store/GameStatusState'
import type { QueryParameters, PagedResult } from '@/models/api/Game'
import { environment } from '@/environments'
import type { GameStatus } from '@/models/api/GameStatus'
import {
	fetchStatuses,
	fetchActiveStatuses,
	createStatus as createStatusThunk,
	updateStatus as updateStatusThunk,
	deleteStatus as deleteStatusThunk,
	fetchSpecialStatuses,
	reassignSpecialStatuses,
} from './thunk'

const initialState: GameStatusState = {
	statuses: [],
	activeStatuses: [],
	specialStatuses: [],
	currentStatus: null,
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

const gameStatusSlice = createSlice({
	name: 'gameStatus',
	initialState,
	reducers: {
		setLoading: (state, action: PayloadAction<boolean>) => {
			state.loading = action.payload
		},
		setError: (state, action: PayloadAction<string | null>) => {
			state.error = action.payload
		},
		setStatuses: (state, action: PayloadAction<PagedResult<GameStatus>>) => {
			state.statuses = action.payload.data
			state.pagination = {
				page: action.payload.page,
				pageSize: action.payload.pageSize,
				totalCount: action.payload.totalCount,
				totalPages: action.payload.totalPages,
				hasNextPage: action.payload.hasNextPage,
				hasPreviousPage: action.payload.hasPreviousPage,
			}
		},
		setActiveStatuses: (state, action: PayloadAction<GameStatus[]>) => {
			state.activeStatuses = action.payload
		},
		setCurrentStatus: (state, action: PayloadAction<GameStatus | null>) => {
			state.currentStatus = action.payload
		},
		addStatus: (state, action: PayloadAction<GameStatus>) => {
			state.statuses.unshift(action.payload)
			if (action.payload.isActive) {
				state.activeStatuses.push(action.payload)
				state.activeStatuses.sort((a, b) => a.name.localeCompare(b.name))
			}
			state.pagination.totalCount += 1
		},
		updateStatus: (state, action: PayloadAction<GameStatus>) => {
			const index = state.statuses.findIndex((status) => status.id === action.payload.id)
			if (index !== -1) {
				state.statuses[index] = action.payload
			}

			const activeIndex = state.activeStatuses.findIndex((status) => status.id === action.payload.id)
			if (action.payload.isActive) {
				if (activeIndex !== -1) {
					state.activeStatuses[activeIndex] = action.payload
				} else {
					state.activeStatuses.push(action.payload)
				}
				state.activeStatuses.sort((a, b) => a.name.localeCompare(b.name))
			} else if (activeIndex !== -1) {
				state.activeStatuses.splice(activeIndex, 1)
			}

			if (state.currentStatus?.id === action.payload.id) {
				state.currentStatus = action.payload
			}
		},
		removeStatus: (state, action: PayloadAction<number>) => {
			state.statuses = state.statuses.filter((status) => status.id !== action.payload)
			state.activeStatuses = state.activeStatuses.filter((status) => status.id !== action.payload)
			state.pagination.totalCount -= 1
			if (state.currentStatus?.id === action.payload) {
				state.currentStatus = null
			}
		},
		setFilters: (state, action: PayloadAction<QueryParameters>) => {
			state.filters = action.payload
		},
		resetFilters: (state) => {
			state.filters = {}
		},
		resetState: () => initialState,
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchStatuses.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(fetchStatuses.fulfilled, (state, action) => {
				state.loading = false
				state.statuses = action.payload.data
				state.pagination = {
					page: action.payload.page,
					pageSize: action.payload.pageSize,
					totalCount: action.payload.totalCount,
					totalPages: action.payload.totalPages,
					hasNextPage: action.payload.hasNextPage,
					hasPreviousPage: action.payload.hasPreviousPage,
				}
			})
			.addCase(fetchStatuses.rejected, (state, action) => {
				state.loading = false
				state.error = (action.payload as string) || 'Failed to fetch statuses'
			})

			.addCase(fetchActiveStatuses.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(fetchActiveStatuses.fulfilled, (state, action) => {
				state.loading = false
				state.activeStatuses = action.payload
			})
			.addCase(fetchActiveStatuses.rejected, (state, action) => {
				state.loading = false
				state.error = (action.payload as string) || 'Failed to fetch active statuses'
			})

			.addCase(fetchSpecialStatuses.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(fetchSpecialStatuses.fulfilled, (state, action) => {
				state.loading = false
				state.specialStatuses = action.payload
			})
			.addCase(fetchSpecialStatuses.rejected, (state, action) => {
				state.loading = false
				state.error = (action.payload as string) || 'Failed to fetch special statuses'
			})
			.addCase(reassignSpecialStatuses.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(reassignSpecialStatuses.fulfilled, (state) => {
				state.loading = false
				// payload contains the request payload; no direct state mutation required here
			})
			.addCase(reassignSpecialStatuses.rejected, (state, action) => {
				state.loading = false
				state.error = (action.payload as string) || 'Failed to reassign special statuses'
			})

			.addCase(createStatusThunk.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(createStatusThunk.fulfilled, (state, action) => {
				state.loading = false
				state.statuses.unshift(action.payload)
				if (action.payload.isActive) {
					state.activeStatuses.push(action.payload)
					state.activeStatuses.sort((a, b) => a.name.localeCompare(b.name))
				}
				state.pagination.totalCount += 1
			})
			.addCase(createStatusThunk.rejected, (state, action) => {
				state.loading = false
				state.error = (action.payload as string) || 'Failed to create status'
			})

			.addCase(updateStatusThunk.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(updateStatusThunk.fulfilled, (state, action) => {
				state.loading = false
				const updated = action.payload
				const index = state.statuses.findIndex((s) => s.id === updated.id)
				if (index !== -1) state.statuses[index] = updated

				const activeIndex = state.activeStatuses.findIndex((s) => s.id === updated.id)
				if (updated.isActive) {
					if (activeIndex !== -1) state.activeStatuses[activeIndex] = updated
					else state.activeStatuses.push(updated)
					state.activeStatuses.sort((a, b) => a.name.localeCompare(b.name))
				} else if (activeIndex !== -1) {
					state.activeStatuses.splice(activeIndex, 1)
				}

				if (state.currentStatus?.id === updated.id) state.currentStatus = updated
			})
			.addCase(updateStatusThunk.rejected, (state, action) => {
				state.loading = false
				state.error = (action.payload as string) || 'Failed to update status'
			})

			.addCase(deleteStatusThunk.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(deleteStatusThunk.fulfilled, (state, action) => {
				state.loading = false
				const id = action.payload
				state.statuses = state.statuses.filter((s) => s.id !== id)
				state.activeStatuses = state.activeStatuses.filter((s) => s.id !== id)
				state.pagination.totalCount -= 1
				if (state.currentStatus?.id === id) state.currentStatus = null
			})
			.addCase(deleteStatusThunk.rejected, (state, action) => {
				state.loading = false
				state.error = (action.payload as string) || 'Failed to delete status'
			})
	},
})

export const { setLoading, setError, setStatuses, setActiveStatuses, setCurrentStatus, addStatus, updateStatus, removeStatus, setFilters, resetFilters, resetState } =
	gameStatusSlice.actions

export default gameStatusSlice.reducer
