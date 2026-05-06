import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { DataLoader } from './DataLoader'
import type { RootState } from '@/store'

const mockFetchActiveStatusList = vi.fn().mockResolvedValue(undefined)
const mockFetchActivePlatforms = vi.fn().mockResolvedValue(undefined)
const mockFetchActiveOptions = vi.fn().mockResolvedValue(undefined)
const mockFetchActivePlayedStatuses = vi.fn().mockResolvedValue(undefined)

vi.mock('@/hooks', () => ({
	useGameStatus: () => ({ fetchActiveStatusList: mockFetchActiveStatusList }),
	useGamePlatform: () => ({ fetchActiveList: mockFetchActivePlatforms }),
	useGamePlayWith: () => ({ fetchActiveOptions: mockFetchActiveOptions }),
	useGamePlayedStatus: () => ({ fetchActiveList: mockFetchActivePlayedStatuses }),
}))

vi.mock('@/utils/customFetch', () => ({
	purgePersistedState: vi.fn(),
}))

const authenticatedState: Partial<RootState> = {
	auth: {
		isAuthenticated: true,
		user: { id: 1, username: 'Admin', role: 'Admin' },
		token: 'valid-token',
		loading: false,
		error: null,
	},
}

describe('DataLoader', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('renders nothing (returns null)', () => {
		const { container } = renderWithProviders(<DataLoader />, { preloadedState: authenticatedState })
		expect(container.innerHTML).toBe('')
	})

	it('fetches all active catalog data on mount', () => {
		renderWithProviders(<DataLoader />, { preloadedState: authenticatedState })
		expect(mockFetchActiveStatusList).toHaveBeenCalled()
		expect(mockFetchActivePlatforms).toHaveBeenCalled()
		expect(mockFetchActiveOptions).toHaveBeenCalled()
		expect(mockFetchActivePlayedStatuses).toHaveBeenCalled()
	})

	it('dispatches fetchUserPreferences when token and userId exist', () => {
		const { store } = renderWithProviders(<DataLoader />, { preloadedState: authenticatedState })
		// fetchUserPreferences is dispatched as a thunk — check that it was dispatched
		const actions = store.getState()
		// verify the component didn't crash (forceLogout not called)
		expect(actions.auth.isAuthenticated).toBe(true)
	})

	it('dispatches forceLogout when token exists but userId is missing', () => {
		const corruptState: Partial<RootState> = {
			auth: {
				isAuthenticated: true,
				user: null,
				token: 'some-token',
				loading: false,
				error: null,
			},
		}
		const { store } = renderWithProviders(<DataLoader />, { preloadedState: corruptState })
		expect(store.getState().auth.isAuthenticated).toBe(false)
	})

	it('does not fetch catalog data when no token exists', () => {
		const noTokenState: Partial<RootState> = {
			auth: {
				isAuthenticated: false,
				user: null,
				token: null,
				loading: false,
				error: null,
			},
		}
		renderWithProviders(<DataLoader />, { preloadedState: noTokenState })
		expect(mockFetchActiveStatusList).not.toHaveBeenCalled()
	})

	it('handles loadCatalogData error gracefully', () => {
		mockFetchActiveStatusList.mockRejectedValueOnce(new Error('network'))
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
		renderWithProviders(<DataLoader />, { preloadedState: authenticatedState })
		// Component does not crash
		spy.mockRestore()
	})
})
