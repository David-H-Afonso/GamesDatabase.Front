import { lazy, Suspense } from 'react'
import { createHashRouter } from 'react-router-dom'
import { AppLayout, EmptyLayout } from '@/layouts'
import Home from '@/components/Home/containers/Home'
import { Login, ProtectedRoute, PublicRoute } from '@/components/Auth'
import { RouteError, NotFound } from '@/components/errors'
import AdminFallback from './AdminFallback'

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
			<AppLayout>
				<Home />
			</AppLayout>
		),
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
		path: '*',
		element: (
			<EmptyLayout>
				<NotFound />
			</EmptyLayout>
		),
	},
])
