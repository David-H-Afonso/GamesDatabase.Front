import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { authService } from '@/services'

interface PublicRouteProps {
	children: ReactNode
}

export const PublicRoute = ({ children }: PublicRouteProps) => {
	const isAuthenticated = authService.isAuthenticated()

	if (isAuthenticated) {
		return <Navigate to='/' replace />
	}

	return <>{children}</>
}
