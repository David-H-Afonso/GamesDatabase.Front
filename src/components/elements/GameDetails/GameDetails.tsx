import React, { useState } from 'react'
import type { Game } from '@/models/api/Game'
import './GameDetails.scss'
import { formatToLocaleDate, useClickOutside } from '@/utils'
import DeleteIcon from '@/assets/svgs/trashbin.svg?react'
import { EditableField } from '@/components/elements'
import { EditableSelect } from '../EditableSelect/EditableSelect'
import { useGames } from '@/hooks'
import { useAppSelector } from '@/store/hooks'

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

	const panelRef = useClickOutside<HTMLDivElement>(() => {
		handleClose()
	})

	const handleClose = () => {
		setIsClosing(true)
		setTimeout(() => {
			closeDetails()
		}, 300) // Match the duration of the slideOut animation
	}

	const handleFieldUpdate = async (field: string, value: string | number | undefined) => {
		try {
			const payloadValue =
				value === '' || value === 0 || typeof value === 'undefined' ? null : value
			await updateGameById(game.id, { [field]: payloadValue } as any)
		} catch (error) {
			console.error(`Error updating ${field}:`, error)
			throw error
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
						<img
							src={game.logo}
							alt={`${game.name} logo`}
							className='game-details__logo'
							onClick={() => {
								if (!game.name) return
								const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
									'"' + game.name + '" logo'
									)}`
								window.open(url, '_blank', 'noopener')
							}}
							style={{ cursor: game.name ? 'pointer' : 'default' }}
						/>
					) : null}
					<div>
						<EditableField
							value={game.name}
							type='text'
							onSave={(value) => handleFieldUpdate('name', value)}
							placeholder='No name'
						/>
					</div>
				</div>
			</div>

			<div className='game-details-content'>
				<div className='game-details-content-cover'>
					{game.cover && (
						<img
							src={game.cover}
							alt={`${game.name} cover`}
							className='game-details__cover'
							onClick={() => {
								if (!game.name) return
								const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
									'"' + game.name + '" cover'
									)}`
								window.open(url, '_blank', 'noopener')
							}}
							style={{ cursor: game.name ? 'pointer' : 'default' }}
						/>
					)}
				</div>
				<div className='game-details-content-infoList'>
					<div className='game-details-content-infoList-item'>
						<h4>Status</h4>
						<EditableSelect
							value={game.statusId}
							displayValue={game.statusName}
							options={statusOptions}
							onSave={(value) => handleFieldUpdate('statusId', value)}
							placeholder='Select status'
						/>
					</div>
					<div className='game-details-content-infoList-item'>
						<h4>Released</h4>
						<EditableField
							value={game.released}
							type='date'
							onSave={(value) => handleFieldUpdate('released', value)}
							placeholder='No release date'
							formatter={(val) => formatToLocaleDate(val as string)}
						/>
					</div>
					<div className='game-details-content-infoList-item'>
						<h4>Critic Score</h4>
						<EditableField
							value={game.critic}
							type='number'
							onSave={(value) => handleFieldUpdate('critic', Number(value))}
							placeholder='No score'
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
							value={game.story}
							type='number'
							onSave={(value) => handleFieldUpdate('story', Number(value))}
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
							value={game.completion}
							type='number'
							onSave={(value) => handleFieldUpdate('completion', Number(value))}
							placeholder='0h'
							formatter={(val) => `${val || 0}h`}
						/>
					</div>
					<div className='game-details-content-infoList-item'>
						<h4>Score</h4>
						<p>{game.score}</p>
					</div>
					<div className='game-details-content-infoList-item'>
						<h4>Platform</h4>
						<EditableSelect
							value={game.platformId}
							displayValue={game.platformName}
							options={platformOptions}
							onSave={(value) => handleFieldUpdate('platformId', value)}
							placeholder='Select platform'
						/>
					</div>
					<div className='game-details-content-infoList-item'>
						<h4>Played</h4>
						<EditableSelect
							value={game.playedStatusId}
							displayValue={game.playedStatusName}
							options={playedStatusOptions}
							onSave={(value) => handleFieldUpdate('playedStatusId', value)}
							placeholder='Select status'
						/>
					</div>
					<div className='game-details-content-infoList-item'>
						<h4>Started</h4>
						<EditableField
							value={game.started}
							type='date'
							onSave={(value) => handleFieldUpdate('started', value)}
							placeholder='Not started'
							formatter={(val) => formatToLocaleDate(val as string)}
						/>
					</div>
					<div className='game-details-content-infoList-item'>
						<h4>Finished</h4>
						<EditableField
							value={game.finished}
							type='date'
							onSave={(value) => handleFieldUpdate('finished', value)}
							placeholder='Not finished'
							formatter={(val) => formatToLocaleDate(val as string)}
						/>
					</div>
					<div className='game-details-content-infoList-item'>
						<h4
							className='clickable'
							onClick={() => {
								if (!game.name) return
								const url = `https://www.metacritic.com/search/${encodeURIComponent(game.name)}/`
								window.open(url, '_blank', 'noopener')
							}}>
							Grade
						</h4>
						<EditableField
							value={game.grade}
							type='number'
							onSave={(value) => handleFieldUpdate('grade', Number(value))}
							placeholder='No grade'
						/>
					</div>
					<div className='game-details-content-infoList-item'>
						<h4>Play With</h4>
						<EditableSelect
							value={game.playWithId}
							displayValue={game.playWithName}
							options={playWithOptions}
							onSave={(value) => handleFieldUpdate('playWithId', value)}
							placeholder='Select option'
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
							value={game.logo}
							type='text'
							onSave={(value) => handleFieldUpdate('logo', value)}
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
							value={game.cover}
							type='text'
							onSave={(value) => handleFieldUpdate('cover', value)}
							placeholder='Enter cover URL (optional)'
						/>
					</div>
				</div>

				<div className='game-details-content-comment'>
					<h3>Comment</h3>
					<EditableField
						value={game.comment}
						type='textarea'
						onSave={(value) => handleFieldUpdate('comment', value)}
						placeholder='Add a comment...'
						className='comment-field'
					/>
				</div>
			</div>
		</div>
	)
}
