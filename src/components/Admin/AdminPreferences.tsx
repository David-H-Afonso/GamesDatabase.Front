import { useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { updateUserPreferences, fetchUserPreferences } from '@/store/features/auth/authSlice'
import './AdminPreferences.scss'

const SCORE_PROVIDER_OPTIONS = ['Metacritic', 'OpenCritic', 'SteamDB'] as const

export const AdminPreferences = () => {
	const dispatch = useAppDispatch()
	const user = useAppSelector((state) => state.auth.user)
	const [useScoreColors, setUseScoreColors] = useState(user?.useScoreColors ?? false)
	const [scoreProvider, setScoreProvider] = useState(user?.scoreProvider ?? 'Metacritic')
	const [showPriceComparisonIcon, setShowPriceComparisonIcon] = useState(
		user?.showPriceComparisonIcon ?? false
	)
	const [isSaving, setIsSaving] = useState(false)
	const [saveMessage, setSaveMessage] = useState<string | null>(null)

	useEffect(() => {
		// Fetch latest user preferences when component mounts
		if (user?.id) {
			dispatch(fetchUserPreferences(user.id))
		}
	}, [dispatch, user?.id])

	useEffect(() => {
		// Update local state when user preferences change in store
		if (user) {
			setUseScoreColors(user.useScoreColors ?? false)
			setScoreProvider(user.scoreProvider ?? 'Metacritic')
			setShowPriceComparisonIcon(user.showPriceComparisonIcon ?? false)
		}
	}, [user])

	const handleToggleScoreColors = async (checked: boolean) => {
		if (!user?.id) return

		setUseScoreColors(checked)
		setIsSaving(true)
		setSaveMessage(null)

		try {
			await dispatch(updateUserPreferences({ userId: user.id, useScoreColors: checked })).unwrap()
			setSaveMessage('Score colors preference saved')
			setTimeout(() => setSaveMessage(null), 3000)
		} catch (error) {
			setSaveMessage('Failed to save score colors preference')
			setUseScoreColors(!checked) // Revert on error
			setTimeout(() => setSaveMessage(null), 3000)
		} finally {
			setIsSaving(false)
		}
	}

	const handleScoreProviderChange = async (provider: string) => {
		if (!user?.id) return

		setScoreProvider(provider)
		setIsSaving(true)
		setSaveMessage(null)

		try {
			await dispatch(updateUserPreferences({ userId: user.id, scoreProvider: provider })).unwrap()
			setSaveMessage('Score provider preference saved')
			setTimeout(() => setSaveMessage(null), 3000)
		} catch (error) {
			setSaveMessage('Failed to save score provider preference')
			setScoreProvider(user.scoreProvider ?? 'Metacritic') // Revert on error
			setTimeout(() => setSaveMessage(null), 3000)
		} finally {
			setIsSaving(false)
		}
	}

	const handleTogglePriceComparisonIcon = async (checked: boolean) => {
		if (!user?.id) return

		setShowPriceComparisonIcon(checked)
		setIsSaving(true)
		setSaveMessage(null)

		try {
			await dispatch(
				updateUserPreferences({ userId: user.id, showPriceComparisonIcon: checked })
			).unwrap()
			setSaveMessage('Price comparison icon preference saved')
			setTimeout(() => setSaveMessage(null), 3000)
		} catch (error) {
			setSaveMessage('Failed to save price comparison icon preference')
			setShowPriceComparisonIcon(!checked)
			setTimeout(() => setSaveMessage(null), 3000)
		} finally {
			setIsSaving(false)
		}
	}

	if (!user) {
		return (
			<div className='admin-preferences'>
				<div className='admin-preferences__loading'>Loading...</div>
			</div>
		)
	}

	return (
		<div className='admin-preferences'>
			<div className='admin-preferences__header'>
				<h1>User Preferences</h1>
				<p className='admin-preferences__subtitle'>Customize your experience</p>
			</div>

			<div className='admin-preferences__content'>
				<div className='admin-preferences__section'>
					<h2 className='admin-preferences__section-title'>Visual Settings</h2>

					<div className='admin-preferences__option'>
						<div className='admin-preferences__option-info'>
							<label htmlFor='score-colors' className='admin-preferences__option-label'>
								Metacritic Score Colors
							</label>
							<p className='admin-preferences__option-description'>
								Apply color-coded styling to critic scores based on Metacritic's rating system:
								<br />
								<span style={{ color: '#66cc33', fontWeight: 'bold' }}>● Green (75-100)</span>,{' '}
								<span style={{ color: '#ffcc33', fontWeight: 'bold' }}>● Yellow (50-74)</span>,{' '}
								<span style={{ color: '#ff0000', fontWeight: 'bold' }}>● Red (0-49)</span>
							</p>
						</div>
						<label className='admin-preferences__toggle'>
							<input
								id='score-colors'
								type='checkbox'
								checked={useScoreColors}
								onChange={(e) => handleToggleScoreColors(e.target.checked)}
								disabled={isSaving}
								className='admin-preferences__toggle-input'
							/>
							<span className='admin-preferences__toggle-slider'></span>
						</label>
					</div>

					<div className='admin-preferences__option'>
						<div className='admin-preferences__option-info'>
							<label htmlFor='score-provider' className='admin-preferences__option-label'>
								Score Provider Logo
							</label>
							<p className='admin-preferences__option-description'>
								Select which logo to display next to critic scores in the game cards
							</p>
						</div>
						<select
							id='score-provider'
							value={scoreProvider}
							onChange={(e) => handleScoreProviderChange(e.target.value)}
							disabled={isSaving}
							className='admin-preferences__select'>
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
								Price Comparison Icon
							</label>
							<p className='admin-preferences__option-description'>
								Show a small key or store icon next to the user note when the price comparison field
								is defined for a game
							</p>
						</div>
						<label className='admin-preferences__toggle'>
							<input
								id='price-comparison-icon'
								type='checkbox'
								checked={showPriceComparisonIcon}
								onChange={(e) => handleTogglePriceComparisonIcon(e.target.checked)}
								disabled={isSaving}
								className='admin-preferences__toggle-input'
							/>
							<span className='admin-preferences__toggle-slider'></span>
						</label>
					</div>

					{saveMessage && (
						<div
							className={`admin-preferences__message ${
								saveMessage.includes('success')
									? 'admin-preferences__message--success'
									: 'admin-preferences__message--error'
							}`}>
							{saveMessage}
						</div>
					)}
				</div>

				<div className='admin-preferences__section'>
					<h2 className='admin-preferences__section-title'>Account Information</h2>
					<div className='admin-preferences__info-grid'>
						<div className='admin-preferences__info-item'>
							<span className='admin-preferences__info-label'>Username:</span>
							<span className='admin-preferences__info-value'>{user.username}</span>
						</div>
						<div className='admin-preferences__info-item'>
							<span className='admin-preferences__info-label'>Role:</span>
							<span className='admin-preferences__info-value'>{user.role}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
