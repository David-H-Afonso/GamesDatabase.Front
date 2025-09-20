import type { Game } from '@/models/api/Game'
import { useState, type FC } from 'react'
import './CardView.scss'
import { formatToLocaleDate, useClickOutside } from '@/utils'
import { EditableSelect } from '../../EditableSelect/EditableSelect'
import { useAppSelector } from '@/store/hooks'

interface CardViewProps {
	game: Game
	openDetails: (game: Game) => void
	onFieldUpdate?: (gameId: number, field: string, value: number | undefined) => Promise<void>
	playWithColor: string | undefined
	gameStatusColor: string | undefined
	platformColor: string | undefined
	isSelected?: boolean
	onSelect?: (gameId: number, isSelected: boolean) => void
	deselectAll?: () => void
}

const CardView: FC<CardViewProps> = (props) => {
	const {
		game,
		openDetails,
		playWithColor,
		gameStatusColor,
		platformColor,
		onFieldUpdate,
		isSelected = false,
		onSelect,
		deselectAll,
	} = props
	const [activeSelector, setActiveSelector] = useState<'status' | 'platform' | 'playWith' | null>(
		null
	)

	// Get options for selectable fields
	const { activeStatuses: statusOptions } = useAppSelector((state) => state.gameStatus)
	const { platforms: platformOptions } = useAppSelector((state) => state.gamePlatform)
	const { playWithOptions } = useAppSelector((state) => state.gamePlayWith)

	const menuRef = useClickOutside<HTMLDivElement>(() => {
		setActiveSelector(null)
	})

	const statusRef = useClickOutside<HTMLDivElement>(() => {
		setActiveSelector(null)
	})
	const platformRef = useClickOutside<HTMLDivElement>(() => {
		setActiveSelector(null)
	})
	const playWithRef = useClickOutside<HTMLDivElement>(() => {
		setActiveSelector(null)
	})

	const closeActionMenu = (callback: () => void) => {
		deselectAll?.()
		callback()
	}

	const handleBadgeClick = (
		e: React.MouseEvent,
		selectorType: 'status' | 'platform' | 'playWith'
	) => {
		e.preventDefault()
		e.stopPropagation()
		setActiveSelector(activeSelector === selectorType ? null : selectorType)
	}

	const handleFieldUpdate = async (field: string, value: number | undefined) => {
		if (onFieldUpdate) {
			await onFieldUpdate(game.id, field, value)
		}
		setActiveSelector(null)
	}

	const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		e.stopPropagation()
		e.preventDefault()
		if (onSelect) {
			onSelect(game.id, e.target.checked)
		}
	}

	return (
		<div
			key={game.id}
			className={`game-card-view-container ${activeSelector ? 'is-open' : ''}`}
			onClick={() => closeActionMenu(() => openDetails(game))}
			ref={menuRef}
			onMouseEnter={(e) => {
				const checkbox = e.currentTarget.querySelector(
					'.game-card-view-container__checkbox'
				) as HTMLInputElement
				if (checkbox) checkbox.style.opacity = '1'
			}}
			onMouseLeave={(e) => {
				const checkbox = e.currentTarget.querySelector(
					'.game-card-view-container__checkbox'
				) as HTMLInputElement
				if (checkbox && !isSelected) checkbox.style.opacity = '0'
			}}>
			<div className='game-card-view-container-hideOverflow'>
				<div className='game-card-header'>
					{game.cover && (
						<img src={game.cover} alt={`${game.name} cover`} className='game-card-cover' />
					)}
					<div className='game-card-header-score'>
						<input
							type='checkbox'
							checked={isSelected}
							onClick={(e) => e.stopPropagation()}
							onChange={(e) => handleCheckboxChange(e)}
							className='game-card-view-container__checkbox'
							style={{
								opacity: isSelected ? 1 : 0,
								transition: 'opacity 0.2s ease-in-out',
							}}
						/>
						<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
							<span className='game-card-score'>{game.grade ?? 'N/A'}</span>
							{game.critic != null && !isNaN(game.critic) && (
								<span className='game-card-score'>
									<span style={{ color: '#ccc', fontWeight: 'normal' }}>Critic: </span>
									<span style={{ fontFamily: 'monospace' }}>{game.critic ?? 'N/A'}</span>
								</span>
							)}
						</div>
					</div>
					<div className='game-card-header-info'>
						<div className='game-card-header-info-logo'>
							{game.logo && (
								<img src={game.logo} alt={`${game.name} logo`} className='game-card-logo' />
							)}
						</div>
						<div className='game-card-header-info-tags'>
							<h3 className='game-card-title'>{game.name}</h3>
							<div className='game-card-tags' ref={statusRef} onClick={(e) => e.stopPropagation()}>
								<div className='game-card-tag-container'>
									<span
										title={game.statusName || 'No status'}
										className='game-card-tag game-card-tag--clickable'
										style={{
											backgroundColor: `${gameStatusColor}44`,
											borderColor: `${gameStatusColor}99`,
										}}
										onClick={(e) => handleBadgeClick(e, 'status')}>
										{game.statusName}
									</span>
									{activeSelector === 'status' && (
										<div className='game-card-tag-selector'>
											<EditableSelect
												value={game.statusId}
												displayValue={game.statusName}
												options={statusOptions}
												onSave={(value) => handleFieldUpdate('statusId', value)}
												placeholder='Select status'
												dropdownOnly
											/>
										</div>
									)}
								</div>
								{game.platformName && (
									<div className='game-card-tag-container'>
										<span
											title={game.platformName || 'No platform'}
											className='game-card-tag game-card-tag--clickable'
											style={{
												backgroundColor: `${platformColor}44`,
												borderColor: `${platformColor}99`,
											}}
											onClick={(e) => handleBadgeClick(e, 'platform')}>
											{game.platformName}
										</span>
										{activeSelector === 'platform' && (
											<div className='game-card-tag-selector' ref={platformRef}>
												<EditableSelect
													value={game.platformId}
													displayValue={game.platformName}
													options={platformOptions}
													onSave={(value) => handleFieldUpdate('platformId', value)}
													placeholder='Select platform'
													dropdownOnly
												/>
											</div>
										)}
									</div>
								)}
								{game.playWithName && (
									<div className='game-card-tag-container'>
										<span
											title={game.playWithName || 'No play with'}
											className='game-card-tag game-card-tag--clickable'
											style={{
												backgroundColor: `${playWithColor}44`,
												borderColor: `${playWithColor}99`,
											}}
											onClick={(e) => handleBadgeClick(e, 'playWith')}>
											{game.playWithName}
										</span>
										{activeSelector === 'playWith' && (
											<div className='game-card-tag-selector' ref={playWithRef}>
												<EditableSelect
													value={game.playWithId}
													displayValue={game.playWithName}
													options={playWithOptions}
													onSave={(value) => handleFieldUpdate('playWithId', value)}
													placeholder='Select play with'
													dropdownOnly
												/>
											</div>
										)}
									</div>
								)}
							</div>
						</div>
					</div>
				</div>

				<div className='game-card-body'>
					<div className='game-card-duration'>
						<div className='game-card-duration-item'>
							<p className='game-card-duration-label'>Story: </p>
							<p className='game-card-duration-value'>{game.story ? `${game.story}h` : 'N/A'}</p>
						</div>
						<div className='game-card-duration-item'>
							<p className='game-card-duration-label'>100%: </p>
							<p className='game-card-duration-value'>
								{game.completion ? `${game.completion}h` : 'N/A'}
							</p>
						</div>
					</div>
					<div className='game-card-metadata'>
						<div className='game-card-score'>
							<p>Score</p>
							<div className='game-card-score-value'>
								<p>{game.score ?? 'N/A'} / 10</p>
							</div>
						</div>
						<div className='game-card-release-date'>
							<p>Released: {formatToLocaleDate(game.released)}</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default CardView
