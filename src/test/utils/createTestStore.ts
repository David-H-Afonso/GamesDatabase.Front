import { configureStore, combineReducers } from '@reduxjs/toolkit'
import gamesReducer from '@/store/features/games/gamesSlice'
import gameStatusReducer from '@/store/features/gameStatus/gameStatusSlice'
import gamePlatformReducer from '@/store/features/gamePlatform/gamePlatformSlice'
import gamePlayWithReducer from '@/store/features/gamePlayWith/gamePlayWithSlice'
import gamePlayedStatusReducer from '@/store/features/gamePlayedStatus/gamePlayedStatusSlice'
import gameViewsReducer from '@/store/features/gameViews/gameViewSlice'
import themeReducer from '@/store/features/theme/themeSlice'
import authReducer from '@/store/features/auth/authSlice'
import recentUsersReducer from '@/store/features/recentUsers/recentUsersSlice'
import type { RootState } from '@/store'

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
})

/**
 * Create a fresh Redux store for testing.
 * Does NOT use redux-persist (avoids async rehydration in tests).
 *
 * @param preloadedState - Partial state to seed the store with
 */
export function createTestStore(preloadedState?: Partial<RootState>) {
	const store = configureStore({
		reducer: rootReducer,
		preloadedState: preloadedState as any,
		middleware: (getDefaultMiddleware) =>
			getDefaultMiddleware({
				serializableCheck: false,
			}),
	})
	// Cast getState() to RootState so selectors typed against the persisted store compile without _persist errors
	return store as unknown as Omit<typeof store, 'getState'> & { getState: () => RootState }
}

export type TestStore = ReturnType<typeof createTestStore>
