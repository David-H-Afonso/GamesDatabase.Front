import { useCallback } from 'react'
import {
	fetchPlayedStatuses,
	fetchActivePlayedStatuses,
	createPlayedStatus as createPlayedStatusThunk,
	updatePlayedStatus as updatePlayedStatusThunk,
	deletePlayedStatus as deletePlayedStatusThunk,
} from '@/store/features/gamePlayedStatus/thunk'
import type {
	GamePlayedStatusCreateDto,
	GamePlayedStatusUpdateDto,
} from '@/models/api/GamePlayedStatus'
import type { QueryParameters } from '@/models/api/Game'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
	selectPlayedStatuses,
	selectActivePlayedStatuses,
	selectPlayedLoading,
	selectPlayedError,
	selectPlayedPagination,
} from '@/store/features/gamePlayedStatus/selector'
import { dispatchAndUnwrapAsync } from '@/utils'

/**
 * Custom hook for managing game played status state and operations
 */
export const useGamePlayedStatus = () => {
	const dispatch = useAppDispatch()

	// Clear, self-descriptive selector names
	const items = useAppSelector(selectPlayedStatuses)
	const activeItems = useAppSelector(selectActivePlayedStatuses)
	const isLoading = useAppSelector(selectPlayedLoading)
	const errorState = useAppSelector(selectPlayedError)
	const paginationState = useAppSelector(selectPlayedPagination)

	// Fetch list (optional params)
	const fetchList = useCallback(
		async (params?: QueryParameters) => {
			return dispatchAndUnwrapAsync(dispatch, fetchPlayedStatuses(params || {}))
		},
		[dispatch]
	)

	// Fetch only active items
	const fetchActiveList = useCallback(async () => {
		return dispatchAndUnwrapAsync(dispatch, fetchActivePlayedStatuses())
	}, [dispatch])

	// Create a played-status entry
	const createItem = useCallback(
		async (payload: GamePlayedStatusCreateDto) => {
			const result = (await dispatchAndUnwrapAsync(
				dispatch,
				createPlayedStatusThunk(payload)
			)) as any
			if ((result as any).isActive) await fetchActiveList()
			return result
		},
		[dispatch, fetchActiveList]
	)

	// Update an entry
	const updateItem = useCallback(
		async (id: number, payload: GamePlayedStatusUpdateDto) => {
			const updated = (await dispatchAndUnwrapAsync(
				dispatch,
				updatePlayedStatusThunk({ id, data: payload })
			)) as any
			await fetchActiveList()
			return updated
		},
		[dispatch, fetchActiveList]
	)

	// Delete an entry
	const deleteItem = useCallback(
		async (id: number) => {
			await dispatchAndUnwrapAsync(dispatch, deletePlayedStatusThunk(id))
			return true
		},
		[dispatch]
	)

	// Pagination setter (kept for compatibility)
	const setPagination = useCallback((updater: any) => {
		if (typeof updater === 'function') {
			// Not implemented in slice
		}
	}, [])

	return {
		// State (clear names)
		items,
		activeItems,
		loading: isLoading,
		error: errorState,
		pagination: paginationState,

		// Actions (clear names)
		fetchList,
		fetchActiveList,
		createItem,
		updateItem,
		deleteItem,

		// Backwards-compatible aliases
		playedStatuses: items,
		activePlayedStatuses: activeItems,
		loadPlayedStatuses: fetchList,
		loadActivePlayedStatuses: fetchActiveList,
		createPlayedStatus: createItem,
		updatePlayedStatus: updateItem,
		deletePlayedStatus: deleteItem,
		setPagination,
	}
}
