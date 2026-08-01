import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { loginUser, clearError } from '@/store/features/auth/authSlice'
import { selectIsAuthenticated, selectAuthLoading, selectAuthError } from '@/store/features/auth/selector'
import { selectRecentUsers } from '@/store/features/recentUsers/selector'
import { RecentUsersList } from './RecentUsersList'
import { environment } from '@/environments'
import { userService } from '@/services/UserService/UserService'
import './Login.scss'

export const Login = () => {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const location = useLocation()
	const dispatch = useAppDispatch()
	const [searchParams] = useSearchParams()

	const isAuthenticated = useAppSelector(selectIsAuthenticated)
	const loading = useAppSelector(selectAuthLoading)
	const error = useAppSelector(selectAuthError)
	const recentUsers = useAppSelector(selectRecentUsers)

	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [showDefaultHint, setShowDefaultHint] = useState(false)
	const [defaultUsername, setDefaultUsername] = useState('Admin')
	const [steamError, setSteamError] = useState<string | null>(null)
	const passwordInputRef = useRef<HTMLInputElement>(null)
	const routeState = location.state as { from?: { pathname?: string; search?: string } } | null
	const queryReturnTo = searchParams.get('returnTo')
	const stateReturnTo = routeState?.from?.pathname ? `${routeState.from.pathname}${routeState.from.search ?? ''}` : null
	const requestedReturnTo = queryReturnTo ?? stateReturnTo
	const returnTo = requestedReturnTo?.startsWith('/') && !requestedReturnTo.startsWith('//') ? requestedReturnTo : '/'

	// Hide default hint if there are recent users
	const hasRecentUsers = recentUsers.length > 0

	// Only offer the bootstrap default credentials when the API confirms the
	// installation is still in initial-setup state (default admin without a
	// password). On any error we keep the hint hidden to avoid suggesting
	// credentials that do not work in production.
	useEffect(() => {
		if (hasRecentUsers) {
			setShowDefaultHint(false)
			return
		}
		let active = true
		userService
			.getSetupStatus()
			.then((status) => {
				if (!active) return
				setShowDefaultHint(status.defaultCredentialsAvailable)
				if (status.defaultUsername) setDefaultUsername(status.defaultUsername)
			})
			.catch(() => {
				if (active) setShowDefaultHint(false)
			})
		return () => {
			active = false
		}
	}, [hasRecentUsers])

	// Show Steam error from callback
	useEffect(() => {
		const err = searchParams.get('steamError')
		if (err) setSteamError(decodeURIComponent(err))
	}, [searchParams])

	// Redirect if already authenticated
	useEffect(() => {
		if (isAuthenticated) {
			navigate(returnTo, { replace: true })
		}
	}, [isAuthenticated, navigate, returnTo])

	// Clear error when component unmounts
	useEffect(() => {
		return () => {
			dispatch(clearError())
		}
	}, [dispatch])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		await dispatch(
			loginUser({
				username: username.trim(),
				password: password.trim() || '',
			})
		)
	}

	const handleUseDefaultCredentials = () => {
		setUsername(defaultUsername)
		setPassword('')
		setShowDefaultHint(false)
	}

	const handleRecentUserSelect = async (selectedUsername: string, hasPassword: boolean) => {
		setUsername(selectedUsername)
		setShowDefaultHint(false)

		if (!hasPassword) {
			// Auto-login for users without password
			setPassword('')
			await dispatch(
				loginUser({
					username: selectedUsername,
					password: '',
				})
			)
		} else {
			// Pre-fill username and focus password field
			setPassword('')
			setTimeout(() => {
				passwordInputRef.current?.focus()
			}, 100)
		}
	}

	const handleSteamLogin = () => {
		if (returnTo.startsWith('/integrations/household/authorize')) {
			sessionStorage.setItem('householdAuthorizationReturnTo', returnTo)
		}
		const frontendUrl = window.location.origin
		const steamLoginUrl = `${environment.baseUrl}${environment.apiRoutes.steam.authLogin}?mode=login&frontend_url=${encodeURIComponent(frontendUrl)}`
		window.location.href = steamLoginUrl
	}

	return (
		<div className='login-container'>
			<div className='login-card'>
				<div className='login-header'>
					<h1>{t('auth.title')}</h1>
					<p>{t('auth.subtitle')}</p>
				</div>

				{(error || steamError) && (
					<div className='login-alert login-alert--error'>
						<strong>{t('auth.errorPrefix')}</strong> {error || steamError}
					</div>
				)}

				<RecentUsersList onUserSelect={handleRecentUserSelect} />

				{showDefaultHint && !hasRecentUsers && (
					<div className='login-alert login-alert--info'>
						<p>
							<strong>{t('auth.firstTime')}</strong> {t('auth.firstTimeHint')}
						</p>
						<button type='button' className='btn-link' onClick={handleUseDefaultCredentials}>
							{t('auth.useDefaultCredentials')}
						</button>
						<p className='login-hint'>{t('auth.credentialsHint', { username: defaultUsername })}</p>
					</div>
				)}

				<form onSubmit={handleSubmit} className='login-form'>
					<div className='form-group'>
						<label htmlFor='username'>{t('auth.usernameLabel')}</label>
						<input
							type='text'
							id='username'
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							placeholder={t('auth.usernamePlaceholder')}
							required
							autoFocus
							disabled={loading}
						/>
					</div>

					<div className='form-group'>
						<label htmlFor='password'>
							{t('auth.passwordLabel')} <span className='optional-label'>{t('auth.passwordOptional')}</span>
						</label>
						<input
							type='password'
							id='password'
							ref={passwordInputRef}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder={t('auth.passwordPlaceholder')}
							disabled={loading}
						/>
						<small className='form-hint'>{t('auth.passwordHint')}</small>
					</div>

					<button type='submit' className='btn btn-primary btn-block' disabled={loading || !username}>
						{loading ? t('auth.signingIn') : t('auth.signIn')}
					</button>
				</form>

				<div className='login-footer'>
					<p className='text-muted'>{t('auth.footer')}</p>
				</div>

				<div className='login-divider'>
					<span>{t('auth.or')}</span>
				</div>

				<button type='button' className='btn btn-steam btn-block' onClick={handleSteamLogin} disabled={loading}>
					<img src='https://store.steampowered.com/favicon.ico' alt='' width={16} height={16} style={{ marginRight: 8 }} />
					{t('auth.steamLogin')}
				</button>
			</div>
		</div>
	)
}

export default Login
