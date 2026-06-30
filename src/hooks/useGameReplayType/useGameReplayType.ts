import { useCallback } from 'react'
import {
	fetchReplayTypes,
	fetchActiveReplayTypes,
	fetchSpecialReplayType,
	createReplayType as createReplayTypeThunk,
	updateReplayType as updateReplayTypeThunk,
	deleteReplayType as deleteReplayTypeThunk,
} from '@/store/features/gameReplayType/thunk'
import type { GameReplayTypeCreateDto, GameReplayTypeUpdateDto } from '@/models/api/GameReplayType'
import type { QueryParameters } from '@/models/api/Game'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
	selectReplayTypes,
	selectActiveReplayTypes,
	selectSpecialReplayType,
	selectReplayTypesLoading,
	selectReplayTypesError,
	selectReplayTypesPagination,
} from '@/store/features/gameReplayType/selector'
import { dispatchAndUnwrapAsync } from '@/utils'

/**
 * Custom hook for managing game replay type state and operations
 */
export const useGameReplayType = () => {
	const dispatch = useAppDispatch()

	const replayTypes = useAppSelector(selectReplayTypes)
	const activeReplayTypes = useAppSelector(selectActiveReplayTypes)
	const specialReplayType = useAppSelector(selectSpecialReplayType)
	const loading = useAppSelector(selectReplayTypesLoading)
	const error = useAppSelector(selectReplayTypesError)
	const pagination = useAppSelector(selectReplayTypesPagination)

	const fetchList = useCallback(
		async (params?: QueryParameters) => {
			const result = await dispatchAndUnwrapAsync(dispatch, fetchReplayTypes(params || {}))
			void dispatch(fetchSpecialReplayType())
			return result
		},
		[dispatch]
	)

	const fetchActiveList = useCallback(async () => {
		return dispatchAndUnwrapAsync(dispatch, fetchActiveReplayTypes())
	}, [dispatch])

	const createItem = useCallback(
		async (payload: GameReplayTypeCreateDto) => {
			return dispatchAndUnwrapAsync(dispatch, createReplayTypeThunk(payload))
		},
		[dispatch]
	)

	const updateItem = useCallback(
		async (id: number, payload: GameReplayTypeUpdateDto) => {
			return dispatchAndUnwrapAsync(dispatch, updateReplayTypeThunk({ id, data: payload }))
		},
		[dispatch]
	)

	const deleteItem = useCallback(
		async (id: number) => {
			await dispatchAndUnwrapAsync(dispatch, deleteReplayTypeThunk(id))
			return true
		},
		[dispatch]
	)

	return {
		replayTypes,
		activeReplayTypes,
		specialReplayType,
		loading,
		error,
		pagination,

		loadReplayTypes: fetchList,
		loadActiveReplayTypes: fetchActiveList,
		createReplayType: createItem,
		updateReplayType: updateItem,
		deleteReplayType: deleteItem,
	}
}
