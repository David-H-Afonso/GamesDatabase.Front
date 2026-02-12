import { useCallback } from 'react'
import {
	fetchStatuses,
	fetchActiveStatuses,
	createStatus as createStatusThunk,
	updateStatus as updateStatusThunk,
	deleteStatus as deleteStatusThunk,
	fetchSpecialStatuses,
	reassignSpecialStatuses,
} from '@/store/features/gameStatus/thunk'
import type { GameStatusCreateDto, GameStatusUpdateDto } from '@/models/api/GameStatus'
import type { QueryParameters } from '@/models/api/Game'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setLoading, setError, addStatus, removeStatus } from '@/store/features/gameStatus/gameStatusSlice'
import { dispatchAndUnwrapAsync } from '@/utils'

/**
 * Custom hook for managing game status state and operations
 */
export const useGameStatus = () => {
	const dispatch = useAppDispatch()

	// State selectors (clear local names)
	const statusList = useAppSelector((state) => state.gameStatus.statuses)
	const activeStatusList = useAppSelector((state) => state.gameStatus.activeStatuses)
	const specialStatusList = useAppSelector((state) => state.gameStatus.specialStatuses)
	const isLoading = useAppSelector((state) => state.gameStatus.loading)
	const errorState = useAppSelector((state) => state.gameStatus.error)
	const paginationState = useAppSelector((state) => state.gameStatus.pagination)

	// Load full list (with optional query params)
	const fetchStatusList = useCallback(
		async (params?: QueryParameters) => {
			try {
				dispatch(setLoading(true))
				dispatch(setError(null))
				return await dispatchAndUnwrapAsync(dispatch, fetchStatuses(params ?? {}))
			} catch (err: any) {
				dispatch(setError(err || 'Failed to load statuses'))
			} finally {
				dispatch(setLoading(false))
			}
		},
		[dispatch]
	)

	type ActiveStatusList = typeof activeStatusList
	const fetchActiveStatusList = useCallback(async (): Promise<ActiveStatusList | undefined> => {
		try {
			dispatch(setLoading(true))
			dispatch(setError(null))
			return (await dispatchAndUnwrapAsync(dispatch, fetchActiveStatuses())) as ActiveStatusList
		} catch (err: any) {
			dispatch(setError(err || 'Failed to load active statuses'))
			return undefined
		} finally {
			dispatch(setLoading(false))
		}
	}, [dispatch])

	// Fetch special statuses
	type SpecialStatusList = typeof specialStatusList
	const fetchSpecialStatusList = useCallback(async (): Promise<SpecialStatusList | undefined> => {
		try {
			dispatch(setLoading(true))
			dispatch(setError(null))
			return (await dispatchAndUnwrapAsync(dispatch, fetchSpecialStatuses())) as SpecialStatusList
		} catch (err: any) {
			dispatch(setError(err || 'Failed to load special statuses'))
			return undefined
		} finally {
			dispatch(setLoading(false))
		}
	}, [dispatch])

	// Create a new status
	const createNewStatus = useCallback(
		async (payload: GameStatusCreateDto) => {
			try {
				dispatch(setLoading(true))
				dispatch(setError(null))
				const created = (await dispatchAndUnwrapAsync(dispatch, createStatusThunk(payload))) as any
				dispatch(addStatus(created))
				if ((created as any).isActive) await fetchActiveStatusList()
				return created
			} catch (err: any) {
				dispatch(setError(err || 'Failed to create status'))
				throw err
			} finally {
				dispatch(setLoading(false))
			}
		},
		[dispatch, fetchActiveStatusList]
	)

	// Update existing status
	const updateExistingStatus = useCallback(
		async (id: number, payload: GameStatusUpdateDto) => {
			try {
				dispatch(setLoading(true))
				dispatch(setError(null))
				const updated = (await dispatchAndUnwrapAsync(dispatch, updateStatusThunk({ id, statusData: payload }))) as any
				// refresh list and active statuses
				await dispatchAndUnwrapAsync(dispatch, fetchStatuses({}))
				await fetchActiveStatusList()
				return updated
			} catch (err: any) {
				dispatch(setError(err || 'Failed to update status'))
				throw err
			} finally {
				dispatch(setLoading(false))
			}
		},
		[dispatch, fetchActiveStatusList]
	)

	// Delete by id
	const deleteById = useCallback(
		async (id: number) => {
			try {
				dispatch(setLoading(true))
				dispatch(setError(null))
				await dispatchAndUnwrapAsync(dispatch, deleteStatusThunk(id))
				dispatch(removeStatus(id))
				return true
			} catch (err: any) {
				dispatch(setError(err || 'Failed to delete status'))
				throw err
			} finally {
				dispatch(setLoading(false))
			}
		},
		[dispatch]
	)

	// Pagination helper (kept simple for now)
	const setPagination = useCallback((updater: any) => {
		if (typeof updater === 'function') {
			// not implemented
		}
	}, [])

	// Reassign special statuses (wraps thunk)
	const reassignSpecial = useCallback(
		async (payload: { newDefaultStatusId: number; statusType: string }) => {
			try {
				dispatch(setLoading(true))
				dispatch(setError(null))
				await dispatchAndUnwrapAsync(dispatch, reassignSpecialStatuses(payload))
				return true
			} catch (err: any) {
				dispatch(setError(err || 'Failed to reassign special statuses'))
				throw err
			} finally {
				dispatch(setLoading(false))
			}
		},
		[dispatch]
	)

	return {
		// State
		statuses: statusList,
		activeStatuses: activeStatusList,
		specialStatuses: specialStatusList,
		loading: isLoading,
		error: errorState,
		pagination: paginationState,

		// Actions (clear names)
		fetchStatusList,
		fetchActiveStatusList,
		fetchSpecialStatusList,
		createNewStatus,
		updateExistingStatus,
		deleteById,

		// Backwards-compatible aliases
		loadStatuses: fetchStatusList,
		loadActiveStatuses: fetchActiveStatusList,
		loadSpecialStatuses: fetchSpecialStatusList,
		createStatus: createNewStatus,
		updateStatus: updateExistingStatus,
		deleteStatus: deleteById,
		reassignSpecial,
		setPagination,
	}
}
