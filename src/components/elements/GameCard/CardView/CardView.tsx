import type { Game } from '@/models/api/Game'
import { useState, memo, type FC } from 'react'
import './CardView.scss'
import { formatToLocaleDate, useClickOutside, getMetacriticColor } from '@/utils'
import { EditableSelect } from '../../EditableSelect/EditableSelect'
import { EditableMultiSelect } from '../../EditableMultiSelect/EditableMultiSelect'
import { OptimizedImage } from '@/components/elements'
import { useAppSelector } from '@/store/hooks'
import CalendarIcon from '@/assets/svgs/calendar.svg?react'
import ScoreIcon from '@/assets/svgs/score.svg?react'
import CriticIcon from '@/assets/svgs/critic.svg?react'
import OpenCriticIcon from '@/assets/svgs/opencritic.svg?react'
import SteamDBIcon from '@/assets/svgs/steamdb.svg?react'
import {
	getCriticScoreUrl,
	resolveEffectiveProvider,
	type CriticProvider,
} from '@/helpers/criticScoreHelper'

interface CardViewProps {
	game: Game
	openDetails: (game: Game) => void
	onFieldUpdate?: (
		gameId: number,
		field: string,
		value: number | number[] | undefined
	) => Promise<void>
	playWithColors: (string | undefined)[]
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
		playWithColors,
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

	// Get user preferences
	const useScoreColors = useAppSelector((state) => state.auth.user?.useScoreColors ?? false)
	const userScoreProvider = useAppSelector(
		(state) => state.auth.user?.scoreProvider ?? 'Metacritic'
	) as CriticProvider

	const released = formatToLocaleDate(game.released)

	// Use per-game provider if set, otherwise fall back to user preference
	const effectiveProvider = resolveEffectiveProvider(
		game.criticProvider as CriticProvider | undefined,
		userScoreProvider
	)

	// Get critic score color if enabled
	const criticScoreColor =
		useScoreColors && game.critic != null ? getMetacriticColor(game.critic) : '#f9fafb'

	// Select icon based on effective provider
	const ScoreProviderIcon =
		effectiveProvider === 'OpenCritic'
			? OpenCriticIcon
			: effectiveProvider === 'SteamDB'
			? SteamDBIcon
			: CriticIcon

	const handleCriticScoreClick = (e: React.MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()
		const url = getCriticScoreUrl(game.name, effectiveProvider)
		window.open(url, '_blank', 'noopener,noreferrer')
	}

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

	const handleFieldUpdate = async (field: string, value: number | number[] | undefined) => {
		if (onFieldUpdate) {
			await onFieldUpdate(game.id, field, value)
		}
		setActiveSelector(null)
	}

	// Helper para formatear múltiples nombres
	const formatMultipleNames = (names: string[] | undefined): string => {
		if (!names || names.length === 0) return 'N/A'
		if (names.length === 1) return names[0]
		return `${names[0]} +${names.length - 1}`
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
						<OptimizedImage
							src={game.cover}
							alt={`${game.name} cover`}
							className='game-card-cover'
							quality='medium'
							loading='lazy'
						/>
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
								<span
									className='game-card-score'
									onClick={handleCriticScoreClick}
									style={{ cursor: 'pointer' }}
									title={`Click to search on ${effectiveProvider}`}>
									<ScoreProviderIcon
										width={13}
										height={13}
										color={criticScoreColor === '#f9fafb' ? '#9ca3af' : criticScoreColor}
										title={`${effectiveProvider} icon`}
										focusable={false}
									/>
									<span style={{ fontFamily: 'monospace', color: criticScoreColor }}>
										{game.critic ?? 'N/A'}
									</span>
								</span>
							)}
						</div>
					</div>
					<div className='game-card-header-info'>
						<div className='game-card-header-info-logo'>
							{game.logo && (
								<OptimizedImage
									src={game.logo}
									alt={`${game.name} logo`}
									className='game-card-logo'
									quality='low'
									loading='lazy'
								/>
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
								{game.playWithNames && game.playWithNames.length > 0 && (
									<div className='game-card-tag-container'>
										<span
											title={game.playWithNames.join(', ')}
											className='game-card-tag game-card-tag--clickable'
											style={{
												backgroundColor: `${playWithColors[0] || '#333'}44`,
												borderColor: `${playWithColors[0] || '#333'}99`,
											}}
											onClick={(e) => handleBadgeClick(e, 'playWith')}>
											{formatMultipleNames(game.playWithNames)}
										</span>
										{activeSelector === 'playWith' && (
											<div className='game-card-tag-selector' ref={playWithRef}>
												<EditableMultiSelect
													values={game.playWithIds || []}
													displayValues={game.playWithNames || []}
													options={playWithOptions}
													onSave={(values) => handleFieldUpdate('playWithIds', values)}
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
							<p className='game-card-duration-label'>Story</p>
							<p className='game-card-duration-value'>{game.story ? `${game.story}h` : 'N/A'}</p>
						</div>
						<div className='game-card-duration-item'>
							<p className='game-card-duration-label'>100%</p>
							<p className='game-card-duration-value'>
								{game.completion ? `${game.completion}h` : 'N/A'}
							</p>
						</div>
					</div>
					<div className='game-card-metadata' role='group' aria-label='Game metadata'>
						<div
							className='game-card-score'
							role='group'
							aria-label={`Score: ${game.score ?? 'N/A'} / 10`}>
							<ScoreIcon
								width={20}
								height={20}
								color='#9ca3af'
								title='Score icon'
								focusable={false}
							/>
							<div className='game-card-score-value'>
								<p>{game.score ?? 'N/A'} / 10</p>
							</div>
						</div>
						<div
							className='game-card-release-date'
							role='group'
							aria-label={`Released: ${released}`}>
							<CalendarIcon
								width={20}
								height={20}
								color='#9ca3af'
								title='Released icon'
								focusable={false}
							/>
							<p>{released}</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

// Memoize CardView to prevent unnecessary re-renders
export default memo(CardView, (prevProps, nextProps) => {
	return (
		prevProps.game.id === nextProps.game.id &&
		prevProps.game.updatedAt === nextProps.game.updatedAt &&
		prevProps.isSelected === nextProps.isSelected
	)
})
