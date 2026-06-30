import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { persistStore, persistReducer, createTransform } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import gamesReducer from './features/games/gamesSlice'
import gameStatusReducer from './features/gameStatus/gameStatusSlice'
import gamePlatformReducer from './features/gamePlatform/gamePlatformSlice'
import gamePlayWithReducer from './features/gamePlayWith/gamePlayWithSlice'
import gamePlayedStatusReducer from './features/gamePlayedStatus/gamePlayedStatusSlice'
import gameReplayTypeReducer from './features/gameReplayType/gameReplayTypeSlice'
import gameViewsReducer from './features/gameViews/gameViewSlice'
import themeReducer from './features/theme/themeSlice'
import authReducer from './features/auth/authSlice'
import recentUsersReducer from './features/recentUsers/recentUsersSlice'
import steamReducer from './features/steam/steamSlice'

/**
 * CENTRALIZED PERSISTENCE CONFIGURATION
 *
 * This store template uses centralized persistence managed at the root level.
 * It is minimal and can be expanded as needed for any project.
 */

// Strip the games array and all transient runtime state from the games slice
// when saving/loading. Only user preferences (filters, pageSize) survive a reload.
// This prevents a flash of stale/wrong-filter game data on page load:
// without this, rehydrated games from a previous session would briefly render
// before the new fetch (with the current persisted filters) completes.
const gamesTransform = createTransform(
	// inbound: what gets written to storage
	(state: any) => ({
		...state,
		games: [],
		loading: false,
		error: null,
		isDataFresh: false,
		lastAppliedFilters: null,
		needsRefresh: false,
		pagination: {
			page: 1,
			pageSize: state.pagination?.pageSize ?? 20,
			totalCount: 0,
			totalPages: 0,
			hasNextPage: false,
			hasPreviousPage: false,
		},
	}),
	// outbound: what gets read back from storage (same shape)
	// loading:true so the first render after rehydration shows skeletons
	// instead of the "no games" message while the initial fetch is in-flight.
	(state: any) => ({
		...state,
		games: [],
		loading: true,
		error: null,
		isDataFresh: false,
		lastAppliedFilters: null,
		needsRefresh: false,
		pagination: {
			page: 1,
			pageSize: state.pagination?.pageSize ?? 20,
			totalCount: 0,
			totalPages: 0,
			hasNextPage: false,
			hasPreviousPage: false,
		},
	}),
	{ whitelist: ['games'] }
)

// Middleware that immediately flushes persisted state after every filter
// change so pressing F5 right after a filter update never loses the state.
// (_persistorFlush is assigned after persistor is created below.)
let _persistorFlush: (() => void) | null = null
const filterFlushMiddleware = (_storeApi: any) => (next: any) => (action: any) => {
	const result = next(action)
	if (action.type === 'games/setFilters' || action.type === 'games/resetFilters') {
		_persistorFlush?.()
	}
	return result
}

// Root persist config - Centralized persistence for the entire store
const persistConfig = {
	key: 'root',
	storage,
	whitelist: [
		'games',
		'gameStatus',
		'gamePlatform',
		'gamePlayWith',
		'gamePlayedStatus',
		'gameReplayType',
		'gameViews',
		'theme',
		'auth', // Persist authentication state
		'recentUsers', // Persist recent users for quick login
	],
	transforms: [gamesTransform],
}

// Combine reducers - Add your reducers here
const rootReducer = combineReducers({
	games: gamesReducer,
	gameStatus: gameStatusReducer,
	gamePlatform: gamePlatformReducer,
	gamePlayWith: gamePlayWithReducer,
	gamePlayedStatus: gamePlayedStatusReducer,
	gameReplayType: gameReplayTypeReducer,
	gameViews: gameViewsReducer,
	theme: themeReducer,
	auth: authReducer,
	recentUsers: recentUsersReducer,
	steam: steamReducer,
})

// Create persisted reducer - Single point of persistence configuration
// rootReducer has a 3-generic Reducer<S, A, PreloadedState> type from combineReducers
// but persistReducer only accepts Reducer<S, A> — cast needed to satisfy the overload.
const persistedReducer = persistReducer(persistConfig, rootReducer as any)

export const store = configureStore({
	// redux-persist's state type (S & PersistPartial) is incompatible with the
	// Reducer overload expected by configureStore in this version of RTK.
	// Casting to `any` is the standard workaround — RootState below is still
	// fully typed by deriving from rootReducer rather than store.getState().
	reducer: persistedReducer as any,
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: {
				ignoredActions: ['persist/FLUSH', 'persist/REHYDRATE', 'persist/PAUSE', 'persist/PERSIST', 'persist/PURGE', 'persist/REGISTER'],
			},
		}).concat(filterFlushMiddleware),
	devTools: import.meta.env.DEV,
})

export const persistor = persistStore(store)
_persistorFlush = () => void persistor.flush()

// Derived from rootReducer (not store.getState) so the type is exactly
// { games: GamesState; ... } without the _persist noise from redux-persist.
export type RootState = ReturnType<typeof rootReducer>
export type AppDispatch = typeof store.dispatch
export type AppStore = typeof store
