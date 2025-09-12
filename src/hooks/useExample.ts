import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks/hooks'
import {
	exampleAsyncThunk,
	selectExampleData,
	selectExampleError,
	selectExampleLoading,
} from '@/store/features/exampleFeature'

/**
 * Example custom hook for managing data
 */
export const useExample = () => {
	const dispatch = useAppDispatch()

	// Selectors
	const data = useAppSelector(selectExampleData)
	const loading = useAppSelector(selectExampleLoading)
	const error = useAppSelector(selectExampleError)

	// Actions
	const fetchDataAction = useCallback(
		(params?: Record<string, any>) => {
			return dispatch(exampleAsyncThunk(params || {}))
		},
		[dispatch]
	)

	return {
		// State
		data,
		loading,
		error,

		// Actions
		fetchData: fetchDataAction,

		// Utilities
		// add more actions or utilities as needed
	}
}
