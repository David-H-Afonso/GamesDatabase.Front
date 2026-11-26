import { useId, useRef, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Game } from '@/models/api/Game'
import { CollectionIcon } from './CollectionIcon'
import { GameArtwork } from './GameArtwork'
import { SampleBadge } from './SampleBadge'
import { effectivePlaytime } from '@/utils/collectionFormatting'
import './PlayingNowSpotlight.scss'

interface Props {
	title: string
	items: Game[]
	total: number
	selectedId?: number
	onSelect: (id: number) => void
	onOpen: (game: Game) => void
	onViewAll: () => void
	formatTime: (game: Game) => string
}

export const PlayingNowSpotlight = ({ title, items, total, selectedId, onSelect, onOpen, onViewAll, formatTime }: Props) => {
	const { t } = useTranslation(), id = useId(), controls = useRef<Array<HTMLButtonElement | null>>([])
	const selected = items.find(game => game.id === selectedId) ?? items[0]
	if (!selected) return null
	const browse = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
		const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : ['ArrowRight', 'ArrowDown'].includes(event.key) ? (index + 1) % items.length : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? (index - 1 + items.length) % items.length : null
		if (next === null) return
		event.preventDefault()
		controls.current[next]?.focus({ preventScroll: true })
		controls.current[next]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
	}
	return <section className='gdb-home-playing' aria-labelledby={`${id}-heading`}>
		<div className='gdb-section-heading'><h2 id={`${id}-heading`}>{title}</h2><button type='button' className='gdb-text-button' onClick={onViewAll}>{t('gallery.common.games', { count: total })}<CollectionIcon name='arrow' /></button></div>
		<div className={`gdb-playing-layout${items.length === 1 ? ' is-single' : ''}`}><article className='gdb-home-spotlight' id={`${id}-preview`}>
			<button type='button' className='gdb-home-spotlight__art' onClick={() => onOpen(selected)} aria-label={t('gallery.home.openGame', { name: selected.name })}><GameArtwork game={selected} role='hero' eager /></button>
			<div className='gdb-home-spotlight__shade' />
			<div className='gdb-home-spotlight__content'><p>{selected.platformName}{selected.platformName && selected.statusName && <span aria-hidden='true'>/</span>}{selected.statusName}</p><h3>{selected.name}</h3><SampleBadge game={selected} />
				<div className='gdb-home-playing__details'><span>{effectivePlaytime(selected) == null ? formatTime(selected) : t('gallery.home.played', { value: formatTime(selected) })}</span>{(selected.steamAchievementsTotal ?? 0) > 0 && <span>{t('gallery.home.achievements', { unlocked: selected.steamAchievementsUnlocked ?? 0, total: selected.steamAchievementsTotal })}</span>}</div>
				<button type='button' className='gdb-button gdb-button--primary' onClick={() => onOpen(selected)}>{t('gallery.detail.open')}<CollectionIcon name='arrow' /></button>
				{items.length > 1 && <label className='gdb-playing-picker__mobile'>{t('gallery.discovery.choosePlaying')}<select value={selected.id} onChange={event => onSelect(Number(event.target.value))}>{items.map(game => <option key={game.id} value={game.id}>{game.name}</option>)}</select></label>}
			</div>
		</article>
		{items.length > 1 && <aside className='gdb-playing-list'>
			<p className='sr-only' id={`${id}-keys`}>{t('gallery.discovery.playingKeys')}</p>
			<div className={`gdb-playing-list__games${items.length <= 6 ? ' is-complete' : ''}`} role='group' aria-label={t('gallery.discovery.choosePlaying')} aria-describedby={`${id}-keys`}>{items.map((game, index) => {
				return <button type='button' key={game.id} ref={element => { controls.current[index] = element }} className='gdb-playing-list__game' tabIndex={game.id === selected.id ? 0 : -1} aria-pressed={game.id === selected.id} aria-controls={`${id}-preview`} aria-label={t('gallery.home.selectGame', { name: game.name })} onClick={() => onSelect(game.id)} onKeyDown={event => browse(event, index)}>
					<span className='gdb-playing-list__cover'><GameArtwork game={game} role='cover' width={100} decorative /></span><span className='gdb-playing-list__label'><b>{game.name}</b><span className='gdb-playing-list__meta'><small>{game.platformName}</small><SampleBadge game={game} /></span></span>
				</button>
			})}</div>
		</aside>}
		</div>
	</section>
}
