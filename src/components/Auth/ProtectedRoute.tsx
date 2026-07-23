import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { selectIsAuthenticated, selectCurrentUser } from '@/store/features/auth/selector'

interface ProtectedRouteProps {
	children: ReactNode
	adminOnly?: boolean
}

export const ProtectedRoute = ({ children, adminOnly = false }: ProtectedRouteProps) => {
	const location = useLocation()
	const isAuthenticated = useAppSelector(selectIsAuthenticated)
	const currentUser = useAppSelector(selectCurrentUser)
	const isAdmin = currentUser?.role === 'Admin'

	if (!isAuthenticated) {
		// Redirect to login, preserving the intended destination
		const returnTo = `${location.pathname}${location.search}`
		return <Navigate to={`/login?${new URLSearchParams({ returnTo })}`} state={{ from: location }} replace />
	}

	if (adminOnly && !isAdmin) {
		return <Navigate to='/' replace />
	}

	return <>{children}</>
}
