import { lazy, Suspense } from 'react'
import { createHashRouter } from 'react-router-dom'
import { AppLayout, EmptyLayout } from '@/layouts'
import Home from '@/components/Home/containers/Home'
import { Login, ProtectedRoute, PublicRoute, SteamCallback } from '@/components/Auth'
import { RouteError, NotFound } from '@/components/errors'
import AdminFallback from './AdminFallback'
import GameDeepLink from '@/components/Games/GameDeepLink'
import HouseholdConsent from '@/components/Integrations/HouseholdConsent'

const Admin = lazy(() => import('@/components/Admin/containers/Admin'))

export const router = createHashRouter([
	{
		path: '/login',
		element: (
			<PublicRoute>
				<EmptyLayout>
					<Login />
				</EmptyLayout>
			</PublicRoute>
		),
		errorElement: <RouteError />,
	},
	{
		path: '/',
		element: (
			<ProtectedRoute>
				<AppLayout>
					<Home />
				</AppLayout>
			</ProtectedRoute>
		),
		errorElement: <RouteError />,
	},
	{
		path: '/settings',
		element: (
			<ProtectedRoute>
				<AppLayout>
					<Home />
				</AppLayout>
			</ProtectedRoute>
		),
	},
	{
		path: '/games/:id',
		element: (
			<ProtectedRoute>
				<AppLayout>
					<GameDeepLink />
				</AppLayout>
			</ProtectedRoute>
		),
		errorElement: <RouteError />,
	},
	{
		path: '/integrations/household/authorize',
		element: (
			<ProtectedRoute>
				<EmptyLayout>
					<HouseholdConsent />
				</EmptyLayout>
			</ProtectedRoute>
		),
		errorElement: <RouteError />,
	},
	{
		path: '/admin/*',
		element: (
			<ProtectedRoute>
				<Suspense fallback={<AdminFallback />}>
					<Admin />
				</Suspense>
			</ProtectedRoute>
		),
		errorElement: <RouteError />,
	},
	{
		path: '/steam-callback',
		element: (
			<EmptyLayout>
				<SteamCallback />
			</EmptyLayout>
		),
	},
	{
		path: '*',
		element: (
			<EmptyLayout>
				<NotFound />
			</EmptyLayout>
		),
	},
])
