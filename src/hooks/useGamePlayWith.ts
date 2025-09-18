import { useCallback } from 'react'
import {
	fetchPlayWithOptions,
	fetchActivePlayWithOptions,
	createPlayWith as createPlayWithThunk,
	updatePlayWith as updatePlayWithThunk,
	deletePlayWith as deletePlayWithThunk,
} from '@/store/features/gamePlayWith/thunk'
import type { GamePlayWithCreateDto, GamePlayWithUpdateDto } from '@/models/api/GamePlayWith'
import type { QueryParameters } from '@/models/api/Game'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
	setLoading,
	setError,
	addPlayWith,
	removePlayWith,
} from '@/store/features/gamePlayWith/gamePlayWithSlice'
import { dispatchAndUnwrapAsync } from '@/utils'

/**
 * Custom hook for managing game play with state and operations
 */
export const useGamePlayWith = () => {
	const dispatch = useAppDispatch()

	// Selectors with clear local names
	const options = useAppSelector((state) => state.gamePlayWith.playWithOptions)
	const activeOptions = useAppSelector((state) => state.gamePlayWith.activePlayWithOptions)
	const isLoading = useAppSelector((state) => state.gamePlayWith.loading)
	const errorState = useAppSelector((state) => state.gamePlayWith.error)
	const paginationState = useAppSelector((state) => state.gamePlayWith.pagination)

	// Fetch list with optional query params
	const fetchOptions = useCallback(
		async (params?: QueryParameters) => {
			try {
				dispatch(setLoading(true))
				dispatch(setError(null))
				return await dispatchAndUnwrapAsync(dispatch, fetchPlayWithOptions(params ?? {}))
			} catch (err: any) {
				dispatch(setError(err || 'Failed to load play-with options'))
			} finally {
				dispatch(setLoading(false))
			}
		},
		[dispatch]
	)

	// Fetch only active options
	const fetchActiveOptions = useCallback(async () => {
		try {
			dispatch(setLoading(true))
			dispatch(setError(null))
			return await dispatchAndUnwrapAsync(dispatch, fetchActivePlayWithOptions())
		} catch (err: any) {
			dispatch(setError(err || 'Failed to load active play-with options'))
		} finally {
			dispatch(setLoading(false))
		}
	}, [dispatch])

	// Create a new option
	const createOption = useCallback(
		async (payload: GamePlayWithCreateDto) => {
			try {
				dispatch(setLoading(true))
				dispatch(setError(null))
				const created = (await dispatchAndUnwrapAsync(
					dispatch,
					createPlayWithThunk(payload)
				)) as any
				dispatch(addPlayWith(created))
				if ((created as any).isActive) await fetchActiveOptions()
				return created
			} catch (err: any) {
				dispatch(setError(err || 'Failed to create play-with option'))
				throw err
			} finally {
				dispatch(setLoading(false))
			}
		},
		[dispatch, fetchActiveOptions]
	)

	// Update existing option
	const updateOption = useCallback(
		async (id: number, payload: GamePlayWithUpdateDto) => {
			try {
				dispatch(setLoading(true))
				dispatch(setError(null))
				const updated = (await dispatchAndUnwrapAsync(
					dispatch,
					updatePlayWithThunk({ id, data: payload })
				)) as any
				await dispatchAndUnwrapAsync(dispatch, fetchPlayWithOptions({}))
				await fetchActiveOptions()
				return updated
			} catch (err: any) {
				dispatch(setError(err || 'Failed to update play-with option'))
				throw err
			} finally {
				dispatch(setLoading(false))
			}
		},
		[dispatch, fetchActiveOptions]
	)

	// Delete option by id
	const deleteOption = useCallback(
		async (id: number) => {
			try {
				dispatch(setLoading(true))
				dispatch(setError(null))
				await dispatchAndUnwrapAsync(dispatch, deletePlayWithThunk(id))
				dispatch(removePlayWith(id))
				return true
			} catch (err: any) {
				dispatch(setError(err || 'Failed to delete play-with option'))
				throw err
			} finally {
				dispatch(setLoading(false))
			}
		},
		[dispatch]
	)

	// Pagination setter placeholder
	const setPagination = useCallback((updater: any) => {
		if (typeof updater === 'function') {
			// Not implemented in slice; kept for compatibility
		}
	}, [])

	return {
		// State (clear names)
		options,
		activeOptions,
		loading: isLoading,
		error: errorState,
		pagination: paginationState,

		// Actions (clear names)
		fetchOptions,
		fetchActiveOptions,
		createOption,
		updateOption,
		deleteOption,

		// Backwards-compatible aliases
		playWiths: options,
		activePlayWiths: activeOptions,
		loadPlayWiths: fetchOptions,
		loadActivePlayWiths: fetchActiveOptions,
		createPlayWith: createOption,
		updatePlayWith: updateOption,
		deletePlayWith: deleteOption,
		setPagination,
	}
}
