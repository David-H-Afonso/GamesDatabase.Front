import { vi, describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { PublicRoute } from './PublicRoute'

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

const authenticatedState = {
	auth: { isAuthenticated: true, user: { id: 1, username: 'user', role: 'Standard' as const }, token: 'tok', loading: false, error: null },
}

const unauthenticatedState = {
	auth: { isAuthenticated: false, user: null, token: null, loading: false, error: null },
}

describe('PublicRoute', () => {
	it('renders children when user is NOT authenticated', () => {
		renderWithProviders(
			<PublicRoute>
				<div>Login form</div>
			</PublicRoute>,
			{ preloadedState: unauthenticatedState as any }
		)
		expect(screen.getByText('Login form')).toBeInTheDocument()
	})

	it('redirects to / when user IS authenticated', () => {
		renderWithProviders(
			<Routes>
				<Route path='/' element={<div>Home</div>} />
				<Route
					path='/login'
					element={
						<PublicRoute>
							<div>Login form</div>
						</PublicRoute>
					}
				/>
			</Routes>,
			{ preloadedState: authenticatedState as any, route: '/login' }
		)
		expect(screen.getByText('Home')).toBeInTheDocument()
		expect(screen.queryByText('Login form')).not.toBeInTheDocument()
	})

	it('does not redirect when unauthenticated, even at the login path', () => {
		renderWithProviders(
			<Routes>
				<Route path='/' element={<div>Home</div>} />
				<Route
					path='/login'
					element={
						<PublicRoute>
							<div>Login form</div>
						</PublicRoute>
					}
				/>
			</Routes>,
			{ preloadedState: unauthenticatedState as any, route: '/login' }
		)
		expect(screen.getByText('Login form')).toBeInTheDocument()
	})
})
