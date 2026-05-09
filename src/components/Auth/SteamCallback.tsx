import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setSteamProfile, steamLoginUser } from '@/store/features/auth/authSlice'
import { selectIsAuthenticated } from '@/store/features/auth/selector'

/**
 * Handles Steam OpenID callback redirects.
 * - Login mode: token + user id in query params -> fetch canonical user data
 * - Link mode: steamLinked=true → dispatch profile update
 * - Error mode: error in query params → show error
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
			const token = searchParams.get('token')
			const userId = searchParams.get('userId')
			const steamId = searchParams.get('steamId')
			const steamNickname = searchParams.get('steamNickname')
			const steamAvatarUrl = searchParams.get('steamAvatarUrl')

			if (error) {
				navigate('/login?steamError=' + encodeURIComponent(error), { replace: true })
				return
			}

			if (steamLinked === 'true') {
				// Link mode: update Steam profile in Redux state
				dispatch(setSteamProfile({ steamId: steamId ?? undefined, steamNickname: steamNickname ?? undefined, steamAvatarUrl: steamAvatarUrl ?? undefined }))
				navigate('/settings', { replace: true })
				return
			}

			if (token && userId) {
				const parsedUserId = parseInt(userId, 10)
				if (Number.isNaN(parsedUserId)) {
					navigate('/login?steamError=invalid_user', { replace: true })
					return
				}

				try {
					await dispatch(steamLoginUser({ token, userId: parsedUserId })).unwrap()
					if (!cancelled) navigate('/', { replace: true })
				} catch (err) {
					const message = err instanceof Error ? err.message : String(err || 'steam_login_failed')
					if (!cancelled) navigate('/login?steamError=' + encodeURIComponent(message), { replace: true })
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
	}, []) // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
			<p>Procesando inicio de sesión con Steam...</p>
		</div>
	)
}

export default SteamCallback
