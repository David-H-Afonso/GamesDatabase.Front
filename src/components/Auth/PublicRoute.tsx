import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { selectIsAuthenticated } from '@/store/features/auth/selector'

interface PublicRouteProps {
	children: ReactNode
}

export const PublicRoute = ({ children }: PublicRouteProps) => {
	const isAuthenticated = useAppSelector(selectIsAuthenticated)

	if (isAuthenticated) {
		return <Navigate to='/' replace />
	}

	return <>{children}</>
}
