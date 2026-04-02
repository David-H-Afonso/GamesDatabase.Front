import React, { type PropsWithChildren, type ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { createTestStore, type TestStore } from './createTestStore'
import type { RootState } from '@/store'

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
	preloadedState?: Partial<RootState>
	store?: TestStore
	route?: string
}

/**
 * Custom render that wraps components with all required providers:
 * - Redux Provider (with optional preloaded state)
 * - MemoryRouter (with optional initial route)
 *
 * Returns everything from RTL's render plus the store instance.
 */
export function renderWithProviders(ui: ReactElement, { preloadedState, store = createTestStore(preloadedState), route = '/', ...renderOptions }: ExtendedRenderOptions = {}) {
	function Wrapper({ children }: PropsWithChildren) {
		return (
			<Provider store={store}>
				<MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
			</Provider>
		)
	}

	return {
		store,
		...render(ui, { wrapper: Wrapper, ...renderOptions }),
	}
}
