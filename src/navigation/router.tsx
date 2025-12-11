import { createHashRouter } from 'react-router-dom'
import { AppLayout, EmptyLayout } from '@/layouts'
import Home from '@/components/Home/containers/Home'
import { Login, ProtectedRoute, PublicRoute } from '@/components/Auth'
import {
	AdminLayout,
	AdminPlatforms,
	AdminStatus,
	AdminPlayWith,
	AdminPlayedStatus,
	AdminDataExport,
	AdminGameViews,
	AdminUsers,
	AdminPreferences,
} from '@/components/Admin'
import { RouteError, NotFound } from '@/components/errors'

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
		path: '/admin',
		element: (
			<ProtectedRoute>
				<AdminLayout />
			</ProtectedRoute>
		),
		errorElement: <RouteError />,
		children: [
			{
				path: 'platforms',
				element: <AdminPlatforms />,
			},
			{
				path: 'status',
				element: <AdminStatus />,
			},
			{
				path: 'play-with',
				element: <AdminPlayWith />,
			},
			{
				path: 'played-status',
				element: <AdminPlayedStatus />,
			},
			{
				path: 'data-export',
				element: <AdminDataExport />,
			},
			{
				path: 'game-views',
				element: <AdminGameViews />,
			},
			{
				path: 'users',
				element: (
					<ProtectedRoute adminOnly={true}>
						<AdminUsers />
					</ProtectedRoute>
				),
			},
			{
				path: 'preferences',
				element: <AdminPreferences />,
			},
		],
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
