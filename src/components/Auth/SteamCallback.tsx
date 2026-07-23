import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setSteamProfile, steamLoginUser } from '@/store/features/auth/authSlice'
import { selectIsAuthenticated } from '@/store/features/auth/selector'

/**
 * Handles Steam OpenID callback redirects.
 *
 * Login mode:  `?code=<guid>`        → exchange code for JWT + refreshToken (never in URL)
 * Link mode:   `?steamLinked=true`   → dispatch profile update
 * Error mode:  `?error=<reason>`     → redirect to login with error message
 */
export const SteamCallback = () => {
	const dispatch = useAppDispatch()
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const isAuthenticated = useAppSelector(selectIsAuthenticated)

	useEffect(() => {
		let cancelled = false

		const handleCallback = async () => {
			const error = searchParams.get('error')
			const steamLinked = searchParams.get('steamLinked')
			const code = searchParams.get('code')
			const steamId = searchParams.get('steamId')
			const steamNickname = searchParams.get('steamNickname')
			const steamAvatarUrl = searchParams.get('steamAvatarUrl')

			if (error) {
				const storedReturnTo = sessionStorage.getItem('householdAuthorizationReturnTo')
				sessionStorage.removeItem('householdAuthorizationReturnTo')
				const params = new URLSearchParams({ steamError: error })
				if (storedReturnTo?.startsWith('/integrations/household/authorize')) params.set('returnTo', storedReturnTo)
				navigate(`/login?${params}`, { replace: true })
				return
			}

			if (steamLinked === 'true') {
				// Link mode: update Steam profile in Redux state
				dispatch(
					setSteamProfile({
						steamId: steamId ?? undefined,
						steamNickname: steamNickname ?? undefined,
						steamAvatarUrl: steamAvatarUrl ?? undefined,
					})
				)
				navigate('/settings', { replace: true })
				return
			}

			if (code) {
				// Login mode: exchange the one-time code for JWT + refresh token.
				// The code expires in 5 minutes and is consumed on first use.
				try {
					await dispatch(steamLoginUser({ code })).unwrap()
					const storedReturnTo = sessionStorage.getItem('householdAuthorizationReturnTo')
					sessionStorage.removeItem('householdAuthorizationReturnTo')
					const returnTo = storedReturnTo?.startsWith('/integrations/household/authorize') ? storedReturnTo : '/'
					if (!cancelled) navigate(returnTo, { replace: true })
				} catch (err) {
					const message = err instanceof Error ? err.message : String(err || 'steam_login_failed')
					const storedReturnTo = sessionStorage.getItem('householdAuthorizationReturnTo')
					sessionStorage.removeItem('householdAuthorizationReturnTo')
					const params = new URLSearchParams({ steamError: message })
					if (storedReturnTo?.startsWith('/integrations/household/authorize')) params.set('returnTo', storedReturnTo)
					if (!cancelled) navigate(`/login?${params}`, { replace: true })
				}
				return
			}

			// Unknown state - go home or login
			navigate(isAuthenticated ? '/' : '/login', { replace: true })
		}

		void handleCallback()

		return () => {
			cancelled = true
		}
	}, [])

	return (
		<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
			<p>Procesando inicio de sesión con Steam...</p>
		</div>
	)
}

export default SteamCallback
