import { lazy, Suspense } from 'react'
import { createHashRouter } from 'react-router-dom'
import { AppLayout, EmptyLayout } from '@/layouts'
import Home from '@/components/Home/containers/Home'
import { Login, ProtectedRoute, PublicRoute, SteamCallback } from '@/components/Auth'
import { RouteError, NotFound } from '@/components/errors'
import AdminFallback from './AdminFallback'
import GameDeepLink from '@/components/Games/GameDeepLink'
import HouseholdConsent from '@/components/Integrations/HouseholdConsent'
import CollectionHome from '@/components/Collection/CollectionHome'
import HomeRowLibrary from '@/components/Collection/HomeRowLibrary'
import CollectionFallback from './CollectionFallback'

const Admin = lazy(() => import('@/components/Admin/containers/Admin'))
const Playlists = lazy(() => import('@/components/Playlists/Playlists'))
const FocusMode = lazy(() => import('@/components/Focus/FocusMode'))
const CollectionStatistics = lazy(() => import('@/components/Collection/CollectionStatistics'))
const CollectionShelves = lazy(() => import('@/components/Collection/CollectionShelves'))

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
					<CollectionHome />
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
		path: '/focus',
		element: (
			<ProtectedRoute>
				<AppLayout>
					<Suspense fallback={<CollectionFallback />}><FocusMode /></Suspense>
				</AppLayout>
			</ProtectedRoute>
		),
		errorElement: <RouteError />,
	},
	{
		path: '/games/:id',
		element: (
			<ProtectedRoute>
				<AppLayout>
					<Home />
					<GameDeepLink />
				</AppLayout>
			</ProtectedRoute>
		),
		errorElement: <RouteError />,
	},
	{
		path: '/library',
		element: <ProtectedRoute><AppLayout><Home /></AppLayout></ProtectedRoute>,
		errorElement: <RouteError />,
	},
	{
		path: '/library/rows/:rowId',
		element: <ProtectedRoute><AppLayout><HomeRowLibrary /></AppLayout></ProtectedRoute>,
		errorElement: <RouteError />,
	},
	{
		path: '/statistics',
		element: <ProtectedRoute><AppLayout><Suspense fallback={<CollectionFallback />}><CollectionStatistics /></Suspense></AppLayout></ProtectedRoute>,
		errorElement: <RouteError />,
	},
	{
		path: '/shelves',
		element: <ProtectedRoute><AppLayout><Suspense fallback={<CollectionFallback />}><CollectionShelves /></Suspense></AppLayout></ProtectedRoute>,
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
		path: '/playlists',
		element: (
			<ProtectedRoute>
				<AppLayout>
					<Suspense fallback={<CollectionFallback />}><Playlists /></Suspense>
				</AppLayout>
			</ProtectedRoute>
		),
		errorElement: <RouteError />,
	},
	{
		path: '/playlists/:id',
		element: (
			<ProtectedRoute>
				<AppLayout>
					<Suspense fallback={<CollectionFallback />}><Playlists /></Suspense>
				</AppLayout>
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
