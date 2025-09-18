import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/layouts'
import Home from '@/components/Home/containers/Home'
import {
	AdminLayout,
	AdminPlatforms,
	AdminStatus,
	AdminPlayWith,
	AdminPlayedStatus,
	AdminDataExport,
} from '@/components/Admin'

// TODO: DO THIS BETTER AND WITH CUSTOM ROUTES IN SEPARATE FILES

export const router = createBrowserRouter([
	{
		path: '/',
		element: (
			<AppLayout>
				<Home />
			</AppLayout>
		),
		errorElement: (
			<AppLayout>
				<Home />
			</AppLayout>
		),
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
		element: <AdminLayout />,
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
		],
	},
	{
		path: '*',
		element: <div>Page not found</div>,
		errorElement: <Home />,
	},
])
