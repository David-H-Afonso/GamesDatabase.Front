import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { updateUserPreferences, fetchUserPreferences } from '@/store/features/auth/authSlice'
import './AdminPreferences.scss'

const SCORE_PROVIDER_OPTIONS = ['Metacritic', 'OpenCritic', 'SteamDB'] as const

export const AdminPreferences = () => {
	const { t } = useTranslation()
	const dispatch = useAppDispatch()
	const user = useAppSelector((state) => state.auth.user)
	const [useScoreColors, setUseScoreColors] = useState(user?.useScoreColors ?? false)
	const [scoreProvider, setScoreProvider] = useState(user?.scoreProvider ?? 'Metacritic')
	const [showPriceComparisonIcon, setShowPriceComparisonIcon] = useState(user?.showPriceComparisonIcon ?? false)
	const [isSaving, setIsSaving] = useState(false)
	const [saveMessage, setSaveMessage] = useState<string | null>(null)
	const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null)
	const [readState, setReadState] = useState<'loading' | 'ready' | 'error'>('loading')
	const readRevision = useRef(0)
	const loadPreferences = useCallback(async () => {
		if (!user?.id) return
		const revision = ++readRevision.current
		setReadState('loading')
		try {
			await dispatch(fetchUserPreferences(user.id)).unwrap()
			if (revision === readRevision.current) setReadState('ready')
		} catch {
			if (revision === readRevision.current) setReadState('error')
		}
	}, [dispatch, user?.id])

	useEffect(() => {
		void loadPreferences()
		return () => { readRevision.current++ }
	}, [loadPreferences])

	useEffect(() => {
		// Update local state when user preferences change in store
		if (user) {
			setUseScoreColors(user.useScoreColors ?? false)
			setScoreProvider(user.scoreProvider ?? 'Metacritic')
			setShowPriceComparisonIcon(user.showPriceComparisonIcon ?? false)
		}
	}, [user])

	const handleToggleScoreColors = async (checked: boolean) => {
		if (!user?.id || readState !== 'ready') return

		setUseScoreColors(checked)
		setIsSaving(true)
		setSaveMessage(null)

		try {
			await dispatch(updateUserPreferences({ userId: user.id, useScoreColors: checked })).unwrap()
			setSaveMessage(t('admin.preferences.savedScoreColors'))
			setSaveSuccess(true)
			setTimeout(() => setSaveMessage(null), 3000)
		} catch (error) {
			setSaveMessage(t('admin.preferences.errorScoreColors'))
			setSaveSuccess(false)
			setUseScoreColors(!checked) // Revert on error
			setTimeout(() => setSaveMessage(null), 3000)
		} finally {
			setIsSaving(false)
		}
	}

	const handleScoreProviderChange = async (provider: string) => {
		if (!user?.id || readState !== 'ready') return

		setScoreProvider(provider)
		setIsSaving(true)
		setSaveMessage(null)

		try {
			await dispatch(updateUserPreferences({ userId: user.id, scoreProvider: provider })).unwrap()
			setSaveMessage(t('admin.preferences.savedScoreProvider'))
			setSaveSuccess(true)
			setTimeout(() => setSaveMessage(null), 3000)
		} catch (error) {
			setSaveMessage(t('admin.preferences.errorScoreProvider'))
			setSaveSuccess(false)
			setScoreProvider(user.scoreProvider ?? 'Metacritic') // Revert on error
			setTimeout(() => setSaveMessage(null), 3000)
		} finally {
			setIsSaving(false)
		}
	}

	const handleTogglePriceComparisonIcon = async (checked: boolean) => {
		if (!user?.id || readState !== 'ready') return

		setShowPriceComparisonIcon(checked)
		setIsSaving(true)
		setSaveMessage(null)

		try {
			await dispatch(updateUserPreferences({ userId: user.id, showPriceComparisonIcon: checked })).unwrap()
			setSaveMessage(t('admin.preferences.savedPriceIcon'))
			setSaveSuccess(true)
			setTimeout(() => setSaveMessage(null), 3000)
		} catch (error) {
			setSaveMessage(t('admin.preferences.errorPriceIcon'))
			setSaveSuccess(false)
			setShowPriceComparisonIcon(!checked)
			setTimeout(() => setSaveMessage(null), 3000)
		} finally {
			setIsSaving(false)
		}
	}

	if (!user) {
		return (
			<div className='admin-preferences'>
				<div className='admin-preferences__loading'>{t('common.loading')}</div>
			</div>
		)
	}

	return (
		<div className='admin-preferences'>
			<div className='admin-preferences__header'>
				<h1>{t('admin.preferences.title')}</h1>
				<p className='admin-preferences__subtitle'>{t('admin.preferences.subtitle')}</p>
			</div>

			<div className='admin-preferences__content'>
				{readState === 'error' && <div className='admin-preferences__read-error' role='alert'><p>{t('admin.preferences.loadError')}</p><button type='button' className='btn btn-secondary' onClick={() => void loadPreferences()}>{t('common.retry')}</button></div>}
				{readState === 'loading' && <p role='status'>{t('common.loading')}</p>}
				<div className='admin-preferences__section'>
					<h2 className='admin-preferences__section-title'>{t('admin.preferences.visualSettings')}</h2>

					<div className='admin-preferences__option'>
						<div className='admin-preferences__option-info'>
							<label htmlFor='score-colors' className='admin-preferences__option-label'>
								{t('admin.preferences.scoreColors')}
							</label>
							<p className='admin-preferences__option-description'>
								{t('admin.preferences.scoreColorsDesc')}
								<br />
								<span className='admin-preferences__score-example admin-preferences__score-example--green'>{t('admin.preferences.scoreColorsGreen')}</span>,{' '}
								<span className='admin-preferences__score-example admin-preferences__score-example--yellow'>{t('admin.preferences.scoreColorsYellow')}</span>,{' '}
								<span className='admin-preferences__score-example admin-preferences__score-example--red'>{t('admin.preferences.scoreColorsRed')}</span>
							</p>
						</div>
						<label className='admin-preferences__toggle'>
							<input
								id='score-colors'
								type='checkbox'
								checked={useScoreColors}
								onChange={(e) => handleToggleScoreColors(e.target.checked)}
								disabled={isSaving || readState !== 'ready'}
								className='admin-preferences__toggle-input'
							/>
							<span className='admin-preferences__toggle-slider'></span>
						</label>
					</div>

					<div className='admin-preferences__option'>
						<div className='admin-preferences__option-info'>
							<label htmlFor='score-provider' className='admin-preferences__option-label'>
								{t('admin.preferences.scoreProvider')}
							</label>
							<p className='admin-preferences__option-description'>{t('admin.preferences.scoreProviderDesc')}</p>
						</div>
						<select id='score-provider' value={scoreProvider} onChange={(e) => handleScoreProviderChange(e.target.value)} disabled={isSaving || readState !== 'ready'} className='admin-preferences__select'>
							{SCORE_PROVIDER_OPTIONS.map((option) => (
								<option key={option} value={option}>
									{option}
								</option>
							))}
						</select>
					</div>

					<div className='admin-preferences__option'>
						<div className='admin-preferences__option-info'>
							<label htmlFor='price-comparison-icon' className='admin-preferences__option-label'>
								{t('admin.preferences.priceIcon')}
							</label>
							<p className='admin-preferences__option-description'>{t('admin.preferences.priceIconDesc')}</p>
						</div>
						<label className='admin-preferences__toggle'>
							<input
								id='price-comparison-icon'
								type='checkbox'
								checked={showPriceComparisonIcon}
								onChange={(e) => handleTogglePriceComparisonIcon(e.target.checked)}
								disabled={isSaving || readState !== 'ready'}
								className='admin-preferences__toggle-input'
							/>
							<span className='admin-preferences__toggle-slider'></span>
						</label>
					</div>

					{saveMessage && (
						<div role={saveSuccess ? 'status' : 'alert'} className={`admin-preferences__message ${saveSuccess ? 'admin-preferences__message--success' : 'admin-preferences__message--error'}`}>{saveMessage}</div>
					)}
				</div>

				<div className='admin-preferences__section'>
					<h2 className='admin-preferences__section-title'>{t('admin.preferences.accountInfo')}</h2>
					<div className='admin-preferences__info-grid'>
						<div className='admin-preferences__info-item'>
							<span className='admin-preferences__info-label'>{t('admin.users.usernameLabel')}:</span>
							<span className='admin-preferences__info-value'>{user.username}</span>
						</div>
						<div className='admin-preferences__info-item'>
							<span className='admin-preferences__info-label'>{t('admin.users.roleLabel')}:</span>
							<span className='admin-preferences__info-value'>{user.role}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
