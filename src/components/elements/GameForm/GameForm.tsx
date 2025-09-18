import React, { useEffect, useState } from 'react'
import { useGameStatus, useGamePlatform, useGamePlayWith, useGamePlayedStatus } from '@/hooks'
import type { Game, GameCreateDto, GameUpdateDto } from '@/models/api/Game'
import './GameForm.scss'

interface GameFormProps {
	game?: Game
	onSubmit: (gameData: GameCreateDto | GameUpdateDto) => Promise<void>
	onCancel: () => void
	isLoading?: boolean
}

interface GameFormData {
	name: string
	statusId: number
	grade?: number
	critic?: number
	story?: number
	completion?: number
	platformId?: number
	playWithId?: number
	playedStatusId?: number
	released?: string
	started?: string
	finished?: string
	comment?: string
	logo?: string // Optional logo URL
	cover?: string // Optional cover image URL
}

export const GameForm: React.FC<GameFormProps> = ({
	game,
	onSubmit,
	onCancel,
	isLoading = false,
}) => {
	// Hooks for loading auxiliary entities
	const { activeStatuses, loadActiveStatuses } = useGameStatus()
	const { activePlatforms, loadActivePlatforms } = useGamePlatform()
	const { activePlayWiths, loadActivePlayWiths } = useGamePlayWith()
	const { activePlayedStatuses, loadActivePlayedStatuses } = useGamePlayedStatus()

	// Form state
	const [formData, setFormData] = useState<GameFormData>({
		name: game?.name || '',
		statusId: game?.statusId || 0,
		grade: game?.grade || undefined,
		critic: game?.critic || undefined,
		story: game?.story || undefined,
		completion: game?.completion || undefined,
		platformId: game?.platformId || game?.platformId || undefined,
		playWithId: game?.playWithId || game?.playWithId || undefined,
		playedStatusId: game?.playedStatusId || game?.playedStatusId || undefined,
		released: game?.released || undefined,
		started: game?.started || undefined,
		finished: game?.finished || undefined,
		comment: game?.comment || '',
		logo: game?.logo || '',
		cover: game?.cover || '',
	})

	const [errors, setErrors] = useState<Partial<Record<keyof GameFormData, string>>>({})

	// Load auxiliary entities on mount
	useEffect(() => {
		loadActiveStatuses()
		loadActivePlatforms()
		loadActivePlayWiths()
		loadActivePlayedStatuses()
	}, [loadActiveStatuses, loadActivePlatforms, loadActivePlayWiths, loadActivePlayedStatuses])

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
	) => {
		const { name, value } = e.target
		setFormData((prev) => ({
			...prev,
			[name]: name.includes('Id') ? (value ? parseInt(value, 10) : undefined) : value,
		}))

		// Clear error when user starts typing
		if (errors[name as keyof GameFormData]) {
			setErrors((prev) => ({
				...prev,
				[name]: undefined,
			}))
		}
	}

	const validateForm = (): boolean => {
		const newErrors: Partial<Record<keyof GameFormData, string>> = {}

		if (!formData.name.trim()) {
			newErrors.name = 'Game name is required'
		}

		if (!formData.statusId || formData.statusId === 0) {
			newErrors.statusId = 'Game status is required'
		}

		// Validate numeric fields (0-100 range)
		const validateNumericField = (field: keyof GameFormData, label: string, value?: number) => {
			if (value !== undefined && value !== null) {
				if (value < 0 || value > 100) {
					newErrors[field] = `${label} must be between 0 and 100`
				}
			}
		}

		validateNumericField('grade', 'Grade', formData.grade)
		validateNumericField('critic', 'Critic score', formData.critic)

		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!validateForm()) {
			return
		}

		try {
			const gameData = {
				name: formData.name.trim(),
				statusId: formData.statusId,
				platformId: formData.platformId,
				...(formData.grade !== undefined && { grade: formData.grade }),
				...(formData.critic !== undefined && { critic: formData.critic }),
				...(formData.story !== undefined && { story: formData.story }),
				...(formData.completion !== undefined && { completion: formData.completion }),
				// ...(formData.platformId && { platformId: formData.platformId }),
				...(formData.playWithId &&
					formData.playWithId !== 0 && { playWithId: formData.playWithId }),
				...(formData.playedStatusId &&
					formData.playedStatusId !== 0 && { playedStatusId: formData.playedStatusId }),
				...(formData.released?.trim() && { released: formData.released.trim() }),
				...(formData.started?.trim() && { started: formData.started.trim() }),
				...(formData.finished?.trim() && { finished: formData.finished.trim() }),
				...(formData.comment?.trim() && { comment: formData.comment.trim() }),
				...(formData.logo?.trim() && { logo: formData.logo.trim() }),
				...(formData.cover?.trim() && { cover: formData.cover.trim() }),
			}

			await onSubmit(gameData)
		} catch (error) {
			console.error('Error submitting game form:', error)
		}
	}

	const isEditing = !!game

	return (
		<div className='game-form'>
			<h2 className='game-form__title'>{isEditing ? 'Edit Game' : 'Add New Game'}</h2>

			<form onSubmit={handleSubmit} className='game-form__form'>
				{/* Game Name */}
				<div className='game-form__field'>
					<label htmlFor='name' className='game-form__label'>
						Game Name *
					</label>
					<input
						type='text'
						id='name'
						name='name'
						value={formData.name}
						onChange={handleInputChange}
						className={`game-form__input ${errors.name ? 'game-form__input--error' : ''}`}
						placeholder='Enter game name'
						disabled={isLoading}
					/>
					{errors.name && <span className='game-form__error'>{errors.name}</span>}
				</div>

				{/* Game Status */}
				<div className='game-form__field'>
					<label htmlFor='statusId' className='game-form__label'>
						Status *
					</label>
					<select
						id='statusId'
						name='statusId'
						value={formData.statusId}
						onChange={handleInputChange}
						className={`game-form__select ${errors.statusId ? 'game-form__select--error' : ''}`}
						disabled={isLoading}>
						<option value={0}>Select a status</option>
						{activeStatuses.map((status) => (
							<option key={status.id} value={status.id}>
								{status.name}
							</option>
						))}
					</select>
					{errors.statusId && <span className='game-form__error'>{errors.statusId}</span>}
				</div>

				{/* Score (Read-only, calculated by backend) */}
				{game?.score !== undefined && (
					<div className='game-form__field'>
						<label className='game-form__label'>Score (Auto-calculated)</label>
						<input
							type='number'
							value={game.score}
							className='game-form__input game-form__input--readonly'
							disabled
							readOnly
						/>
						<span className='game-form__help'>
							Calculated automatically based on Critic and Story scores
						</span>
					</div>
				)}

				{/* Grade (0-100) */}
				<div className='game-form__field'>
					<label htmlFor='grade' className='game-form__label'>
						Personal Grade (0-100)
					</label>
					<input
						type='number'
						id='grade'
						name='grade'
						value={formData.grade || ''}
						onChange={handleInputChange}
						className={`game-form__input ${errors.grade ? 'game-form__input--error' : ''}`}
						placeholder='Enter grade (0-100)'
						min='0'
						max='100'
						disabled={isLoading}
					/>
					{errors.grade && <span className='game-form__error'>{errors.grade}</span>}
				</div>

				{/* Critic (0-100) */}
				<div className='game-form__field'>
					<label
						htmlFor='critic'
						className='game-form__label game-form__label--clickable'
						onClick={() => {
							if (formData.name) {
								window.open(
									`https://www.metacritic.com/search/${encodeURIComponent(formData.name)}/`,
									'_blank'
								)
							}
						}}
						style={{
							color: formData.name ? 'blue' : 'inherit',
							textDecoration: formData.name ? 'underline' : 'none',
							cursor: formData.name ? 'pointer' : 'default',
						}}>
						Critic Score (0-100)
					</label>
					<input
						type='number'
						id='critic'
						name='critic'
						value={formData.critic || ''}
						onChange={handleInputChange}
						className={`game-form__input ${errors.critic ? 'game-form__input--error' : ''}`}
						placeholder='Enter critic score (0-100)'
						min='0'
						max='100'
						disabled={isLoading}
					/>
					{errors.critic && <span className='game-form__error'>{errors.critic}</span>}
					<span className='game-form__help'>Used in automatic score calculation</span>
				</div>

				{/* Story Hours */}
				<div className='game-form__field'>
					<label
						htmlFor='story'
						className='game-form__label game-form__label--clickable'
						onClick={() => {
							if (formData.name) {
								window.open(
									`https://howlongtobeat.com/?q=${encodeURIComponent(formData.name)}`,
									'_blank'
								)
							}
						}}
						style={{
							color: formData.name ? 'blue' : 'inherit',
							textDecoration: formData.name ? 'underline' : 'none',
							cursor: formData.name ? 'pointer' : 'default',
						}}>
						Story Hours
					</label>
					<input
						type='number'
						id='story'
						name='story'
						value={formData.story || ''}
						onChange={handleInputChange}
						className={`game-form__input ${errors.story ? 'game-form__input--error' : ''}`}
						placeholder='Enter story hours (e.g., 23)'
						min='0'
						disabled={isLoading}
					/>
					{errors.story && <span className='game-form__error'>{errors.story}</span>}
					<span className='game-form__help'>Time to complete the main story</span>
				</div>

				{/* Completionist Hours */}
				<div className='game-form__field'>
					<label
						htmlFor='completion'
						className='game-form__label game-form__label--clickable'
						onClick={() => {
							if (formData.name) {
								window.open(
									`https://howlongtobeat.com/?q=${encodeURIComponent(formData.name)}`,
									'_blank'
								)
							}
						}}
						style={{
							color: formData.name ? 'blue' : 'inherit',
							textDecoration: formData.name ? 'underline' : 'none',
							cursor: formData.name ? 'pointer' : 'default',
						}}>
						Completionist Hours
					</label>
					<input
						type='number'
						id='completion'
						name='completion'
						value={formData.completion || ''}
						onChange={handleInputChange}
						className={`game-form__input ${errors.completion ? 'game-form__input--error' : ''}`}
						placeholder='Enter completionist hours (e.g., 52)'
						min='0'
						disabled={isLoading}
					/>
					{errors.completion && <span className='game-form__error'>{errors.completion}</span>}
					<span className='game-form__help'>Time to complete everything in the game</span>
				</div>

				{/* Platform */}
				<div className='game-form__field'>
					<label htmlFor='platformId' className='game-form__label'>
						Platform
					</label>
					<select
						id='platformId'
						name='platformId'
						value={formData.platformId || 0}
						onChange={handleInputChange}
						className={`game-form__select ${errors.platformId ? 'game-form__select--error' : ''}`}
						disabled={isLoading}>
						<option value={0}>Select a platform</option>
						{activePlatforms.map((platform) => (
							<option key={platform.id} value={platform.id}>
								{platform.name}
							</option>
						))}
					</select>
					{errors.platformId && <span className='game-form__error'>{errors.platformId}</span>}
				</div>

				{/* Release Date */}
				<div className='game-form__field'>
					<label htmlFor='released' className='game-form__label'>
						Release Date
					</label>
					<input
						type='date'
						id='released'
						name='released'
						value={formData.released || ''}
						onChange={handleInputChange}
						className={`game-form__input ${errors.released ? 'game-form__input--error' : ''}`}
						disabled={isLoading}
					/>
					{errors.released && <span className='game-form__error'>{errors.released}</span>}
					<span className='game-form__help'>
						This could be obtained along with the data from HowLongToBeat or Metacritic
					</span>
				</div>

				{/* Started Date */}
				<div className='game-form__field'>
					<label htmlFor='started' className='game-form__label'>
						Started Date
					</label>
					<input
						type='date'
						id='started'
						name='started'
						value={formData.started || ''}
						onChange={handleInputChange}
						className={`game-form__input ${errors.started ? 'game-form__input--error' : ''}`}
						disabled={isLoading}
					/>
					{errors.started && <span className='game-form__error'>{errors.started}</span>}
				</div>

				{/* Finished Date */}
				<div className='game-form__field'>
					<label htmlFor='finished' className='game-form__label'>
						Finished Date
					</label>
					<input
						type='date'
						id='finished'
						name='finished'
						value={formData.finished || ''}
						onChange={handleInputChange}
						className={`game-form__input ${errors.finished ? 'game-form__input--error' : ''}`}
						disabled={isLoading}
					/>
					{errors.finished && <span className='game-form__error'>{errors.finished}</span>}
				</div>

				{/* Play With */}
				<div className='game-form__field'>
					<label htmlFor='playWithId' className='game-form__label'>
						Play With
					</label>
					<select
						id='playWithId'
						name='playWithId'
						value={formData.playWithId || 0}
						onChange={handleInputChange}
						className='game-form__select'
						disabled={isLoading}>
						<option value={0}>Select play with option (optional)</option>
						{activePlayWiths.map((playWith) => (
							<option key={playWith.id} value={playWith.id}>
								{playWith.name}
							</option>
						))}
					</select>
				</div>

				{/* Played Status */}
				<div className='game-form__field'>
					<label htmlFor='playedStatusId' className='game-form__label'>
						Played Status
					</label>
					<select
						id='playedStatusId'
						name='playedStatusId'
						value={formData.playedStatusId || 0}
						onChange={handleInputChange}
						className='game-form__select'
						disabled={isLoading}>
						<option value={0}>Select played status (optional)</option>
						{activePlayedStatuses.map((playedStatus) => (
							<option key={playedStatus.id} value={playedStatus.id}>
								{playedStatus.name}
							</option>
						))}
					</select>
				</div>

				{/* Comments */}
				<div className='game-form__field'>
					<label htmlFor='comment' className='game-form__label'>
						Comments
					</label>
					<textarea
						id='comment'
						name='comment'
						value={formData.comment}
						onChange={handleInputChange}
						className='game-form__textarea'
						placeholder='Add any comments about this game'
						rows={4}
						disabled={isLoading}
					/>
				</div>

				{/* Logo URL */}
				<div className='game-form__field'>
					<label
						htmlFor='logo'
						className='game-form__label game-form__label--clickable'
						onClick={() => {
							if (formData.name) {
								window.open(
									`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
										`"${formData.name}"`
									)}+icon`,
									'_blank'
								)
							}
						}}
						style={{
							color: formData.name ? 'blue' : 'inherit',
							textDecoration: formData.name ? 'underline' : 'none',
							cursor: formData.name ? 'pointer' : 'default',
						}}>
						Logo URL
					</label>
					<input
						type='url'
						id='logo'
						name='logo'
						value={formData.logo || ''}
						onChange={handleInputChange}
						className={`game-form__input ${errors.logo ? 'game-form__input--error' : ''}`}
						placeholder='Enter logo URL (optional)'
						disabled={isLoading}
					/>
					{errors.logo && <span className='game-form__error'>{errors.logo}</span>}
				</div>

				{/* Cover URL */}
				<div className='game-form__field'>
					<label
						htmlFor='cover'
						className='game-form__label game-form__label--clickable'
						onClick={() => {
							if (formData.name) {
								window.open(
									`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
										`"${formData.name}"`
									)}+cover`,
									'_blank'
								)
							}
						}}
						style={{
							color: formData.name ? 'blue' : 'inherit',
							textDecoration: formData.name ? 'underline' : 'none',
							cursor: formData.name ? 'pointer' : 'default',
						}}>
						Cover URL
					</label>
					<input
						type='url'
						id='cover'
						name='cover'
						value={formData.cover || ''}
						onChange={handleInputChange}
						className={`game-form__input ${errors.cover ? 'game-form__input--error' : ''}`}
						placeholder='Enter cover URL (optional)'
						disabled={isLoading}
					/>
					{errors.cover && <span className='game-form__error'>{errors.cover}</span>}
				</div>

				{/* Form Actions */}
				<div className='game-form__actions'>
					<button
						type='button'
						className='game-form__button game-form__button--secondary'
						onClick={onCancel}
						disabled={isLoading}>
						Cancel
					</button>
					<button
						type='submit'
						className='game-form__button game-form__button--primary'
						disabled={isLoading}>
						{isLoading ? 'Saving...' : isEditing ? 'Update Game' : 'Add Game'}
					</button>
				</div>
			</form>
		</div>
	)
}
