import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { persistStore, persistReducer, createTransform } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import gamesReducer from './features/games/gamesSlice'
import gameStatusReducer from './features/gameStatus/gameStatusSlice'
import gamePlatformReducer from './features/gamePlatform/gamePlatformSlice'
import gamePlayWithReducer from './features/gamePlayWith/gamePlayWithSlice'
import gamePlayedStatusReducer from './features/gamePlayedStatus/gamePlayedStatusSlice'
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
	{ whitelist: ['games'] }
)

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
	gameViews: gameViewsReducer,
	theme: themeReducer,
	auth: authReducer,
	recentUsers: recentUsersReducer,
	steam: steamReducer,
})

// Create persisted reducer - Single point of persistence configuration
const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
	// Cast required: persistedReducer state includes PersistPartial (_persist) which
	// is incompatible with RTK's replaceReducer typing. This is a known redux-persist
	// + RTK TypeScript issue — the cast is safe because user code never accesses _persist.
	reducer: persistedReducer as unknown as typeof rootReducer,
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: {
				ignoredActions: ['persist/FLUSH', 'persist/REHYDRATE', 'persist/PAUSE', 'persist/PERSIST', 'persist/PURGE', 'persist/REGISTER'],
			},
		}),
	devTools: import.meta.env.DEV,
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export type AppStore = typeof store
