import { configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import { combineReducers } from '@reduxjs/toolkit'
import storage from 'redux-persist/lib/storage'
import gamesReducer from './features/games/gamesSlice'
import gameStatusReducer from './features/gameStatus/gameStatusSlice'
import gamePlatformReducer from './features/gamePlatform/gamePlatformSlice'
import gamePlayWithReducer from './features/gamePlayWith/gamePlayWithSlice'
import gamePlayedStatusReducer from './features/gamePlayedStatus/gamePlayedStatusSlice'
import themeReducer from './features/theme/themeSlice'

/**
 * CENTRALIZED PERSISTENCE CONFIGURATION
 *
 * This store template uses centralized persistence managed at the root level.
 * It is minimal and can be expanded as needed for any project.
 */

// Root persist config - Centralized persistence for the entire store
const persistConfig = {
	key: 'root',
	storage,
	whitelist: ['games', 'gameStatus', 'gamePlatform', 'gamePlayWith', 'gamePlayedStatus', 'theme'], // Add reducers here to persist
}

// Combine reducers - Add your reducers here
const rootReducer = combineReducers({
	games: gamesReducer,
	gameStatus: gameStatusReducer,
	gamePlatform: gamePlatformReducer,
	gamePlayWith: gamePlayWithReducer,
	gamePlayedStatus: gamePlayedStatusReducer,
	theme: themeReducer,
})

// Create persisted reducer - Single point of persistence configuration
const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
	reducer: persistedReducer,
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: {
				ignoredActions: [
					'persist/FLUSH',
					'persist/REHYDRATE',
					'persist/PAUSE',
					'persist/PERSIST',
					'persist/PURGE',
					'persist/REGISTER',
				],
			},
		}),
	devTools: process.env.NODE_ENV !== 'production',
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export type AppStore = typeof store
