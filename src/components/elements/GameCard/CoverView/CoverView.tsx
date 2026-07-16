import type { Game } from '@/models/api/Game'
import type { CSSProperties, MouseEvent } from 'react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/store/hooks'
import OptimizedImage from '../../OptimizedImage/OptimizedImage'
import './CoverView.scss'

interface CoverViewProps {
	game: Game
	openDetails: (game: Game) => void
	isSelected?: boolean
	onSelect?: (gameId: number, isSelected: boolean) => void
	index?: number
	gameStatusColor?: string
	playWithColors?: (string | undefined)[]
	onFieldUpdate?: (gameId: number, field: string, value: number | number[] | boolean | undefined) => Promise<void>
}

const CoverView = ({ game, openDetails, isSelected = false, onSelect, index = 0, gameStatusColor, playWithColors = [], onFieldUpdate }: CoverViewProps) => {
	const { t } = useTranslation()
	const isPriority = index < 8
	const hasPerfectCompletion = game.completion === 100 || Boolean(game.steamAchievementsUnlocked && game.steamAchievementsUnlocked === game.steamAchievementsTotal)
	const [coverFailed, setCoverFailed] = useState(false)
	const [activeEditor, setActiveEditor] = useState<'status' | 'playWith' | null>(null)
	const { activeStatuses: statusOptions } = useAppSelector((state) => state.gameStatus)
	const { playWithOptions } = useAppSelector((state) => state.gamePlayWith)
	const artSrc = coverFailed ? game.hero : game.cover || game.hero
	const visiblePlayWith = game.playWithNames?.slice(0, 2) ?? []
	const extraPlayWithCount = Math.max(0, (game.playWithNames?.length ?? 0) - visiblePlayWith.length)

	useEffect(() => {
		setCoverFailed(false)
	}, [game.cover])

	const updatePlayWith = (optionId: number, checked: boolean) => {
		const current = game.playWithIds ?? []
		const next = checked ? Array.from(new Set([...current, optionId])) : current.filter((id) => id !== optionId)
		void onFieldUpdate?.(game.id, 'playWithIds', next)
	}

	const toggleFavorite = (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault()
		event.stopPropagation()
		void onFieldUpdate?.(game.id, 'favorite', !game.favorite)
	}

	return (
		<article className={`game-cover-view ${isSelected ? 'is-selected' : ''}`} onClick={() => openDetails(game)} onMouseLeave={() => setActiveEditor(null)}>
			<label className='game-cover-view__select' onClick={(event) => event.stopPropagation()}>
				<input type='checkbox' checked={isSelected} onChange={(event) => onSelect?.(game.id, event.target.checked)} aria-label={`Select ${game.name}`} />
			</label>

			<div className='game-cover-view__art-frame'>
				<button
					type='button'
					className={'game-cover-view__favorite' + (game.favorite ? ' is-active' : '')}
					onClick={toggleFavorite}
					aria-pressed={game.favorite}
					aria-label={game.favorite ? t('game.card.removeFavorite') : t('game.card.markFavorite')}
					title={game.favorite ? t('game.card.removeFavorite') : t('game.card.markFavorite')}
					disabled={!onFieldUpdate}>
					{game.favorite ? '★' : '☆'}
				</button>
				{artSrc ? (
					<OptimizedImage
						src={artSrc}
						alt={`${game.name} cover art`}
						className='game-cover-view__art'
						quality='medium'
						loading={isPriority ? 'eager' : 'lazy'}
						fetchPriority={isPriority ? 'high' : undefined}
						width={300}
						height={450}
						onError={() => {
							if (artSrc === game.cover && game.hero) setCoverFailed(true)
						}}
					/>
				) : null}
				<div className='game-cover-view__spine' />
				<div className='game-cover-view__shine' />
				{(game.statusName || visiblePlayWith.length > 0) && (
					<div className='game-cover-view__hover-info' onClick={(event) => event.stopPropagation()}>
						{game.statusName && (
							<button
								type='button'
								className='game-cover-view__hover-chip game-cover-view__hover-chip--status'
								style={{ '--cover-chip-color': gameStatusColor || '#7c3aed' } as CSSProperties}
								onClick={() => setActiveEditor(activeEditor === 'status' ? null : 'status')}>
								{game.statusName}
							</button>
						)}
						{visiblePlayWith.length > 0 && (
							<div className='game-cover-view__hover-playwith'>
								{visiblePlayWith.map((name, chipIndex) => (
									<button
										type='button'
										key={name}
										className='game-cover-view__hover-chip'
										style={{ '--cover-chip-color': playWithColors[chipIndex] || '#6b7280' } as CSSProperties}
										onClick={() => setActiveEditor(activeEditor === 'playWith' ? null : 'playWith')}>
										{name}
									</button>
								))}
								{extraPlayWithCount > 0 && (
									<button type='button' className='game-cover-view__hover-chip game-cover-view__hover-chip--more' onClick={() => setActiveEditor(activeEditor === 'playWith' ? null : 'playWith')}>
										+{extraPlayWithCount}
									</button>
								)}
							</div>
						)}
						{activeEditor === 'status' && (
							<div className='game-cover-view__quick-editor'>
								{statusOptions.map((status) => (
									<button key={status.id} type='button' className={status.id === game.statusId ? 'is-active' : ''} onClick={() => void onFieldUpdate?.(game.id, 'statusId', status.id)}>
										{status.name}
									</button>
								))}
							</div>
						)}
						{activeEditor === 'playWith' && (
							<div className='game-cover-view__quick-editor game-cover-view__quick-editor--checks'>
								{playWithOptions.map((option) => (
									<label key={option.id}>
										<input type='checkbox' checked={game.playWithIds?.includes(option.id) ?? false} onChange={(event) => updatePlayWith(option.id, event.target.checked)} />
										<span>{option.name}</span>
									</label>
								))}
							</div>
						)}
					</div>
				)}
				{hasPerfectCompletion && <span className='game-cover-view__badge'>100%</span>}
			</div>

			<footer className='game-cover-view__meta'>
				<h3 title={game.name}>{game.name}</h3>
				{game.platformName && <span title={game.platformName}>{game.platformName}</span>}
			</footer>
		</article>
	)
}

export default CoverView
