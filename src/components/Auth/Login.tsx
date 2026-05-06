import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { loginUser, clearError } from '@/store/features/auth/authSlice'
import { selectIsAuthenticated, selectAuthLoading, selectAuthError } from '@/store/features/auth/selector'
import { selectRecentUsers } from '@/store/features/recentUsers/selector'
import { RecentUsersList } from './RecentUsersList'
import './Login.scss'

export const Login = () => {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const dispatch = useAppDispatch()

	const isAuthenticated = useAppSelector(selectIsAuthenticated)
	const loading = useAppSelector(selectAuthLoading)
	const error = useAppSelector(selectAuthError)
	const recentUsers = useAppSelector(selectRecentUsers)

	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [showDefaultHint, setShowDefaultHint] = useState(true)
	const passwordInputRef = useRef<HTMLInputElement>(null)

	// Hide default hint if there are recent users
	const hasRecentUsers = recentUsers.length > 0

	// Redirect if already authenticated
	useEffect(() => {
		if (isAuthenticated) {
			navigate('/', { replace: true })
		}
	}, [isAuthenticated, navigate])

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
		setUsername('Admin')
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

	return (
		<div className='login-container'>
			<div className='login-card'>
				<div className='login-header'>
					<h1>{t('auth.title')}</h1>
					<p>{t('auth.subtitle')}</p>
				</div>

				{error && (
					<div className='login-alert login-alert--error'>
						<strong>{t('auth.errorPrefix')}</strong> {error}
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
						<p className='login-hint'>{t('auth.credentialsHint', { username: 'Admin' })}</p>
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
			</div>
		</div>
	)
}

export default Login
