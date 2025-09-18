import { useCallback } from 'react'
import {
	fetchPlatforms,
	fetchActivePlatforms,
	createPlatform as createPlatformThunk,
	updatePlatform as updatePlatformThunk,
	deletePlatform as deletePlatformThunk,
} from '@/store/features/gamePlatform/thunk'
import type { GamePlatformCreateDto, GamePlatformUpdateDto } from '@/models/api/GamePlatform'
import type { QueryParameters } from '@/models/api/Game'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
	selectPlatforms,
	selectActivePlatforms,
	selectPlatformLoading,
	selectPlatformError,
	selectPlatformPagination,
} from '@/store/features/gamePlatform/selector'
import { dispatchAndUnwrapAsync } from '@/utils'

/**
 * Custom hook for managing game platform state and operations
 */
export const useGamePlatform = () => {
	const dispatch = useAppDispatch()

	// Clear selector names
	const items = useAppSelector(selectPlatforms)
	const activeItems = useAppSelector(selectActivePlatforms)
	const isLoading = useAppSelector(selectPlatformLoading)
	const errorState = useAppSelector(selectPlatformError)
	const paginationState = useAppSelector(selectPlatformPagination)

	// Fetch all platforms (optional params)
	const fetchList = useCallback(
		async (params?: QueryParameters) => {
			return dispatchAndUnwrapAsync(dispatch, fetchPlatforms(params || {}))
		},
		[dispatch]
	)

	// Fetch only active platforms
	const fetchActiveList = useCallback(async () => {
		return dispatchAndUnwrapAsync(dispatch, fetchActivePlatforms())
	}, [dispatch])

	// Create platform
	const createItem = useCallback(
		async (payload: GamePlatformCreateDto) => {
			const result = (await dispatchAndUnwrapAsync(dispatch, createPlatformThunk(payload))) as any
			if ((result as any).isActive) await fetchActiveList()
			return result
		},
		[dispatch, fetchActiveList]
	)

	// Update platform
	const updateItem = useCallback(
		async (id: number, payload: GamePlatformUpdateDto) => {
			const updated = (await dispatchAndUnwrapAsync(
				dispatch,
				updatePlatformThunk({ id, data: payload })
			)) as any
			await fetchActiveList()
			return updated
		},
		[dispatch, fetchActiveList]
	)

	// Delete platform
	const deleteItem = useCallback(
		async (id: number) => {
			await dispatchAndUnwrapAsync(dispatch, deletePlatformThunk(id))
			return true
		},
		[dispatch]
	)

	// Pagination setter placeholder
	const setPagination = useCallback((updater: any) => {
		if (typeof updater === 'function') {
			// Not implemented in slice
		}
	}, [])

	return {
		// State
		items,
		activeItems,
		loading: isLoading,
		error: errorState,
		pagination: paginationState,

		// Actions
		fetchList,
		fetchActiveList,
		createItem,
		updateItem,
		deleteItem,

		// Backwards-compatible aliases
		platforms: items,
		activePlatforms: activeItems,
		loadPlatforms: fetchList,
		loadActivePlatforms: fetchActiveList,
		createPlatform: createItem,
		updatePlatform: updateItem,
		deletePlatform: deleteItem,
		setPagination,
	}
}
