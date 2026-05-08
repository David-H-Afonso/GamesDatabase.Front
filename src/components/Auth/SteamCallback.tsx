import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setSteamProfile } from '@/store/features/auth/authSlice'
import { selectIsAuthenticated } from '@/store/features/auth/selector'

/**
 * Handles Steam OpenID callback redirects.
 * - Login mode: token + user info in query params → dispatch login
 * - Link mode: steamLinked=true → dispatch profile update
 * - Error mode: error in query params → show error
 */
export const SteamCallback = () => {
	const dispatch = useAppDispatch()
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const isAuthenticated = useAppSelector(selectIsAuthenticated)

	useEffect(() => {
		const error = searchParams.get('error')
		const steamLinked = searchParams.get('steamLinked')
		const token = searchParams.get('token')
		const userId = searchParams.get('userId')
		const username = searchParams.get('username')
		const role = searchParams.get('role')
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

		if (token && userId && username && role) {
			// Login mode: store token via localStorage key that Redux-persist will pick up
			// We inject directly into the store via a custom action consumed in authSlice
			const loginData = {
				token,
				userId: parseInt(userId, 10),
				username,
				role: role as 'Admin' | 'Standard',
				steamId: steamId ?? undefined,
				steamNickname: steamNickname ?? undefined,
				steamAvatarUrl: steamAvatarUrl ?? undefined,
			}
			// Dispatch a custom action to set auth state from Steam login
			dispatch({ type: 'auth/steamLogin', payload: loginData })
			navigate('/', { replace: true })
			return
		}

		// Unknown state - go home or login
		navigate(isAuthenticated ? '/' : '/login', { replace: true })
	}, []) // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
			<p>Procesando inicio de sesión con Steam...</p>
		</div>
	)
}

export default SteamCallback
