import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
	selectGames,
	selectCurrentGame,
	selectGamesLoading,
	selectGamesError,
	selectGamesPagination,
	selectGamesFilters,
	selectLastAppliedFilters,
	selectIsDataFresh,
	selectGameById,
	fetchGames,
	fetchGameById,
	createGame,
	updateGame,
	deleteGame,
	fetchReleasedAndStarted,
	fetchStartedOrStatus,
	fetchNoStartedByScore,
} from '@/store/features/games'
import { areFiltersEqual } from '@/utils'
import type { GameCreateDto, GameUpdateDto, GameQueryParameters } from '@/models/api/Game'
import { dispatchAndUnwrapAsync } from '@/utils'

/**
 * Custom hook for managing games state and operations
 */
export const useGames = () => {
	const dispatch = useAppDispatch()

	// State selectors (clear local names)
	const gamesList = useAppSelector(selectGames)
	const selectedGame = useAppSelector(selectCurrentGame)
	const isLoading = useAppSelector(selectGamesLoading)
	const loadError = useAppSelector(selectGamesError)
	const pager = useAppSelector(selectGamesPagination)
	const appliedFilters = useAppSelector(selectGamesFilters)
	const previousFilters = useAppSelector(selectLastAppliedFilters)
	const dataIsFresh = useAppSelector(selectIsDataFresh)

	// Fetch list of games with basic cache check
	const fetchGamesList = useCallback(
		async (params: GameQueryParameters = {}) => {
			// If data is fresh for the same filters, avoid network call
			if (!loadError && dataIsFresh && areFiltersEqual(params, previousFilters)) {
				return Promise.resolve()
			}
			return dispatchAndUnwrapAsync(dispatch, fetchGames(params))
		},
		[dispatch, dataIsFresh, previousFilters, loadError]
	)

	// Force a fresh fetch ignoring cache
	const refreshGames = useCallback(
		async (params: GameQueryParameters = {}) =>
			dispatchAndUnwrapAsync(dispatch, fetchGames(params)),
		[dispatch]
	)

	// Fetch details for a single game
	const fetchGameDetails = useCallback(
		async (id: number) => {
			return dispatchAndUnwrapAsync(dispatch, fetchGameById(id))
		},
		[dispatch]
	)

	// Create / update / delete operations return the created/updated resource
	const createNewGame = useCallback(
		async (gameData: GameCreateDto) => dispatchAndUnwrapAsync(dispatch, createGame(gameData)),
		[dispatch]
	)

	const updateGameById = useCallback(
		async (id: number, gameData: GameUpdateDto) =>
			dispatchAndUnwrapAsync(dispatch, updateGame({ id, gameData })),
		[dispatch]
	)

	const deleteGameById = useCallback(
		async (id: number) => {
			dispatchAndUnwrapAsync(dispatch, deleteGame(id))
		},
		[dispatch]
	)

	const fetchReleasedAndStartedList = useCallback(
		async (params: GameQueryParameters & { year: number }) =>
			dispatchAndUnwrapAsync(dispatch, fetchReleasedAndStarted(params)),
		[dispatch]
	)

	const fetchStartedOrStatusList = useCallback(
		async (params: GameQueryParameters & { year: number; status?: string }) =>
			dispatchAndUnwrapAsync(dispatch, fetchStartedOrStatus(params)),
		[dispatch]
	)

	const fetchNoStartedByScoreList = useCallback(
		async (params: GameQueryParameters = {}) =>
			dispatchAndUnwrapAsync(dispatch, fetchNoStartedByScore(params)),
		[dispatch]
	)

	return {
		// State
		games: gamesList,
		currentGame: selectedGame,
		loading: isLoading,
		error: loadError,
		pagination: pager,
		filters: appliedFilters,
		isDataFresh: dataIsFresh,
		lastAppliedFilters: previousFilters,

		// Actions
		fetchGamesList,
		refreshGames,
		fetchGameDetails,
		createNewGame,
		updateGameById,
		deleteGameById,
		fetchReleasedAndStartedList,
		fetchStartedOrStatusList,
		fetchNoStartedByScoreList,

		// Helper to create selector for specific game
		selectGameById: (id: number) => selectGameById(id),
	}
}
