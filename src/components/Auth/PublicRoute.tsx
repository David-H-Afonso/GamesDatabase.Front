import type { ReactNode } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { selectIsAuthenticated } from '@/store/features/auth/selector'

interface PublicRouteProps {
	children: ReactNode
}

export const PublicRoute = ({ children }: PublicRouteProps) => {
	const isAuthenticated = useAppSelector(selectIsAuthenticated)
	const location = useLocation()
	const [searchParams] = useSearchParams()
	const state = location.state as { from?: { pathname?: string; search?: string } } | null
	const queryReturnTo = searchParams.get('returnTo')
	const stateReturnTo = state?.from?.pathname ? `${state.from.pathname}${state.from.search ?? ''}` : null
	const requestedReturnTo = queryReturnTo ?? stateReturnTo
	const returnTo = requestedReturnTo?.startsWith('/') && !requestedReturnTo.startsWith('//') ? requestedReturnTo : '/'

	if (isAuthenticated) {
		return <Navigate to={returnTo} replace />
	}

	return <>{children}</>
}
