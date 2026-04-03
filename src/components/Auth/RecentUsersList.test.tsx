import { vi, describe, it, expect, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { createTestStore } from '@/test/utils/createTestStore'
import { addRecentUser } from '@/store/features/recentUsers/recentUsersSlice'
import { RecentUsersList } from './RecentUsersList'

vi.mock('@/navigation/router', () => ({ router: { navigate: vi.fn() } }))

vi.mock('@/environments', () => ({
	environment: {
		baseUrl: 'https://localhost:7245/api',
		fallbackUrl: 'http://localhost:5011/api',
		apiRoutes: {
			games: {
				base: '/games',
				byId: (id: number) => `/games/${id}`,
				create: '/games',
				update: (id: number) => `/games/${id}`,
				delete: (id: number) => `/games/${id}`,
				bulkUpdate: '/games/bulk',
			},
			gameStatus: {
				base: '/gamestatus',
				special: '/gamestatus/special',
				active: '/gamestatus/active',
				reassignSpecial: '/gamestatus/reassign-special',
				byId: (id: number) => `/gamestatus/${id}`,
				create: '/gamestatus',
				update: (id: number) => `/gamestatus/${id}`,
				delete: (id: number) => `/gamestatus/${id}`,
				reorder: '/gamestatus/reorder',
			},
			gamePlatform: {
				base: '/gameplatforms',
				active: '/gameplatforms/active',
				byId: (id: number) => `/gameplatforms/${id}`,
				create: '/gameplatforms',
				update: (id: number) => `/gameplatforms/${id}`,
				delete: (id: number) => `/gameplatforms/${id}`,
				reorder: '/gameplatforms/reorder',
			},
			gamePlayWith: {
				base: '/gameplaywith',
				active: '/gameplaywith/active',
				byId: (id: number) => `/gameplaywith/${id}`,
				create: '/gameplaywith',
				update: (id: number) => `/gameplaywith/${id}`,
				delete: (id: number) => `/gameplaywith/${id}`,
				reorder: '/gameplaywith/reorder',
			},
			gamePlayedStatus: {
				base: '/gameplayedstatus',
				active: '/gameplayedstatus/active',
				byId: (id: number) => `/gameplayedstatus/${id}`,
				create: '/gameplayedstatus',
				update: (id: number) => `/gameplayedstatus/${id}`,
				delete: (id: number) => `/gameplayedstatus/${id}`,
				reorder: '/gameplayedstatus/reorder',
			},
			gameViews: {
				base: '/gameviews',
				public: '/gameviews/public',
				byId: (id: number) => `/gameviews/${id}`,
				create: '/gameviews',
				update: (id: number) => `/gameviews/${id}`,
				delete: (id: number) => `/gameviews/${id}`,
				configuration: (id: number) => `/gameviews/${id}/configuration`,
			},
			users: { base: '/users', byId: (id: number) => `/users/${id}` },
			auth: { login: '/auth/login', logout: '/auth/logout' },
		},
		pagination: { defaultPageSize: 50 },
	},
}))

describe('RecentUsersList', () => {
	let store: ReturnType<typeof createTestStore>

	beforeEach(() => {
		store = createTestStore()
	})

	it('renders nothing when the recent users list is empty', () => {
		const { container } = renderWithProviders(<RecentUsersList onUserSelect={vi.fn()} />, { store })
		expect(container.firstChild).toBeNull()
	})

	it('renders user names when recent users exist', () => {
		store.dispatch(addRecentUser({ username: 'alice', hasPassword: true }))
		store.dispatch(addRecentUser({ username: 'bob', hasPassword: false }))
		renderWithProviders(<RecentUsersList onUserSelect={vi.fn()} />, { store })
		expect(screen.getByText('alice')).toBeInTheDocument()
		expect(screen.getByText('bob')).toBeInTheDocument()
	})

	it('calls onUserSelect with username and hasPassword when a user card is clicked', () => {
		const onUserSelect = vi.fn()
		store.dispatch(addRecentUser({ username: 'alice', hasPassword: true }))
		renderWithProviders(<RecentUsersList onUserSelect={onUserSelect} />, { store })
		fireEvent.click(screen.getByText('alice').closest('.recent-user-card')!)
		expect(onUserSelect).toHaveBeenCalledWith('alice', true)
	})

	it('dispatches removeRecentUser when the remove button is clicked', () => {
		store.dispatch(addRecentUser({ username: 'alice', hasPassword: false }))
		renderWithProviders(<RecentUsersList onUserSelect={vi.fn()} />, { store })
		fireEvent.click(screen.getByRole('button', { name: /remove alice/i }))
		expect(store.getState().recentUsers.users.find((u) => u.username === 'alice')).toBeUndefined()
	})

	it('remove button click does NOT trigger onUserSelect', () => {
		const onUserSelect = vi.fn()
		store.dispatch(addRecentUser({ username: 'alice', hasPassword: false }))
		renderWithProviders(<RecentUsersList onUserSelect={onUserSelect} />, { store })
		fireEvent.click(screen.getByRole('button', { name: /remove alice/i }))
		expect(onUserSelect).not.toHaveBeenCalled()
	})
})
