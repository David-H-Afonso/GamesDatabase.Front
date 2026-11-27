import { memo, useState, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Game } from '@/models/api/Game'
import { useAppSelector } from '@/store/hooks'
import { GameArtwork } from '@/components/Collection/GameArtwork'
import { GameTitle } from '@/components/Collection/GameTitle'
import { CollectionIcon } from '@/components/Collection/CollectionIcon'
import { SampleBadge } from '@/components/Collection/SampleBadge'
import { formatToLocaleDate, getMetacriticColor, isGameCompleted, completionLabelKey, isGameFullyCompleted } from '@/utils'
import { effectivePlaytime, formatCollectionNumber, playtimeSourceKey } from '@/utils/collectionFormatting'
import { getCriticScoreUrl, resolveEffectiveProvider, type CriticProvider } from '@/helpers/criticScoreHelper'
import './CardView.scss'
import { CollectionMenu } from '@/components/Collection/CollectionMenu'

interface CardViewProps {
	game: Game
	openDetails: (game: Game) => void
	onAutoFill?: () => void
	onFieldUpdate?: (gameId: number, field: string, value: number | number[] | boolean | undefined) => Promise<void>
	playWithColors: (string | undefined)[]
	gameStatusColor: string | undefined
	platformColor: string | undefined
	isSelected?: boolean
	onSelect?: (gameId: number, isSelected: boolean) => void
	deselectAll?: () => void
	index?: number
	playlistControls?: ReactNode
	hideSelection?: boolean
}

const CardView = ({ game, openDetails, onAutoFill, onFieldUpdate, gameStatusColor, isSelected = false, onSelect, index, playlistControls, hideSelection }: CardViewProps) => {
	const { t, i18n } = useTranslation(), [saving, setSaving] = useState(false), [error, setError] = useState(false)
	const statuses = useAppSelector(state => state.gameStatus.activeStatuses)
	const platforms = useAppSelector(state => state.gamePlatform.platforms.length ? state.gamePlatform.platforms : state.gamePlatform.activePlatforms)
	const playWith = useAppSelector(state => state.gamePlayWith.playWithOptions)
	const user = useAppSelector(state => state.auth.user)
	const minutes = effectivePlaytime(game)
	const hours = (value: number | null | undefined) => value == null ? '—' : `${formatCollectionNumber(value, i18n.language)} h`
	const provider = resolveEffectiveProvider(game.criticProvider as CriticProvider | undefined, (user?.scoreProvider ?? 'Metacritic') as CriticProvider)
	const keyStoreUrl = game.keyStoreUrl && /^https?:\/\//i.test(game.keyStoreUrl) ? game.keyStoreUrl : undefined
	const update = async (field: string, value: number | number[] | boolean | undefined) => {
		if (saving || !onFieldUpdate) return
		setSaving(true); setError(false)
		try { await onFieldUpdate(game.id, field, value) } catch { setError(true) } finally { setSaving(false) }
	}
	return <article className={`game-card-view-container ${isSelected ? 'is-selected' : ''}`} aria-label={game.name}>
		<div className='game-card-header'>
			<GameTitle name={game.name} tooltip='hold' className='gdb-card-art gdb-image-open' ariaLabel={t('gallery.home.openGame', { name: game.name })} onOpen={() => openDetails(game)}><GameArtwork game={game} role='hero' className='game-card-cover' eager={index != null && index < 4} /><span className='gdb-art-hover'>{t('gallery.detail.open')}<CollectionIcon name='arrow' /></span></GameTitle>
			{!hideSelection && <input type='checkbox' checked={isSelected} onChange={event => onSelect?.(game.id, event.target.checked)} className='game-card-view-container__checkbox' aria-label={t('game.card.selectGame', { name: game.name })} />}
			<button type='button' className={`game-card-favorite-toggle ${game.favorite ? 'is-active' : ''}`} aria-pressed={game.favorite} aria-label={t(game.favorite ? 'game.card.removeFavorite' : 'game.card.markFavorite')} disabled={saving} onClick={() => { void update('favorite', !game.favorite) }}><CollectionIcon name='star' /></button>
			{game.platformName?.trim() && <span className='gdb-card-platform'>{game.platformName}</span>}
			{isGameCompleted(game) && <span className='game-card-perfect-badge gdb-completion-badge' data-completion={isGameFullyCompleted(game) ? 'full' : 'completed'}>{t(completionLabelKey(game))}</span>}
			{playlistControls}
		</div>
		<div className='gdb-card-caption'>
			<h3 className='game-card-title'><GameTitle name={game.name} onOpen={() => openDetails(game)} /></h3>
			<div className='gdb-card-meta'><span className='gdb-card-status' style={{ '--gdb-status-color': gameStatusColor } as CSSProperties}><i />{game.statusName}</span><SampleBadge game={game} />{game.grade != null && <span className='game-card-score--grade'><small>{t('gallery.library.rowGrade')}</small><b>{game.grade}</b><small>/100</small></span>}</div>
			<div className='gdb-card-times'><span title={t(playtimeSourceKey(game))}><CollectionIcon name='clock' />{hours(minutes == null ? null : minutes / 60)} <small>{t('gallery.labels.played')}</small></span><span>{hours(game.story)} <small>{t('gallery.labels.story')}</small></span></div>
			<CollectionMenu label={t('gallery.detail.gameOptions')} className='gdb-card-tools' panelClassName='gdb-card-tools-panel'>{close => <>
				{onAutoFill && <button type='button' className='gdb-text-button' onClick={() => { close(); onAutoFill() }}><CollectionIcon name='auto' />{t('metadata.action')}</button>}
				{error && <p className='gdb-error' role='alert'>{t('gallery.common.saveError')}</p>}
				<div className='gdb-card-facts'><div className='game-card-score' role='group' aria-label={game.score != null ? t('game.card.scoreDisplay', { score: game.score }) : t('game.card.scoreEmpty')}><CollectionIcon name='statistics' /><span className='game-card-score-value'>{game.score == null ? '' : `${game.score} / 10`}</span></div>{game.critic != null && <button type='button' onClick={() => window.open(getCriticScoreUrl(game.name, provider), '_blank', 'noopener,noreferrer')} title={t('game.card.searchOn', { provider })} style={user?.useScoreColors ? { color: getMetacriticColor(game.critic) } : undefined}>{provider} · {game.critic}/100</button>}<span>{t('game.details.fieldCompletion')}: {hours(game.completion)}</span><span>{formatToLocaleDate(game.released) || t('game.card.na')}</span></div>
				<label>{t('game.details.fieldStatus')}<select value={game.statusId} disabled={saving} onChange={event => { void update('statusId', Number(event.target.value)) }}>{!statuses.some(value => value.id === game.statusId) && <option value={game.statusId}>{game.statusName}</option>}{statuses.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></label>
				<label>{t('game.details.fieldPlatform')}<select value={game.platformId ?? ''} disabled={saving} onChange={event => { void update('platformId', event.target.value ? Number(event.target.value) : undefined) }}><option value=''>{t('game.card.na')}</option>{platforms.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></label>
				<fieldset><legend>{t('game.details.fieldPlayWith')}</legend>{playWith.map(value => <label key={value.id}><input type='checkbox' checked={game.playWithIds?.includes(value.id) ?? false} disabled={saving} onChange={event => { void update('playWithIds', event.target.checked ? [...(game.playWithIds ?? []), value.id] : (game.playWithIds ?? []).filter(id => id !== value.id)) }} />{value.name}</label>)}</fieldset>
				{user?.showPriceComparisonIcon && game.isCheaperByKey != null && <span>{t(game.isCheaperByKey ? 'game.card.cheaperByKey' : 'game.card.cheaperInStore')}{keyStoreUrl && <a href={keyStoreUrl} target='_blank' rel='noopener noreferrer'>{t('game.details.fieldKeyUrl')}</a>}</span>}
			</>}</CollectionMenu>
		</div>
	</article>
}

export default memo(CardView)
