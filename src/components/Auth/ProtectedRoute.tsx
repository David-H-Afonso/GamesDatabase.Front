import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { authService } from '@/services'

interface ProtectedRouteProps {
	children: ReactNode
	adminOnly?: boolean
}

export const ProtectedRoute = ({ children, adminOnly = false }: ProtectedRouteProps) => {
	const isAuthenticated = authService.isAuthenticated()
	const isAdmin = authService.isAdmin()

	if (!isAuthenticated) {
		return <Navigate to='/login' replace />
	}

	if (adminOnly && !isAdmin) {
		return <Navigate to='/' replace />
	}

	return <>{children}</>
}
