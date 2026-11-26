import { configureStore } from '@reduxjs/toolkit'
import { rootReducer } from '@/store/rootReducer'
import type { RootState } from '@/store'

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
