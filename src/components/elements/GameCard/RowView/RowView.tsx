import type { Game } from '@/models/api/Game'
import { useState, useRef, useEffect, memo, type FC } from 'react'
import { useTranslation } from 'react-i18next'
import './RowView.scss'
import './GalleryRow.scss'
import { formatToLocaleDate, useClickOutside, getMetacriticColor, isGameCompleted, isGameFullyCompleted, completionLabelKey, completionTitleKey } from '@/utils'
import { EditableSelect } from '../../EditableSelect/EditableSelect'
import { EditableMultiSelect } from '../../EditableMultiSelect/EditableMultiSelect'
import { OptimizedImage } from '@/components/elements'
import { useAppSelector } from '@/store/hooks'
import PortalDropdown from '../../PortalDropdown'
import { getCriticScoreUrl, resolveEffectiveProvider, type CriticProvider } from '@/helpers/criticScoreHelper'
import { GameArtwork } from '@/components/Collection/GameArtwork'
import { GameTitle } from '@/components/Collection/GameTitle'
import { CollectionIcon } from '@/components/Collection/CollectionIcon'
import { SampleBadge } from '@/components/Collection/SampleBadge'
import { effectivePlaytime, formatCollectionNumber } from '@/utils/collectionFormatting'

interface RowViewProps {
	game: Game
	openDetails: (game: Game) => void
	onAutoFill?: () => void
	onFieldUpdate?: (gameId: number, field: string, value: number | number[] | boolean | undefined) => Promise<void>
	playWithColors: (string | undefined)[]
	gameStatusColor: string | undefined
	platformColor: string | undefined
	playedStatusColor: string | undefined
	isSelected?: boolean
	onSelect?: (gameId: number, isSelected: boolean) => void
	deselectAll?: () => void
	index?: number
	expanded?: boolean
	hideSelection?: boolean
}

const RowView: FC<RowViewProps> = (props) => {
	const isPriority = props.index !== undefined && props.index < 4
	const { game, openDetails, onAutoFill, playWithColors, gameStatusColor, platformColor, playedStatusColor, onFieldUpdate, isSelected = false, onSelect, deselectAll } = props
	const { t, i18n } = useTranslation()
	const [activeSelector, setActiveSelector] = useState<'status' | 'platform' | 'playWith' | 'playStatus' | null>(null)
	const [logoFailed, setLogoFailed] = useState(false)

	useEffect(() => {
		setLogoFailed(false)
	}, [game.logo])

	// opciones de selects
	const { activeStatuses: statusOptions } = useAppSelector((state) => state.gameStatus)
	const { platforms, activePlatforms } = useAppSelector((state) => state.gamePlatform)
	const platformOptions = platforms.length > 0 ? platforms : activePlatforms
	const { playWithOptions } = useAppSelector((state) => state.gamePlayWith)
	const { playedStatuses: playedStatusOptions } = useAppSelector((state) => state.gamePlayedStatus)

	// Get user preferences
	const useScoreColors = useAppSelector((state) => state.auth.user?.useScoreColors ?? false)
	const userScoreProvider = useAppSelector((state) => state.auth.user?.scoreProvider ?? 'Metacritic') as CriticProvider

	// Use per-game provider if set, otherwise fall back to user preference
	const effectiveProvider = resolveEffectiveProvider(game.criticProvider as CriticProvider | undefined, userScoreProvider)

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
		if (activeSelector === 'platform') setPlatformPortalStyle(computePortalStyle(platformBtnRef.current))
		if (activeSelector === 'playStatus') setPlayedPortalStyle(computePortalStyle(playedBtnRef.current))
		if (activeSelector === 'playWith') setPlayWithPortalStyle(computePortalStyle(playWithBtnRef.current))
	}, [activeSelector])

	const closeActionMenu = (cb: () => void) => {
		deselectAll?.()
		cb()
	}

	const handleBadgeClick = (e: React.MouseEvent, type: 'status' | 'platform' | 'playWith' | 'playStatus') => {
		e.preventDefault()
		e.stopPropagation()
		setActiveSelector((prev) => (prev === type ? null : type))
	}

	const handleFieldUpdate = async (field: string, value: number | number[] | boolean | undefined) => {
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
	const storyText = game.story == null ? dash : `${formatCollectionNumber(game.story, i18n.language)}h`
	const completionText = game.completion == null ? dash : `${formatCollectionNumber(game.completion, i18n.language)}h`
	const scoreText = game.score ?? dash

	// Get critic score color if enabled
	const criticScoreColor = useScoreColors && game.critic != null ? getMetacriticColor(game.critic) : 'var(--gdb-text, #f9fafb)'
	const releasedText = formatToLocaleDate(game.released) || dash
	const startedText = formatToLocaleDate(game.started) || dash
	const finishedText = formatToLocaleDate(game.finished) || dash
	const hasLogo = Boolean(game.logo) && !logoFailed
	const isPerfectCompletion = isGameCompleted(game)

	// Helper para formatear múltiples nombres
	const formatMultipleNames = (names: string[] | undefined): string => {
		if (!names || names.length === 0) return t('game.card.na')
		if (names.length === 1) return names[0]
		return `${names[0]} +${names.length - 1}`
	}

	const options = onAutoFill && <details className='gdb-row-tools' onClick={event => event.stopPropagation()} onKeyDown={event => {
		if (event.key === 'Escape' && event.currentTarget.open) { event.preventDefault(); event.stopPropagation(); event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus() }
	}}><summary aria-label={t('gallery.detail.gameOptions')}><CollectionIcon name='more' /></summary><div>
		<button type='button' className='gdb-text-button' onClick={event => {
			const menu = event.currentTarget.closest('details'); if (menu) { menu.open = false; menu.querySelector('summary')?.focus() }; onAutoFill()
		}}><CollectionIcon name='auto' />{t('metadata.action')}</button>
		<button type='button' className='gdb-text-button' onClick={() => openDetails(game)}>{t('gallery.detail.open')}<CollectionIcon name='arrow' /></button>
	</div></details>

	if (props.expanded === false) {
		const minutes = effectivePlaytime(game)
		return <article className={`gdb-game-row ${isSelected ? 'is-selected' : ''}`} aria-label={game.name}>
			{!props.hideSelection && <input type='checkbox' checked={isSelected} onChange={handleCheckboxChange} aria-label={t('game.card.selectGame', { name: game.name })} />}
			<GameTitle name={game.name} tooltip='hold' ariaLabel={t('gallery.home.openGame', { name: game.name })} className='gdb-game-row__art' onOpen={() => openDetails(game)}><GameArtwork game={game} width={90} eager={isPriority} /></GameTitle>
			<div className='gdb-game-row__name'><div className='gdb-game-row__title'><h3><GameTitle name={game.name} onOpen={() => openDetails(game)} /></h3><button type='button' className={`gdb-icon-button gdb-game-row__favorite ${game.favorite ? 'is-active' : ''}`} aria-pressed={game.favorite} aria-label={t(game.favorite ? 'game.card.removeFavorite' : 'game.card.markFavorite')} onClick={() => { void handleFieldUpdate('favorite', !game.favorite) }}><CollectionIcon name='star' /></button></div><div className='gdb-game-row__meta'><span>{game.platformName}</span><span className='gdb-game-row__status'><i style={{ background: gameStatusColor }} />{game.statusName}</span><SampleBadge game={game} />{isPerfectCompletion && <span className='gdb-row-completion' data-completion={isGameFullyCompleted(game) ? 'full' : 'completed'}>{t(completionLabelKey(game))}</span>}</div></div>
			<div className='gdb-game-row__duration'><strong>{game.story == null ? '—' : `${formatCollectionNumber(game.story, i18n.language)} h`}</strong><small>{t('gallery.detail.story')}</small></div>
			<div className='gdb-game-row__time'><strong>{minutes == null ? '—' : `${formatCollectionNumber(minutes / 60, i18n.language)} h`}</strong><small>{t('gallery.home.played', { value: '' }).trim()}</small></div>
			<div className='gdb-game-row__grade'><span className='sr-only'>{t('gallery.library.rowGrade')} </span><strong>{gradeText}</strong>{game.grade != null && <small>/100</small>}</div>
			<div className='gdb-game-row__critic'><span className='sr-only'>{t('home.columns.critic')} </span><strong>{game.critic ?? '—'}</strong>{game.critic != null && <small>/100</small>}</div>
			<div className='gdb-game-row__score'><span className='sr-only'>{t('home.columns.score')} </span><strong>{game.score == null ? '—' : formatCollectionNumber(game.score, i18n.language, 2)}</strong>{game.score != null && <small>/10</small>}</div>
			{options || <button type='button' className='gdb-icon-button gdb-game-row__open' aria-label={t('gallery.home.openGame', { name: game.name })} onClick={() => openDetails(game)}><CollectionIcon name='arrow' /></button>}
		</article>
	}
	return (
		<div
			key={game.id}
			className={`game-row ${activeSelector ? 'game-row--menu-open' : ''} ${isSelected ? 'game-row--selected' : ''} ${isPerfectCompletion ? 'game-row--steam-complete' : ''}`}
			title={isPerfectCompletion ? t(completionTitleKey(game)) : undefined}
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
				{!props.hideSelection && <input
					type='checkbox'
					checked={isSelected}
					onChange={handleCheckboxChange}
					className='game-row-checkbox'
					aria-label={t('game.card.selectRow')}
					style={{ opacity: isSelected ? 1 : 0, transition: 'opacity .2s ease' }}
				/>}
			</div>

			{/* STATUS */}
			<div className='game-row-status' onClick={(e) => e.stopPropagation()}>
				<div>
					<span
						className='badge'
						title={game.statusName || t('game.card.noStatus')}
						style={{ backgroundColor: `${gameStatusColor}2e`, borderColor: `${gameStatusColor}99` }}
						onClick={(e) => handleBadgeClick(e, 'status')}
						ref={statusBtnRef}>
						{game.statusName ?? t('game.card.na')}
					</span>

					{activeSelector === 'status' && (
						<PortalDropdown style={statusPortalStyle} contentRef={statusRef} onClick={(e) => e.stopPropagation()}>
							<div className='chip-dropdown'>
								<EditableSelect
									value={game.statusId}
									displayValue={game.statusName}
									options={statusOptions}
									onSave={(value) => handleFieldUpdate('statusId', value)}
									placeholder={t('game.details.selectStatus')}
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
						alt={t('game.card.logoAlt', { name: game.name })}
						className='game-row-logo'
						quality='low'
						loading={isPriority ? 'eager' : 'lazy'}
						fetchPriority={isPriority ? 'high' : undefined}
						onError={() => setLogoFailed(true)}
						width={32}
						height={32}
					/>
				)}
				<h3 title={game.name}>{game.name}</h3>
				<SampleBadge game={game} />
				{options}
				{isPerfectCompletion && <span className='game-row-perfect-badge' data-completion={isGameFullyCompleted(game) ? 'full' : 'completed'}>{t(completionLabelKey(game))}</span>}
			</div>

			{/* Grade */}
			<div className='game-row-grade'>
				<div aria-label={t('game.details.fieldGrade')} title={`${t('game.details.fieldGrade')}: ${gradeText}`}>
					<span>{gradeText}{game.grade != null && <small> /100</small>}</span>
				</div>
			</div>

			{/* Critic */}
			<div className='game-row-critic'>
				<div
					aria-label={t('game.details.fieldCriticScore')}
					title={t('game.card.searchOn', { provider: effectiveProvider })}
					onClick={handleCriticScoreClick}
					style={{ cursor: 'pointer' }}>
					<span style={{ color: criticScoreColor, fontWeight: useScoreColors ? 600 : 'normal' }}>{criticText}{game.critic != null && <small> /100</small>}</span>
				</div>
			</div>

			{/* Story */}
			<div className='game-row-story' aria-label={t('game.details.fieldStory')} title={`${t('game.details.fieldStory')}: ${storyText}`}>
				<span>{storyText}</span>
			</div>

			{/* Completion */}
			<div className='game-row-completion' aria-label={t('game.details.fieldCompletion')} title={`${t('game.details.fieldCompletion')}: ${completionText}`}>
				<span>{completionText}</span>
			</div>

			{/* Score */}
			<div className='game-row-score' aria-label={t('game.details.fieldScore')} title={`${t('game.details.fieldScore')}: ${scoreText}`}>
				<span>{scoreText}{game.score != null && <small> /10</small>}</span>
			</div>

			{/* Platform */}
			<div className='game-row-platform' onClick={(e) => e.stopPropagation()}>
				<div>
					<span
						className='badge'
						title={game.platformName}
						style={{ backgroundColor: `${platformColor}2e`, borderColor: `${platformColor}99` }}
						onClick={(e) => handleBadgeClick(e, 'platform')}
						ref={platformBtnRef}>
						{game.platformName ?? t('game.card.na')}
					</span>
					{activeSelector === 'platform' && (
						<PortalDropdown style={platformPortalStyle} contentRef={platformRef}>
							<div className='chip-dropdown' onClick={(e) => e.stopPropagation()}>
								<EditableSelect
									value={game.platformId}
									displayValue={game.platformName}
									options={platformOptions}
									onSave={(value) => handleFieldUpdate('platformId', value)}
									placeholder={t('game.details.selectPlatform')}
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
							backgroundColor: `${playedStatusColor}2e`,
							borderColor: `${playedStatusColor}99`,
						}}
						onClick={(e) => handleBadgeClick(e, 'playStatus')}
						ref={playedBtnRef}>
						{game.playedStatusName ?? t('game.card.na')}
					</span>
					{activeSelector === 'playStatus' && (
						<PortalDropdown style={playedPortalStyle} contentRef={playStatusRef}>
							<div className='chip-dropdown' onClick={(e) => e.stopPropagation()}>
								<EditableSelect
									value={game.playedStatusId}
									displayValue={game.playedStatusName}
									options={playedStatusOptions}
									onSave={(value) => handleFieldUpdate('playedStatusId', value)}
									placeholder={t('game.details.selectStatus')}
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
							backgroundColor: `${playWithColors[0] || '#333'}2e`,
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
									placeholder={t('game.details.selectStatus')}
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
export default memo(RowView)
