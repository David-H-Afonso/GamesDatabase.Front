import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Game } from '@/models/api/Game'
import './GameDetails.scss'
import { formatPlaytime, formatToLocaleDate, hoursToMinutesValue, minutesToHoursValue, searchGoogleImage, useClickOutside } from '@/utils'
import DeleteIcon from '@/assets/svgs/trashbin.svg?react'
import LockIcon from '@/assets/svgs/lock.svg?react'
import UnlockIcon from '@/assets/svgs/unlock.svg?react'
import { EditableField, OptimizedImage, Toast } from '@/components/elements'
import { EditableSelect } from '../EditableSelect/EditableSelect'
import { EditableMultiSelect } from '../EditableMultiSelect/EditableMultiSelect'
import { useGames } from '@/hooks'
import { useAppSelector } from '@/store/hooks'
import { steamService } from '@/services'
import { useFormik } from 'formik'
import { getCriticScoreUrl, getCriticProviderIdFromName, getCriticProviderNameFromId, resolveEffectiveProvider, type CriticProvider } from '@/helpers/criticScoreHelper'
import { GameReplaysTab } from './GameReplaysTab'
import { GameHistoryTab } from './GameHistoryTab'
import { SteamTab } from './SteamTab'

type DetailTab = 'info' | 'replays' | 'history' | 'steam'

const preloadImage = (url: string) =>
	new Promise<boolean>((resolve) => {
		const img = new Image()
		img.onload = () => resolve(true)
		img.onerror = () => resolve(false)
		img.src = url
	})

interface GameDetailsProps {
	game: Game
	closeDetails: () => void
	onDelete?: (game: Game) => void
}

export const GameDetails: React.FC<GameDetailsProps> = (props) => {
	const { t } = useTranslation()
	const { game: gameProp, closeDetails, onDelete } = props
	const [game, setGame] = useState(gameProp)
	const [isClosing, setIsClosing] = useState(false)
	const [activeTab, setActiveTab] = useState<DetailTab>('info')
	const [steamImgLoading, setSteamImgLoading] = useState<'logo' | 'cover' | null>(null)
	const [steamIdLocked, setSteamIdLocked] = useState(() => gameProp.steamAppId != null)
	const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
	const { updateGameById, fetchGameDetails } = useGames()

	useEffect(() => {
		setGame(gameProp)
		setSteamIdLocked(gameProp.steamAppId != null)
	}, [gameProp])

	// Get options for selectable fields
	const { activeStatuses: statusOptions } = useAppSelector((state) => state.gameStatus)
	const { platforms, activePlatforms } = useAppSelector((state) => state.gamePlatform)
	const platformOptions = platforms.length > 0 ? platforms : activePlatforms
	const { playedStatuses: playedStatusOptions } = useAppSelector((state) => state.gamePlayedStatus)
	const { playWithOptions } = useAppSelector((state) => state.gamePlayWith)
	const scoreProvider = useAppSelector((state) => state.auth.user?.scoreProvider ?? 'Metacritic') as CriticProvider

	// Options for price comparison (Where's Key)
	const priceComparisonOptions = [
		{ id: 1, name: t('game.details.cheaperKey'), color: undefined },
		{ id: 2, name: t('game.details.cheaperStore'), color: undefined },
	]

	const panelRef = useClickOutside<HTMLDivElement>(() => {
		handleClose()
	})

	const handleClose = () => {
		setIsClosing(true)
		setTimeout(() => {
			closeDetails()
		}, 300) // Match the duration of the slideOut animation
	}

	const refreshSteamLogo = async () => {
		if (!game.steamAppId || steamImgLoading !== null) return
		const previousLogo = game.logo
		setSteamImgLoading('logo')
		try {
			// Clear current icon so backend re-resolves it (community icon → API hash icon)
			await saveField('logo', null)
			await steamService.syncGame(game.id)
			const refreshed = await fetchGameDetails(game.id)
			const nextLogo = refreshed?.logo
			if (nextLogo && (await preloadImage(nextLogo))) {
				// New logo found and confirmed to load
				setGame(refreshed)
			} else {
				// Nothing usable found – restore whatever the user had before.
				// Do NOT check whether the previous URL still loads here: a transient CDN hiccup
				// would cause us to silently discard a valid logo. Restoring a stale/broken URL
				// is preferable because it remains visible to the user and they can try again.
				await saveField('logo', previousLogo ?? null)
				setToast({ message: t('game.details.refreshLogoFailed'), type: 'error' })
			}
		} finally {
			setSteamImgLoading(null)
		}
	}

	const refreshSteamCover = async () => {
		if (!game.steamAppId || steamImgLoading !== null) return
		const previousCover = game.cover
		setSteamImgLoading('cover')
		try {
			// Resolve the cover through the backend (Steam appdetails) instead of guessing a CDN
			// URL client-side. Newer games serve headers from a content-hashed path
			// (…/store_item_assets/steam/apps/{id}/{hash}/header.jpg) that cannot be constructed
			// without the hash, so a hardcoded /apps/{id}/header.jpg would 404.
			await saveField('cover', null)
			await steamService.syncGame(game.id)
			const refreshed = await fetchGameDetails(game.id)
			const nextCover = refreshed?.cover
			if (nextCover && (await preloadImage(nextCover))) {
				setGame(refreshed)
			} else {
				// Nothing usable resolved – restore whatever the user had before
				await saveField('cover', previousCover ?? null)
				setToast({ message: t('game.details.refreshCoverFailed'), type: 'error' })
			}
		} finally {
			setSteamImgLoading(null)
		}
	}

	// Formik to manage fields locally and validate critic/grade
	const formik = useFormik({
		initialValues: {
			name: game.name ?? '',
			statusId: game.statusId ?? undefined,
			released: game.released ?? '',
			critic: game.critic ?? undefined,
			criticProvider: game.criticProvider ?? undefined,
			story: game.story ?? undefined,
			completion: game.completion ?? undefined,
			score: game.score ?? undefined,
			platformId: game.platformId ?? undefined,
			playedStatusId: game.playedStatusId ?? undefined,
			started: game.started ?? '',
			finished: game.finished ?? '',
			grade: game.grade ?? undefined,
			playWithIds: game.playWithIds ?? [],
			logo: game.logo ?? '',
			cover: game.cover ?? '',
			comment: game.comment ?? '',
			isCheaperByKey: game.isCheaperByKey ?? undefined,
			keyStoreUrl: game.keyStoreUrl ?? '',
			manualPlaytimeMinutes: game.manualPlaytimeMinutes ?? undefined,
			isManuallyCompleted: game.isManuallyCompleted ?? false,
			steamAppId: game.steamAppId ?? undefined,
		},
		enableReinitialize: true,
		validate: (values) => {
			const errors: Record<string, string> = {}
			const clampNumber = (v: any) => (v === '' || v === null || typeof v === 'undefined' ? undefined : Number(v))
			const critic = clampNumber(values.critic)
			const grade = clampNumber(values.grade)
			if (typeof critic !== 'undefined' && (isNaN(critic) || critic < 0 || critic > 100)) {
				errors.critic = t('game.details.errorCritic')
			}
			if (typeof grade !== 'undefined' && (isNaN(grade) || grade < 0 || grade > 100)) {
				errors.grade = t('game.details.errorGrade')
			}
			return errors
		},
		onSubmit: async () => {
			// no-op: we save per-field via saveField
		},
	})

	// helper to save a single field: validate, set formik state, then call backend
	const saveField = async (field: string, value: any) => {
		// coerce numeric-like fields
		let payloadValue: any = value

		// Handle numeric fields (all optional)
		if (field === 'critic' || field === 'grade' || field === 'story' || field === 'completion' || field === 'score' || field === 'steamAppId' || field === 'manualPlaytimeMinutes') {
			if (value === '' || value === null || typeof value === 'undefined') {
				payloadValue = null
				formik.setFieldValue(field as any, undefined)
			} else {
				const n = Number(value)
				if (isNaN(n)) {
					formik.setFieldError(field, t('game.details.errorMustBeNumber'))
					return
				}
				// clamp for critic and grade
				if (field === 'critic' || field === 'grade') {
					const clamped = Math.min(100, Math.max(0, Math.round(n)))
					payloadValue = clamped
					formik.setFieldValue(field as any, clamped)
				} else {
					const normalized = Math.max(0, Math.round(n))
					payloadValue = normalized
					formik.setFieldValue(field as any, normalized)
				}
			}
		}
		// Handle optional string fields (can be cleared)
		else if (field === 'logo' || field === 'cover' || field === 'comment' || field === 'keyStoreUrl' || field === 'released' || field === 'started' || field === 'finished') {
			if (value === '' || value === null || typeof value === 'undefined') {
				payloadValue = null
				formik.setFieldValue(field as any, '')
			} else {
				payloadValue = value
				formik.setFieldValue(field as any, value)
			}
		}
		// Handle required fields (cannot be empty)
		else if (field === 'name') {
			if (value === '' || value === null || typeof value === 'undefined') {
				formik.setFieldError(field, t('game.details.errorNameRequired'))
				return
			}
			payloadValue = value
			formik.setFieldValue(field as any, value)
		}
		// Handle required ID fields (cannot be empty/null)
		else if (field === 'statusId') {
			if (value === null || typeof value === 'undefined') {
				formik.setFieldError(field, t('game.details.errorStatusRequired'))
				return
			}
			payloadValue = value
			formik.setFieldValue(field as any, value)
		}
		// Handle optional ID fields (can be null)
		else if (field === 'platformId' || field === 'playedStatusId') {
			if (value === null || typeof value === 'undefined') {
				payloadValue = null
			} else {
				payloadValue = value
			}
			formik.setFieldValue(field as any, value)
		}
		// Handle optional boolean fields
		else if (field === 'isCheaperByKey') {
			// Allow undefined/null for optional boolean
			if (value === null || typeof value === 'undefined') {
				payloadValue = null
			} else {
				payloadValue = value
			}
			formik.setFieldValue(field as any, value)
		}
		// Handle required boolean fields
		else if (field === 'isManuallyCompleted') {
			payloadValue = Boolean(value)
			formik.setFieldValue(field as any, payloadValue)
		}
		// Handle other fields (playWithIds, etc.)
		else {
			payloadValue = value
			formik.setFieldValue(field as any, value)
		}

		// Persist to backend
		try {
			const updatedGame = await updateGameById(game.id, { [field]: payloadValue } as any)
			if (updatedGame) {
				setGame(updatedGame)
			}
		} catch (err) {
			console.error(`Error saving ${field}:`, err)
			// restore original value from prop if needed
			formik.setFieldValue(field as any, (game as any)[field])
		}
	}

	return (
		<div ref={panelRef} className={`game-details ${isClosing ? 'closing' : ''}`}>
			<h2 className='sr-only'>{t('game.details.title', { name: game.name })}</h2>
			<div className='game-details-header'>
				<div className='game-details-header-actions'>
					<button className='game-details-header-actions-delete' onClick={() => onDelete?.(game)} aria-label={t('game.details.deleteGame')}>
						<DeleteIcon width={20} height={20} color='#ef4444' />
					</button>
					<button onClick={handleClose} aria-label={t('game.details.closeDetails')}>
						✕
					</button>
				</div>
				<div className='game-details-header-title'>
					{game.logo ? (
						<div
							className='game-details-header-title-image'
							onClick={() => {
								searchGoogleImage(game.name, 'logo')
							}}>
							<OptimizedImage
								src={game.logo}
								alt={t('game.card.logoAlt', { name: game.name })}
								className='game-details__logo'
								quality='high'
								loading='eager'
								width={80}
								height={80}
							/>
						</div>
					) : null}
					<div className='game-details-header-title-text'>
						<EditableField value={formik.values.name} type='text' onSave={(value) => saveField('name', value)} placeholder={t('game.details.placeholderName')} allowEmpty={false} />
					</div>
				</div>
			</div>

			<div className='game-details-content'>
				<div
					className='game-details-content-cover'
					style={{ cursor: game.cover ? 'default' : 'pointer', position: 'relative' }}
					onClick={() => {
						searchGoogleImage(game.name, 'cover')
					}}>
					{game.cover && (
						<div style={{ width: '100%' }}>
							<OptimizedImage
								src={game.cover}
								alt={t('game.card.coverAlt', { name: game.name })}
								className='game-details__cover'
								quality='high'
								loading='eager'
								width={600}
								height={350}
								imageUnavailableText={t('game.details.fieldCover')}
							/>
						</div>
					)}
					{game.steamAppId && (
						<button
							className='game-details-cover-steam-refresh'
							onClick={(e) => {
								e.stopPropagation()
								void refreshSteamCover()
							}}
							disabled={steamImgLoading !== null}
							aria-label={t('game.details.refreshSteamCover')}
							title={t('game.details.refreshSteamCover')}>
							↺
						</button>
					)}
				</div>
			</div>

			<div className='game-details-tabs'>
				<nav className='game-details-tabs-nav'>
					<button className={activeTab === 'info' ? 'active' : ''} onClick={() => setActiveTab('info')}>
						{t('game.details.tabInfo')}
					</button>
					<button className={activeTab === 'replays' ? 'active' : ''} onClick={() => setActiveTab('replays')}>
						{t('game.details.tabReplays')}
					</button>
					<button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>
						{t('game.details.tabHistory')}
					</button>
					{game.steamAppId && (
						<button className={activeTab === 'steam' ? 'active' : ''} onClick={() => setActiveTab('steam')}>
							Steam
						</button>
					)}
				</nav>

				<div className='game-details-tabs-panel'>
					{activeTab === 'info' && (
						<>
							<div className='game-details-content-infoList'>
								<div className='game-details-content-infoList-item'>
									<h3>{t('game.details.fieldStatus')}</h3>
									<EditableSelect
										value={formik.values.statusId}
										displayValue={game.statusName}
										options={statusOptions}
										onSave={(value) => saveField('statusId', value)}
										placeholder={t('game.details.selectStatus')}
									/>
								</div>
								<div className='game-details-content-infoList-item'>
									<h3>{t('game.details.fieldReleased')}</h3>
									<EditableField
										value={formik.values.released}
										type='date'
										onSave={(value) => saveField('released', value)}
										placeholder={t('game.details.placeholderReleased')}
										formatter={(val) => formatToLocaleDate(val as string)}
									/>
								</div>
								<div className='game-details-content-infoList-item'>
									<h3
										className='clickable'
										onClick={() => {
											if (!formik.values.name) return
											const provider = resolveEffectiveProvider(formik.values.criticProvider as CriticProvider | undefined, scoreProvider)
											const url = getCriticScoreUrl(formik.values.name, provider)
											window.open(url, '_blank', 'noopener')
										}}>
										{t('game.details.fieldCriticScore')}
									</h3>
									<EditableField value={formik.values.critic} type='number' onSave={(value) => saveField('critic', value)} placeholder={t('game.details.placeholderCritic')} />
								</div>
								<div className='game-details-content-infoList-item'>
									<h3>{t('game.details.fieldCriticLogo')}</h3>
									<EditableSelect
										value={getCriticProviderIdFromName(formik.values.criticProvider)}
										displayValue={formik.values.criticProvider ?? t('game.details.criticDefault')}
										options={[
											{ id: 0, name: t('game.details.criticDefault'), color: undefined },
											{ id: 1, name: t('game.details.criticMetacritic'), color: undefined },
											{ id: 2, name: t('game.details.criticOpenCritic'), color: undefined },
											{ id: 3, name: t('game.details.criticSteamDB'), color: undefined },
										]}
										onSave={async (value) => {
											if (value === 0 || value === undefined) {
												await saveField('criticProvider', null)
											} else {
												const provider = getCriticProviderNameFromId(value)
												await saveField('criticProvider', provider)
											}
										}}
										placeholder={t('game.details.selectCriticLogo')}
									/>
								</div>
								<div className='game-details-content-infoList-item'>
									<h3
										className='clickable'
										onClick={() => {
											if (!formik.values.name) return
											const url = `https://howlongtobeat.com/?q=${encodeURIComponent(formik.values.name)}`
											window.open(url, '_blank', 'noopener')
										}}>
										{t('game.details.fieldStory')}
									</h3>
									<EditableField
										value={formik.values.story}
										type='number'
										onSave={(value) => saveField('story', value)}
										placeholder={t('game.details.placeholderStory')}
										formatter={(val) => `${val || 0}h`}
									/>
								</div>
								<div className='game-details-content-infoList-item'>
									<h3
										className='clickable'
										onClick={() => {
											if (!formik.values.name) return
											const url = `https://howlongtobeat.com/?q=${encodeURIComponent(formik.values.name)}`
											window.open(url, '_blank', 'noopener')
										}}>
										{t('game.details.fieldCompletion')}
									</h3>
									<EditableField
										value={formik.values.completion}
										type='number'
										onSave={(value) => saveField('completion', value)}
										placeholder={t('game.details.placeholderStory')}
										formatter={(val) => `${val || 0}h`}
									/>
								</div>
								<div className='game-details-content-infoList-item'>
									<h3>{t('game.details.fieldScore')}</h3>
									<EditableField
										value={formik.values.score}
										type='number'
										onSave={(value) => saveField('score', value)}
										placeholder={t('game.details.placeholderScore')}
										allowEditing={false}
									/>
								</div>
								<div className='game-details-content-infoList-item'>
									<h3
										className={(game.platformName || '').toLowerCase().includes('steam') || (game.platformName || '').toLowerCase().includes('epic') ? 'clickable' : undefined}
										onClick={() => {
											if (!formik.values.name) return
											const platform = (game.platformName || '').toLowerCase()
											if (platform.includes('steam')) {
												const q = encodeURIComponent(formik.values.name).replace(/%20/g, '+')
												const url = `https://store.steampowered.com/search/?term=${q}`
												window.open(url, '_blank', 'noopener')
												return
											}
											if (platform.includes('epic')) {
												const url = `https://store.epicgames.com/es-ES/browse?q=${encodeURIComponent(formik.values.name)}&sortBy=relevancy&sortDir=DESC&count=40`
												window.open(url, '_blank', 'noopener')
											}
										}}>
										{t('game.details.fieldPlatform')}
									</h3>
									<EditableSelect
										value={formik.values.platformId}
										displayValue={game.platformName}
										options={platformOptions}
										onSave={(value) => saveField('platformId', value)}
										placeholder={t('game.details.selectPlatform')}
									/>
								</div>
								<div className='game-details-content-infoList-item'>
									<h3>{t('game.details.fieldPlayed')}</h3>
									<EditableSelect
										value={formik.values.playedStatusId}
										displayValue={game.playedStatusName}
										options={playedStatusOptions}
										onSave={(value) => saveField('playedStatusId', value)}
										placeholder={t('game.details.selectPlayed')}
									/>
								</div>
								<div className='game-details-content-infoList-item'>
									<h3>{t('game.details.fieldStarted')}</h3>
									<EditableField
										value={formik.values.started}
										type='date'
										onSave={(value) => saveField('started', value)}
										placeholder={t('game.details.placeholderStarted')}
										formatter={(val) => formatToLocaleDate(val as string)}
									/>
								</div>
								<div className='game-details-content-infoList-item'>
									<h3>{t('game.details.fieldFinished')}</h3>
									<EditableField
										value={formik.values.finished}
										type='date'
										onSave={(value) => saveField('finished', value)}
										placeholder={t('game.details.placeholderFinished')}
										formatter={(val) => formatToLocaleDate(val as string)}
									/>
								</div>
								<div className='game-details-content-infoList-item'>
									<h3>{t('game.details.fieldGrade')}</h3>
									<EditableField value={formik.values.grade} type='number' onSave={(value) => saveField('grade', value)} placeholder={t('game.details.placeholderGrade')} />
								</div>
								<div className='game-details-content-infoList-item'>
									<h3>{t('game.details.fieldPlayWith')}</h3>
									<EditableMultiSelect
										values={formik.values.playWithIds}
										displayValues={game.playWithNames || []}
										options={playWithOptions}
										onSave={(values) => saveField('playWithIds', values)}
										placeholder={t('game.details.selectPlayWith')}
									/>
								</div>
								<div className='game-details-content-infoList-item'>
									<h3
										className='clickable'
										onClick={() => {
											searchGoogleImage(formik.values.name, 'logo')
										}}>
										{t('game.details.fieldLogo')}
										{game.steamAppId && (
											<button
												className='steam-img-refresh'
												onClick={(e) => {
													e.stopPropagation()
													void refreshSteamLogo()
												}}
												disabled={steamImgLoading !== null}
												aria-label={t('game.details.refreshSteamLogo')}
												title={t('game.details.refreshSteamLogo')}>
												↺
											</button>
										)}
									</h3>
									<EditableField value={formik.values.logo} type='text' onSave={(value) => saveField('logo', value)} placeholder={t('game.details.placeholderLogo')} />
								</div>

								<div className='game-details-content-infoList-item'>
									<h3
										className='clickable'
										onClick={() => {
											searchGoogleImage(formik.values.name, 'cover')
										}}>
										{t('game.details.fieldCover')}
										{game.steamAppId && (
											<button
												className='steam-img-refresh'
												onClick={(e) => {
													e.stopPropagation()
													void refreshSteamCover()
												}}
												disabled={steamImgLoading !== null}
												aria-label={t('game.details.refreshSteamCover')}
												title={t('game.details.refreshSteamCover')}>
												↺
											</button>
										)}
									</h3>
									<EditableField value={formik.values.cover} type='text' onSave={(value) => saveField('cover', value)} placeholder={t('game.details.placeholderCover')} />
								</div>

								<div className='game-details-content-infoList-item'>
									<h3>{t('game.details.fieldCheaper')}</h3>
									<EditableSelect
										value={formik.values.isCheaperByKey === true ? 1 : formik.values.isCheaperByKey === false ? 2 : undefined}
										displayValue={
											formik.values.isCheaperByKey === true ? t('game.details.cheaperKey') : formik.values.isCheaperByKey === false ? t('game.details.cheaperStore') : undefined
										}
										options={priceComparisonOptions}
										onSave={async (value) => {
											if (value === undefined) {
												await saveField('isCheaperByKey', undefined)
												// Clear key store URL if setting to undefined
												if (formik.values.keyStoreUrl) {
													await saveField('keyStoreUrl', '')
												}
											} else {
												await saveField('isCheaperByKey', value === 1)
											}
										}}
										placeholder={t('game.details.selectCheaper')}
									/>
								</div>

								{formik.values.isCheaperByKey !== undefined && (
									<div className='game-details-content-infoList-item'>
										<h3>{t('game.details.fieldKeyUrl')}</h3>
										<EditableField
											value={formik.values.keyStoreUrl}
											type='text'
											onSave={(value) => saveField('keyStoreUrl', value)}
											placeholder={t('game.details.placeholderKeyUrl')}
										/>
									</div>
								)}
							</div>

							<div className='game-details-content-comment'>
								<h3>{t('game.details.fieldComment')}</h3>
								<EditableField
									value={formik.values.comment}
									type='textarea'
									onSave={(value) => saveField('comment', value)}
									placeholder={t('game.details.placeholderComment')}
									className='comment-field'
								/>
							</div>

							<div className='game-details-content-infoList'>
								<div className='game-details-content-infoList-item'>
									<h3>{t('game.details.fieldSteamAppId')}</h3>
									<div className='game-details-steam-id'>
										<EditableField
											value={formik.values.steamAppId?.toString() ?? ''}
											type='text'
											onSave={(value) => {
												const next = value ? parseInt(value as string, 10) : null
												saveField('steamAppId', next)
												if (next != null) setSteamIdLocked(true)
											}}
											placeholder={t('game.details.placeholderSteamAppId')}
											allowEditing={!steamIdLocked}
										/>
										{formik.values.steamAppId != null && (
											<button
												type='button'
												className='game-details-steam-id__lock'
												onClick={() => setSteamIdLocked((locked) => !locked)}
												aria-label={steamIdLocked ? t('game.details.unlockSteamId') : t('game.details.lockSteamId')}
												title={steamIdLocked ? t('game.details.unlockSteamId') : t('game.details.lockSteamId')}>
												{steamIdLocked ? <LockIcon width={16} height={16} /> : <UnlockIcon width={16} height={16} />}
											</button>
										)}
									</div>
								</div>
								<div className='game-details-content-infoList-item game-details-content-infoList-item--checkbox'>
									<h3>{t('game.details.manuallyCompleted')}</h3>
									<label className='game-details-toggle' title={t('game.details.manuallyCompletedTitle')}>
										<input type='checkbox' checked={formik.values.isManuallyCompleted ?? false} onChange={(e) => saveField('isManuallyCompleted', e.target.checked)} />
										<span className='game-details-toggle__label'>{t('game.details.manuallyCompletedLabel')}</span>
									</label>
								</div>
								<div className='game-details-content-infoList-item'>
									<h3 title={t('game.details.manualPlaytimeTitle')}>{t('game.details.manualPlaytime')}</h3>
									<EditableField
										value={minutesToHoursValue(formik.values.manualPlaytimeMinutes)}
										type='number'
										onSave={(value) => saveField('manualPlaytimeMinutes', hoursToMinutesValue(value))}
										placeholder={t('game.details.manualPlaytimePlaceholder')}
										formatter={(value) => formatPlaytime(hoursToMinutesValue(value ?? '')) || t('game.details.manualPlaytimePlaceholder')}
									/>
								</div>
							</div>
						</>
					)}
					{activeTab === 'replays' && <GameReplaysTab gameId={game.id} />}
					{activeTab === 'history' && <GameHistoryTab gameId={game.id} />}
					{activeTab === 'steam' && game.steamAppId && <SteamTab game={game} />}
				</div>
			</div>

			<Toast isOpen={toast !== null} message={toast?.message ?? ''} type={toast?.type} onClose={() => setToast(null)} />
		</div>
	)
}
