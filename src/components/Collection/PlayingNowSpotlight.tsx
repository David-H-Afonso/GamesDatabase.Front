import { useId, useRef, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Game } from '@/models/api/Game'
import { CollectionIcon } from './CollectionIcon'
import { GameArtwork } from './GameArtwork'
import { SampleBadge } from './SampleBadge'
import { effectivePlaytime } from '@/utils/collectionFormatting'
import { usePlayingRotation } from '@/hooks/usePlayingRotation'
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
	const region = useRef<HTMLElement>(null), pointerPause = useRef<boolean | null>(null)
	const rotation = usePlayingRotation(region, items.map(game => game.id), selected?.id, onSelect)
	if (!selected) return null
	const select = (id: number) => { rotation.pause(); onSelect(id) }
	const open = () => { rotation.pause(); onOpen(selected) }
	const browse = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
		const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : ['ArrowRight', 'ArrowDown'].includes(event.key) ? (index + 1) % items.length : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? (index - 1 + items.length) % items.length : null
		if (next === null) return
		event.preventDefault()
		controls.current[next]?.focus({ preventScroll: true })
		controls.current[next]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
	}
	return <section ref={region} className='gdb-home-playing' aria-labelledby={`${id}-heading`} data-rotation-paused={rotation.paused} data-rotation-running={rotation.running} onFocusCapture={rotation.pause} onPointerEnter={event => { if (event.pointerType === 'mouse') rotation.setHovered(true) }} onPointerLeave={event => { if (event.pointerType === 'mouse') rotation.setHovered(false) }}>
		<div className='gdb-section-heading'><h2 id={`${id}-heading`}>{title}</h2><div className='gdb-playing-heading-actions'>{items.length > 1 && <button type='button' className='gdb-playing-rotation' aria-label={t(rotation.paused ? 'gallery.discovery.resumePlaying' : 'gallery.discovery.pausePlaying')} title={t(rotation.paused ? 'gallery.discovery.resumePlaying' : 'gallery.discovery.pausePlaying')} aria-controls={`${id}-preview`} onPointerDown={() => { pointerPause.current = !rotation.paused }} onPointerCancel={() => { pointerPause.current = null }} onBlur={() => { pointerPause.current = null }} onClick={() => { rotation.setPaused(pointerPause.current ?? !rotation.paused); pointerPause.current = null }}><CollectionIcon name={rotation.paused ? 'play' : 'pause'} /></button>}<button type='button' className='gdb-text-button' onClick={() => { rotation.pause(); onViewAll() }}>{t('gallery.common.games', { count: total })}<CollectionIcon name='arrow' /></button></div></div>
		<div className={`gdb-playing-layout${items.length === 1 ? ' is-single' : ''}`}><article className='gdb-home-spotlight' id={`${id}-preview`} aria-live={rotation.paused ? 'polite' : 'off'}>
			<button type='button' className='gdb-home-spotlight__art' onClick={open} aria-label={t('gallery.home.openGame', { name: selected.name })}><GameArtwork game={selected} role='hero' eager /></button>
			<div className='gdb-home-spotlight__shade' />
			<div className='gdb-home-spotlight__content'><p>{selected.platformName}{selected.platformName && selected.statusName && <span aria-hidden='true'>/</span>}{selected.statusName}</p><h3>{selected.name}</h3><SampleBadge game={selected} />
				<div className='gdb-home-playing__details'><span>{effectivePlaytime(selected) == null ? formatTime(selected) : t('gallery.home.played', { value: formatTime(selected) })}</span>{(selected.steamAchievementsTotal ?? 0) > 0 && <span>{t('gallery.home.achievements', { unlocked: selected.steamAchievementsUnlocked ?? 0, total: selected.steamAchievementsTotal })}</span>}</div>
				<button type='button' className='gdb-button gdb-button--primary' onClick={open}>{t('gallery.detail.open')}<CollectionIcon name='arrow' /></button>
				{items.length > 1 && <label className='gdb-playing-picker__mobile'>{t('gallery.discovery.choosePlaying')}<select value={selected.id} onChange={event => select(Number(event.target.value))}>{items.map(game => <option key={game.id} value={game.id}>{game.name}</option>)}</select></label>}
			</div>
		</article>
		{items.length > 1 && <aside className='gdb-playing-list'>
			<p className='sr-only' id={`${id}-keys`}>{t('gallery.discovery.playingKeys')}</p>
			<div className={`gdb-playing-list__games${items.length <= 6 ? ' is-complete' : ''}`} role='group' aria-label={t('gallery.discovery.choosePlaying')} aria-describedby={`${id}-keys`}>{items.map((game, index) => {
				return <button type='button' key={game.id} ref={element => { controls.current[index] = element }} className='gdb-playing-list__game' tabIndex={game.id === selected.id ? 0 : -1} aria-pressed={game.id === selected.id} aria-controls={`${id}-preview`} aria-label={t('gallery.home.selectGame', { name: game.name })} onClick={() => select(game.id)} onKeyDown={event => browse(event, index)}>
					<span className='gdb-playing-list__cover'><GameArtwork game={game} role='cover' width={100} decorative /></span><span className='gdb-playing-list__label'><b>{game.name}</b><span className='gdb-playing-list__meta'><small>{game.platformName}</small><SampleBadge game={game} /></span></span>
				</button>
			})}</div>
		</aside>}
		</div>
	</section>
}
