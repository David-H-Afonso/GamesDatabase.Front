import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
	selectGameViews,
	selectPublicGameViews,
	selectCurrentGameView,
	selectGameViewsLoading,
	selectGameViewsError,
	selectGameViewsFilters,
	selectGameViewById,
	fetchGameViews,
	fetchPublicGameViews,
	fetchGameViewById,
	createGameViewThunk,
	updateGameViewThunk,
	updateGameViewConfiguration,
	deleteGameViewThunk,
	setCurrentGameView,
	setFilters,
	resetFilters,
} from '@/store/features/gameViews'
import type {
	GameViewCreateDto,
	GameViewUpdateDto,
	GameViewQueryParameters,
} from '@/models/api/GameView'
import { dispatchAndUnwrapAsync } from '@/utils'

/**
 * Custom hook for managing GameViews state and operations
 */
export const useGameViews = () => {
	const dispatch = useAppDispatch()

	// State selectors
	const gameViews = useAppSelector(selectGameViews)
	const publicGameViews = useAppSelector(selectPublicGameViews)
	const currentGameView = useAppSelector(selectCurrentGameView)
	const loading = useAppSelector(selectGameViewsLoading)
	const error = useAppSelector(selectGameViewsError)
	const filters = useAppSelector(selectGameViewsFilters)

	// Load all GameViews with optional parameters
	const loadGameViews = useCallback(
		async (params?: GameViewQueryParameters) => {
			return dispatchAndUnwrapAsync(dispatch, fetchGameViews(params || {}))
		},
		[dispatch]
	)

	// Load public GameViews for view selector
	const loadPublicGameViews = useCallback(async () => {
		return dispatchAndUnwrapAsync(dispatch, fetchPublicGameViews())
	}, [dispatch])

	// Load specific GameView by id
	const loadGameViewById = useCallback(
		async (id: number) => {
			return dispatchAndUnwrapAsync(dispatch, fetchGameViewById(id))
		},
		[dispatch]
	)

	// Create new GameView
	const createGameView = useCallback(
		async (gameViewData: GameViewCreateDto) => {
			return dispatchAndUnwrapAsync(dispatch, createGameViewThunk(gameViewData))
		},
		[dispatch]
	)

	// Update existing GameView
	const updateGameView = useCallback(
		async (id: number, gameViewData: GameViewUpdateDto) => {
			return dispatchAndUnwrapAsync(dispatch, updateGameViewThunk({ id, gameViewData }))
		},
		[dispatch]
	)

	// Delete GameView
	const deleteGameView = useCallback(
		async (id: number) => {
			return dispatchAndUnwrapAsync(dispatch, deleteGameViewThunk(id))
		},
		[dispatch]
	)

	// Update only configuration
	const updateGameViewConfig = useCallback(
		async (id: number, configuration: any) => {
			return dispatchAndUnwrapAsync(dispatch, updateGameViewConfiguration({ id, configuration }))
		},
		[dispatch]
	)

	// Set current GameView
	const selectGameView = useCallback(
		(gameView: typeof currentGameView) => {
			dispatch(setCurrentGameView(gameView))
		},
		[dispatch]
	)

	// Set filters
	const setGameViewFilters = useCallback(
		(filters: GameViewQueryParameters) => {
			dispatch(setFilters(filters))
		},
		[dispatch]
	)

	// Reset filters
	const resetGameViewFilters = useCallback(() => {
		dispatch(resetFilters())
	}, [dispatch])

	// Helper to get GameView by id
	const getGameViewById = useCallback(
		(id: number) => {
			return selectGameViewById(id)({ gameViews: { gameViews, publicGameViews } } as any)
		},
		[gameViews, publicGameViews]
	)

	return {
		// State
		gameViews,
		publicGameViews,
		currentGameView,
		loading,
		error,
		filters,

		// Actions
		loadGameViews,
		loadPublicGameViews,
		loadGameViewById,
		createGameView,
		updateGameView,
		updateGameViewConfig,
		deleteGameView,
		selectGameView,
		setGameViewFilters,
		resetGameViewFilters,
		getGameViewById,
	}
}
