import { type ReactNode } from 'react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import type { TestStore } from './createTestStore'

/**
 * Returns a wrapper component for use with renderHook.
 * Provides Redux store and MemoryRouter context.
 */
export function createWrapperWithStore(store: TestStore) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<Provider store={store}>
				<MemoryRouter>{children}</MemoryRouter>
			</Provider>
		)
	}
}
