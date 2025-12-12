import type { Game } from '@/models/api/Game'
import { useState, useRef, useEffect, memo, type FC } from 'react'
import './RowView.scss'
import { formatToLocaleDate, useClickOutside, getMetacriticColor } from '@/utils'
import { EditableSelect } from '../../EditableSelect/EditableSelect'
import { EditableMultiSelect } from '../../EditableMultiSelect/EditableMultiSelect'
import { OptimizedImage } from '@/components/elements'
import { useAppSelector } from '@/store/hooks'
import PortalDropdown from '../../PortalDropdown'
import {
	getCriticScoreUrl,
	resolveEffectiveProvider,
	type CriticProvider,
} from '@/helpers/criticScoreHelper'

interface RowViewProps {
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
	playedStatusColor: string | undefined
	isSelected?: boolean
	onSelect?: (gameId: number, isSelected: boolean) => void
	deselectAll?: () => void
}

const RowView: FC<RowViewProps> = (props) => {
	const {
		game,
		openDetails,
		playWithColors,
		gameStatusColor,
		platformColor,
		playedStatusColor,
		onFieldUpdate,
		isSelected = false,
		onSelect,
		deselectAll,
	} = props

	const [activeSelector, setActiveSelector] = useState<
		'status' | 'platform' | 'playWith' | 'playStatus' | null
	>(null)

	// opciones de selects
	const { activeStatuses: statusOptions } = useAppSelector((state) => state.gameStatus)
	const { platforms: platformOptions } = useAppSelector((state) => state.gamePlatform)
	const { playWithOptions } = useAppSelector((state) => state.gamePlayWith)
	const { playedStatuses: playedStatusOptions } = useAppSelector((state) => state.gamePlayedStatus)

	// Get user preferences
	const useScoreColors = useAppSelector((state) => state.auth.user?.useScoreColors ?? false)
	const userScoreProvider = useAppSelector(
		(state) => state.auth.user?.scoreProvider ?? 'Metacritic'
	) as CriticProvider

	// Use per-game provider if set, otherwise fall back to user preference
	const effectiveProvider = resolveEffectiveProvider(
		game.criticProvider as CriticProvider | undefined,
		userScoreProvider
	)

	const handleCriticScoreClick = (e: React.MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()
		const url = getCriticScoreUrl(game.name, effectiveProvider)
		window.open(url, '_blank', 'noopener,noreferrer')
	}

	const rowRef = useClickOutside<HTMLDivElement>(() => setActiveSelector(null))
	const statusRef = useClickOutside<HTMLDivElement>(() => setActiveSelector(null))
	const platformRef = useClickOutside<HTMLDivElement>(() => setActiveSelector(null))
	const playStatusRef = useClickOutside<HTMLDivElement>(() => setActiveSelector(null))
	const playWithRef = useClickOutside<HTMLDivElement>(() => setActiveSelector(null))

	// portal positioning refs & state
	const statusBtnRef = useRef<HTMLSpanElement | null>(null)
	const platformBtnRef = useRef<HTMLSpanElement | null>(null)
	const playedBtnRef = useRef<HTMLSpanElement | null>(null)
	const playWithBtnRef = useRef<HTMLSpanElement | null>(null)

	const [statusPortalStyle, setStatusPortalStyle] = useState<React.CSSProperties | undefined>()
	const [platformPortalStyle, setPlatformPortalStyle] = useState<React.CSSProperties | undefined>()
	const [playedPortalStyle, setPlayedPortalStyle] = useState<React.CSSProperties | undefined>()
	const [playWithPortalStyle, setPlayWithPortalStyle] = useState<React.CSSProperties | undefined>()

	const computePortalStyle = (btn: HTMLElement | null, gap = -5, maxHeight = 300) => {
		if (!btn) return undefined
		const rect = btn.getBoundingClientRect()
		const viewportHeight = window.innerHeight || document.documentElement.clientHeight
		const spaceBelow = viewportHeight - rect.bottom - gap
		const spaceAbove = rect.top - gap
		const placeDown = spaceBelow >= 160 || spaceBelow >= spaceAbove
		const left = rect.left + window.scrollX
		const minWidth = Math.max(160, rect.width)
		if (placeDown) {
			const allowed = Math.max(0, Math.min(maxHeight, spaceBelow))
			return {
				position: 'absolute',
				left: `${left}px`,
				top: `${rect.bottom + window.scrollY + gap}px`,
				minWidth: `${minWidth}px`,
				maxHeight: `${allowed}px`,
			} as React.CSSProperties
		}
		const allowed = Math.max(0, Math.min(maxHeight, spaceAbove))
		return {
			position: 'absolute',
			left: `${left}px`,
			top: `${rect.top + window.scrollY - gap}px`,
			minWidth: `${minWidth}px`,
			transform: 'translateY(-100%)',
			maxHeight: `${allowed}px`,
		} as React.CSSProperties
	}

	useEffect(() => {
		if (activeSelector === 'status') setStatusPortalStyle(computePortalStyle(statusBtnRef.current))
		if (activeSelector === 'platform')
			setPlatformPortalStyle(computePortalStyle(platformBtnRef.current))
		if (activeSelector === 'playStatus')
			setPlayedPortalStyle(computePortalStyle(playedBtnRef.current))
		if (activeSelector === 'playWith')
			setPlayWithPortalStyle(computePortalStyle(playWithBtnRef.current))
	}, [activeSelector])

	const closeActionMenu = (cb: () => void) => {
		deselectAll?.()
		cb()
	}

	const handleBadgeClick = (
		e: React.MouseEvent,
		type: 'status' | 'platform' | 'playWith' | 'playStatus'
	) => {
		e.preventDefault()
		e.stopPropagation()
		setActiveSelector((prev) => (prev === type ? null : type))
	}

	const handleFieldUpdate = async (field: string, value: number | number[] | undefined) => {
		if (onFieldUpdate) await onFieldUpdate(game.id, field, value)
		setActiveSelector(null)
	}

	const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		e.stopPropagation()
		e.preventDefault()
		onSelect?.(game.id, e.target.checked)
	}

	// Utilidades
	const dash = '—'
	const gradeText = game.grade ?? dash
	const criticText = game.critic ?? dash
	const storyText = game.story ? `${game.story}h` : dash
	const completionText = game.completion ? `${game.completion}h` : dash
	const scoreText = game.score ?? dash

	// Get critic score color if enabled
	const criticScoreColor =
		useScoreColors && game.critic != null ? getMetacriticColor(game.critic) : '#f9fafb'
	const releasedText = formatToLocaleDate(game.released) || dash
	const startedText = formatToLocaleDate(game.started) || dash
	const finishedText = formatToLocaleDate(game.finished) || dash
	const hasLogo = Boolean(game.logo)

	// Helper para formatear múltiples nombres
	const formatMultipleNames = (names: string[] | undefined): string => {
		if (!names || names.length === 0) return 'N/A'
		if (names.length === 1) return names[0]
		return `${names[0]} +${names.length - 1}`
	}

	return (
		<div
			key={game.id}
			className={`game-row ${activeSelector ? 'game-row--menu-open' : ''} ${
				isSelected ? 'game-row--selected' : ''
			}`}
			onClick={() => closeActionMenu(() => openDetails(game))}
			ref={rowRef}
			onMouseEnter={(e) => {
				const checkbox = e.currentTarget.querySelector('.game-row-checkbox') as HTMLInputElement
				if (checkbox) checkbox.style.opacity = '1'
			}}
			onMouseLeave={(e) => {
				const checkbox = e.currentTarget.querySelector('.game-row-checkbox') as HTMLInputElement
				if (checkbox && !isSelected) checkbox.style.opacity = '0'
			}}>
			{/* Select */}
			<div
				className='game-row-select'
				onClick={(e) => {
					e.stopPropagation()
				}}>
				<input
					type='checkbox'
					checked={isSelected}
					onChange={handleCheckboxChange}
					className='game-row-checkbox'
					aria-label='Seleccionar fila'
					style={{ opacity: isSelected ? 1 : 0, transition: 'opacity .2s ease' }}
				/>
			</div>

			{/* STATUS */}
			<div className='game-row-status' onClick={(e) => e.stopPropagation()}>
				<div>
					<span
						className='badge'
						title={game.statusName || 'No status'}
						style={{ backgroundColor: `${gameStatusColor}88`, borderColor: `${gameStatusColor}99` }}
						onClick={(e) => handleBadgeClick(e, 'status')}
						ref={statusBtnRef}>
						{game.statusName ?? 'N/A'}
					</span>

					{activeSelector === 'status' && (
						<PortalDropdown
							style={statusPortalStyle}
							contentRef={statusRef}
							onClick={(e) => e.stopPropagation()}>
							<div className='chip-dropdown'>
								<EditableSelect
									value={game.statusId}
									displayValue={game.statusName}
									options={statusOptions}
									onSave={(value) => handleFieldUpdate('statusId', value)}
									placeholder='Select status'
									dropdownOnly
								/>
							</div>
						</PortalDropdown>
					)}
				</div>
			</div>

			{/* Name */}
			<div className='game-row-name'>
				{hasLogo && (
					<OptimizedImage
						src={game.logo!}
						alt={`${game.name} logo`}
						className='game-row-logo'
						quality='low'
						loading='lazy'
					/>
				)}
				<h3>{game.name}</h3>
			</div>

			{/* Grade */}
			<div className='game-row-grade'>
				<div aria-label='Grade' title={`Grade: ${gradeText}`}>
					<span>{gradeText}</span>
				</div>
			</div>

			{/* Critic */}
			<div className='game-row-critic'>
				<div
					aria-label='Critic'
					title={`Click to search on ${effectiveProvider}`}
					onClick={handleCriticScoreClick}
					style={{ cursor: 'pointer' }}>
					<span style={{ color: criticScoreColor, fontWeight: useScoreColors ? 600 : 'normal' }}>
						{criticText}
					</span>
				</div>
			</div>

			{/* Story */}
			<div className='game-row-story' aria-label='Story' title={`Story: ${storyText}`}>
				<span>{storyText}</span>
			</div>

			{/* Completion */}
			<div
				className='game-row-completion'
				aria-label='Completion'
				title={`Completion: ${completionText}`}>
				<span>{completionText}</span>
			</div>

			{/* Score */}
			<div className='game-row-score' aria-label='Score' title={`Score: ${scoreText}`}>
				<span>{scoreText}</span>
			</div>

			{/* Platform */}
			<div className='game-row-platform' onClick={(e) => e.stopPropagation()}>
				<div>
					<span
						className='badge'
						title={game.platformName}
						style={{ backgroundColor: `${platformColor}88`, borderColor: `${platformColor}99` }}
						onClick={(e) => handleBadgeClick(e, 'platform')}
						ref={platformBtnRef}>
						{game.platformName ?? 'N/A'}
					</span>
					{activeSelector === 'platform' && (
						<PortalDropdown style={platformPortalStyle} contentRef={platformRef}>
							<div className='chip-dropdown' onClick={(e) => e.stopPropagation()}>
								<EditableSelect
									value={game.platformId}
									displayValue={game.platformName}
									options={platformOptions}
									onSave={(value) => handleFieldUpdate('platformId', value)}
									placeholder='Select platform'
									dropdownOnly
								/>
							</div>
						</PortalDropdown>
					)}
				</div>
			</div>

			{/* Released */}
			<div className='game-row-released'>{releasedText}</div>

			{/* Started */}
			<div className='game-row-started'>{startedText}</div>

			{/* Finished */}
			<div className='game-row-finished'>{finishedText}</div>

			{/* Played Status */}
			<div className='game-row-play-status' onClick={(e) => e.stopPropagation()}>
				<div>
					<span
						className='badge'
						title={game.playedStatusName}
						style={{
							backgroundColor: `${playedStatusColor}88`,
							borderColor: `${playedStatusColor}99`,
						}}
						onClick={(e) => handleBadgeClick(e, 'playStatus')}
						ref={playedBtnRef}>
						{game.playedStatusName ?? 'N/A'}
					</span>
					{activeSelector === 'playStatus' && (
						<PortalDropdown style={playedPortalStyle} contentRef={playStatusRef}>
							<div className='chip-dropdown' onClick={(e) => e.stopPropagation()}>
								<EditableSelect
									value={game.playedStatusId}
									displayValue={game.playedStatusName}
									options={playedStatusOptions}
									onSave={(value) => handleFieldUpdate('playedStatusId', value)}
									placeholder='Select'
									dropdownOnly
								/>
							</div>
						</PortalDropdown>
					)}
				</div>
			</div>

			{/* Comment */}
			<div className='game-row-comment'>
				<span>{game.comment ?? dash}</span>
			</div>

			{/* Play With */}
			<div className='game-row-play-with' onClick={(e) => e.stopPropagation()}>
				<div>
					<span
						className='badge'
						title={game.playWithNames?.join(', ')}
						style={{
							backgroundColor: `${playWithColors[0] || '#333'}88`,
							borderColor: `${playWithColors[0] || '#333'}99`,
						}}
						onClick={(e) => handleBadgeClick(e, 'playWith')}
						ref={playWithBtnRef}>
						{formatMultipleNames(game.playWithNames)}
					</span>
					{activeSelector === 'playWith' && (
						<PortalDropdown style={playWithPortalStyle} contentRef={playWithRef}>
							<div className='chip-dropdown' onClick={(e) => e.stopPropagation()}>
								<EditableMultiSelect
									values={game.playWithIds || []}
									displayValues={game.playWithNames || []}
									options={playWithOptions}
									onSave={(values) => handleFieldUpdate('playWithIds', values)}
									placeholder='Select'
									dropdownOnly
								/>
							</div>
						</PortalDropdown>
					)}
				</div>
			</div>
		</div>
	)
}

// Memoize RowView to prevent unnecessary re-renders
export default memo(RowView, (prevProps, nextProps) => {
	return (
		prevProps.game.id === nextProps.game.id &&
		prevProps.game.updatedAt === nextProps.game.updatedAt &&
		prevProps.isSelected === nextProps.isSelected
	)
})
