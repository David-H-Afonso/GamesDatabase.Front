import React, { useState } from 'react'
import type { Game } from '@/models/api/Game'
import './GameDetails.scss'
import { formatToLocaleDate, useClickOutside } from '@/utils'
import DeleteIcon from '@/assets/svgs/trashbin.svg?react'
import { EditableField, OptimizedImage } from '@/components/elements'
import { EditableSelect } from '../EditableSelect/EditableSelect'
import { EditableMultiSelect } from '../EditableMultiSelect/EditableMultiSelect'
import { useGames } from '@/hooks'
import { useAppSelector } from '@/store/hooks'
import { useFormik } from 'formik'
import {
	getCriticScoreUrl,
	getCriticProviderIdFromName,
	getCriticProviderNameFromId,
	resolveEffectiveProvider,
	type CriticProvider,
} from '@/helpers/criticScoreHelper'
import { store } from '@/store'

interface GameDetailsProps {
	game: Game
	closeDetails: () => void
	onDelete?: (game: Game) => void
}

export const GameDetails: React.FC<GameDetailsProps> = (props) => {
	const { game, closeDetails, onDelete } = props
	const [isClosing, setIsClosing] = useState(false)
	const { updateGameById } = useGames()

	// Get options for selectable fields
	const { activeStatuses: statusOptions } = useAppSelector((state) => state.gameStatus)
	const { platforms: platformOptions } = useAppSelector((state) => state.gamePlatform)
	const { playedStatuses: playedStatusOptions } = useAppSelector((state) => state.gamePlayedStatus)
	const { playWithOptions } = useAppSelector((state) => state.gamePlayWith)

	// Options for price comparison (Where's Key)
	const priceComparisonOptions = [
		{ id: 1, name: 'Key', color: undefined },
		{ id: 2, name: 'Store', color: undefined },
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
		},
		enableReinitialize: true,
		validate: (values) => {
			const errors: Record<string, string> = {}
			const clampNumber = (v: any) =>
				v === '' || v === null || typeof v === 'undefined' ? undefined : Number(v)
			const critic = clampNumber(values.critic)
			const grade = clampNumber(values.grade)
			if (typeof critic !== 'undefined' && (isNaN(critic) || critic < 0 || critic > 100)) {
				errors.critic = 'Critic must be a number between 0 and 100'
			}
			if (typeof grade !== 'undefined' && (isNaN(grade) || grade < 0 || grade > 100)) {
				errors.grade = 'Grade must be a number between 0 and 100'
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
		if (
			field === 'critic' ||
			field === 'grade' ||
			field === 'story' ||
			field === 'completion' ||
			field === 'score'
		) {
			if (value === '' || value === null || typeof value === 'undefined') {
				payloadValue = null
				formik.setFieldValue(field as any, undefined)
			} else {
				const n = Number(value)
				if (isNaN(n)) {
					formik.setFieldError(field, 'Must be a number')
					return
				}
				// clamp for critic and grade
				if (field === 'critic' || field === 'grade') {
					const clamped = Math.min(100, Math.max(0, Math.round(n)))
					payloadValue = clamped
					formik.setFieldValue(field as any, clamped)
				} else {
					payloadValue = n
					formik.setFieldValue(field as any, n)
				}
			}
		}
		// Handle optional string fields (can be cleared)
		else if (
			field === 'logo' ||
			field === 'cover' ||
			field === 'comment' ||
			field === 'keyStoreUrl' ||
			field === 'released' ||
			field === 'started' ||
			field === 'finished'
		) {
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
				formik.setFieldError(field, 'Name is required')
				return
			}
			payloadValue = value
			formik.setFieldValue(field as any, value)
		}
		// Handle required ID fields (cannot be empty/null)
		else if (field === 'statusId') {
			if (value === null || typeof value === 'undefined') {
				formik.setFieldError(field, 'Status is required')
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
		// Handle other fields (playWithIds, etc.)
		else {
			payloadValue = value
			formik.setFieldValue(field as any, value)
		}

		// Persist to backend
		try {
			await updateGameById(game.id, { [field]: payloadValue } as any)
		} catch (err) {
			console.error(`Error saving ${field}:`, err)
			// restore original value from prop if needed
			formik.setFieldValue(field as any, (game as any)[field])
		}
	}

	return (
		<div ref={panelRef} className={`game-details ${isClosing ? 'closing' : ''}`}>
			<div className='game-details-header'>
				<div className='game-details-header-actions'>
					<button className='game-details-header-actions-delete' onClick={() => onDelete?.(game)}>
						<DeleteIcon width={20} height={20} color='#ef4444' />
					</button>
					<button onClick={handleClose}>✕</button>
				</div>
				<div className='game-details-header-title'>
					{game.logo ? (
						<div
							onClick={() => {
								if (!game.name) return
								const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
									'"' + game.name + '" logo'
								)}`
								window.open(url, '_blank', 'noopener')
							}}
							style={{ cursor: game.name ? 'pointer' : 'default' }}>
							<OptimizedImage
								src={game.logo}
								alt={`${game.name} logo`}
								className='game-details__logo'
								quality='high'
								loading='eager'
							/>
						</div>
					) : null}
					<div>
						<EditableField
							value={formik.values.name}
							type='text'
							onSave={(value) => saveField('name', value)}
							placeholder='No name'
							allowEmpty={false}
						/>
					</div>
				</div>
			</div>

			<div className='game-details-content'>
				<div className='game-details-content-cover'>
					{game.cover && (
						<div
							onClick={() => {
								if (!game.name) return
								const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
									'"' + game.name + '" cover'
								)}`
								window.open(url, '_blank', 'noopener')
							}}
							style={{ cursor: game.name ? 'pointer' : 'default' }}>
							<OptimizedImage
								src={game.cover}
								alt={`${game.name} cover`}
								className='game-details__cover'
								quality='high'
								loading='eager'
							/>
						</div>
					)}
				</div>
				<div className='game-details-content-infoList'>
					<div className='game-details-content-infoList-item'>
						<h4>Status</h4>
						<EditableSelect
							value={formik.values.statusId}
							displayValue={game.statusName}
							options={statusOptions}
							onSave={(value) => saveField('statusId', value)}
							placeholder='Select status'
						/>
					</div>
					<div className='game-details-content-infoList-item'>
						<h4>Released</h4>
						<EditableField
							value={formik.values.released}
							type='date'
							onSave={(value) => saveField('released', value)}
							placeholder='No release date'
							formatter={(val) => formatToLocaleDate(val as string)}
						/>
					</div>
					<div className='game-details-content-infoList-item'>
						<h4
							className='clickable'
							onClick={() => {
								if (!game.name) return
								const userProvider = (store.getState().auth.user?.scoreProvider ??
									'Metacritic') as CriticProvider
								const provider = resolveEffectiveProvider(
									game.criticProvider as CriticProvider | undefined,
									userProvider
								)
								const url = getCriticScoreUrl(game.name, provider)
								window.open(url, '_blank', 'noopener')
							}}>
							Critic Score
						</h4>
						<EditableField
							value={formik.values.critic}
							type='number'
							onSave={(value) => saveField('critic', value)}
							placeholder='No score'
						/>
					</div>
					<div className='game-details-content-infoList-item'>
						<h4>Critic Logo</h4>
						<EditableSelect
							value={getCriticProviderIdFromName(formik.values.criticProvider)}
							displayValue={formik.values.criticProvider ?? 'Default'}
							options={[
								{ id: 0, name: 'Default', color: undefined },
								{ id: 1, name: 'Metacritic', color: undefined },
								{ id: 2, name: 'OpenCritic', color: undefined },
								{ id: 3, name: 'SteamDB', color: undefined },
							]}
							onSave={async (value) => {
								if (value === 0 || value === undefined) {
									await saveField('criticProvider', null)
								} else {
									const provider = getCriticProviderNameFromId(value)
									await saveField('criticProvider', provider)
								}
							}}
							placeholder='Use default'
						/>
					</div>
					<div className='game-details-content-infoList-item'>
						<h4
							className='clickable'
							onClick={() => {
								if (!game.name) return
								const url = `https://howlongtobeat.com/?q=${encodeURIComponent(game.name)}`
								window.open(url, '_blank', 'noopener')
							}}>
							Story
						</h4>
						<EditableField
							value={formik.values.story}
							type='number'
							onSave={(value) => saveField('story', value)}
							placeholder='0h'
							formatter={(val) => `${val || 0}h`}
						/>
					</div>
					<div className='game-details-content-infoList-item'>
						<h4
							className='clickable'
							onClick={() => {
								if (!game.name) return
								const url = `https://howlongtobeat.com/?q=${encodeURIComponent(game.name)}`
								window.open(url, '_blank', 'noopener')
							}}>
							Completion
						</h4>
						<EditableField
							value={formik.values.completion}
							type='number'
							onSave={(value) => saveField('completion', value)}
							placeholder='0h'
							formatter={(val) => `${val || 0}h`}
						/>
					</div>
					<div className='game-details-content-infoList-item'>
						<h4>Score</h4>
						<EditableField
							value={formik.values.score}
							type='number'
							onSave={(value) => saveField('score', value)}
							placeholder='No score'
							allowEditing={false}
						/>
					</div>
					<div className='game-details-content-infoList-item'>
						<h4
							className={
								(game.platformName || '').toLowerCase().includes('steam') ||
								(game.platformName || '').toLowerCase().includes('epic')
									? 'clickable'
									: undefined
							}
							onClick={() => {
								if (!game.name) return
								const platform = (game.platformName || '').toLowerCase()
								if (platform.includes('steam')) {
									const q = encodeURIComponent(game.name).replace(/%20/g, '+')
									const url = `https://store.steampowered.com/search/?term=${q}`
									window.open(url, '_blank', 'noopener')
									return
								}
								if (platform.includes('epic')) {
									const url = `https://store.epicgames.com/es-ES/browse?q=${encodeURIComponent(
										game.name
									)}&sortBy=relevancy&sortDir=DESC&count=40`
									window.open(url, '_blank', 'noopener')
								}
							}}>
							Platform
						</h4>
						<EditableSelect
							value={formik.values.platformId}
							displayValue={game.platformName}
							options={platformOptions}
							onSave={(value) => saveField('platformId', value)}
							placeholder='Select platform'
						/>
					</div>
					<div className='game-details-content-infoList-item'>
						<h4>Played</h4>
						<EditableSelect
							value={formik.values.playedStatusId}
							displayValue={game.playedStatusName}
							options={playedStatusOptions}
							onSave={(value) => saveField('playedStatusId', value)}
							placeholder='Select status'
						/>
					</div>
					<div className='game-details-content-infoList-item'>
						<h4>Started</h4>
						<EditableField
							value={formik.values.started}
							type='date'
							onSave={(value) => saveField('started', value)}
							placeholder='Not started'
							formatter={(val) => formatToLocaleDate(val as string)}
						/>
					</div>
					<div className='game-details-content-infoList-item'>
						<h4>Finished</h4>
						<EditableField
							value={formik.values.finished}
							type='date'
							onSave={(value) => saveField('finished', value)}
							placeholder='Not finished'
							formatter={(val) => formatToLocaleDate(val as string)}
						/>
					</div>
					<div className='game-details-content-infoList-item'>
						<h4>Grade</h4>
						<EditableField
							value={formik.values.grade}
							type='number'
							onSave={(value) => saveField('grade', value)}
							placeholder='No grade'
						/>
					</div>
					<div className='game-details-content-infoList-item'>
						<h4>Play With</h4>
						<EditableMultiSelect
							values={formik.values.playWithIds}
							displayValues={game.playWithNames || []}
							options={playWithOptions}
							onSave={(values) => saveField('playWithIds', values)}
							placeholder='Select options'
						/>
					</div>
					<div className='game-details-content-infoList-item'>
						<h4
							className='clickable'
							onClick={() => {
								if (!game.name) return
								const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
									'"' + game.name + '" logo'
								)}`
								window.open(url, '_blank', 'noopener')
							}}>
							Logo
						</h4>
						<EditableField
							value={formik.values.logo}
							type='text'
							onSave={(value) => saveField('logo', value)}
							placeholder='Enter logo URL (optional)'
						/>
					</div>

					<div className='game-details-content-infoList-item'>
						<h4
							className='clickable'
							onClick={() => {
								if (!game.name) return
								const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
									'"' + game.name + '" cover'
								)}`
								window.open(url, '_blank', 'noopener')
							}}>
							Cover
						</h4>
						<EditableField
							value={formik.values.cover}
							type='text'
							onSave={(value) => saveField('cover', value)}
							placeholder='Enter cover URL (optional)'
						/>
					</div>

					<div className='game-details-content-infoList-item'>
						<h4>Cheaper</h4>
						<EditableSelect
							value={
								formik.values.isCheaperByKey === true
									? 1
									: formik.values.isCheaperByKey === false
									? 2
									: undefined
							}
							displayValue={
								formik.values.isCheaperByKey === true
									? 'Key'
									: formik.values.isCheaperByKey === false
									? 'Store'
									: undefined
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
							placeholder='Not set'
						/>
					</div>

					{formik.values.isCheaperByKey !== undefined && (
						<div className='game-details-content-infoList-item'>
							<h4>Key URL</h4>
							<EditableField
								value={formik.values.keyStoreUrl}
								type='text'
								onSave={(value) => saveField('keyStoreUrl', value)}
								placeholder='Enter key store URL (optional)'
							/>
						</div>
					)}
				</div>

				<div className='game-details-content-comment'>
					<h3>Comment</h3>
					<EditableField
						value={formik.values.comment}
						type='textarea'
						onSave={(value) => saveField('comment', value)}
						placeholder='Add a comment...'
						className='comment-field'
					/>
				</div>
			</div>
		</div>
	)
}
