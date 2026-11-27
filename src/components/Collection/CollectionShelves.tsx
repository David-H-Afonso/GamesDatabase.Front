import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import type { Game } from '@/models/api/Game'
import { useCollectionResource } from '@/hooks/useCollectionResource'
import { getPlaylistShelves } from '@/services/CollectionService/PlaylistCollectionService'
import { invalidateCollection } from '@/services/CollectionService/collectionEvents'
import { useCollectionDetails } from './collectionDetailsContext'
import { CollectionGameDetails } from './CollectionGameDetailsLazy'
import { CollectionIcon } from './CollectionIcon'
import { GameArtwork } from './GameArtwork'
import { GameTitle } from './GameTitle'
import { SampleBadge } from './SampleBadge'
import { CollectionRail } from './CollectionRail'
import './CollectionShelves.scss'

export default function CollectionShelves() {
	const { t } = useTranslation()
	const resource = useCollectionResource('playlist-shelves', getPlaylistShelves)
	const details = useCollectionDetails(), [localGame, setLocalGame] = useState<Game | null>(null)
	const open = (game: Game) => { if (details) details.open(game); else setLocalGame(game) }
	const jump = (id: number) => {
		if (!resource.data?.some(shelf => shelf.playlist.id === id)) return
		const shelf = document.getElementById(`gdb-shelf-block-${id}`)
		shelf?.querySelector<HTMLAnchorElement>('h2 a')?.focus({ preventScroll: true })
		shelf?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
	}
	return <section className='gdb-page gdb-shelves-page' aria-busy={resource.loading}>
		<div className='gdb-page-heading'>
			<div className='gdb-page-title'><h1>{t('gallery.shelves.title')}</h1>{resource.data && <span className='gdb-count'>{t('gallery.shelves.count', { count: resource.data.length })}</span>}</div>
			<Link className='gdb-button' to='/playlists'><CollectionIcon name='playlists' />{t('gallery.shelves.viewLists')}</Link>
		</div>
		{resource.data && resource.data.length > 3 && <label className='gdb-shelves-index'>{t('gallery.shelves.jump')}
			<select value='' onChange={event => jump(Number(event.target.value))}>
				<option value='' disabled>{t('gallery.shelves.choose')}</option>
				{resource.data.map(({ playlist }) => <option key={playlist.id} value={playlist.id}>{playlist.name}</option>)}
			</select>
		</label>}
		{resource.error && <div className='gdb-error' role='alert'>{t('gallery.common.loadError')} <button type='button' className='gdb-text-button' onClick={invalidateCollection}>{t('gallery.common.retry')}</button></div>}
		{resource.loading && !resource.data ? <div className='gdb-shelves-loading' role='status' aria-label={t('gallery.common.loading')}><div className='gdb-skeleton' /><div className='gdb-skeleton' /></div>
			: resource.data?.length ? <div className='gdb-personal-shelves'>{resource.data.map(({ playlist, data, state }) => <section id={`gdb-shelf-block-${playlist.id}`} className='gdb-personal-shelf' key={playlist.id} aria-labelledby={`gdb-shelf-${playlist.id}`}>
				<div className='gdb-shelf-title'>
					<div><div className='gdb-shelf-identity'><h2 id={`gdb-shelf-${playlist.id}`}><Link to={`/playlists/${playlist.id}`}>{playlist.name}</Link></h2><span>{playlist.isAutomatic && <>{t('playlists.automatic')} · </>}{t('gallery.common.games', { count: data?.items.length ?? playlist.gameCount })}</span></div>{playlist.description && <p className='gdb-shelf-description'>{playlist.description}</p>}</div>
					<Link className='gdb-text-button' to={`/playlists/${playlist.id}`} aria-label={t('gallery.shelves.openNamedList', { name: playlist.name })}>{t('gallery.shelves.openList')}<CollectionIcon name='arrow' /></Link>
				</div>
				{state === 'error' ? <div className='gdb-error' role='alert'>{t('gallery.shelves.listError')} <button type='button' className='gdb-text-button' onClick={invalidateCollection}>{t('gallery.common.retry')}</button></div>
					: <CollectionRail className='gdb-shelf-rail' label={t('gallery.shelves.gamesIn', { name: playlist.name })}>
						{data?.items.length ? data.items.map(item => <article className='gdb-shelved-game' key={item.id}>
							<GameTitle name={item.game.name} onOpen={() => open(item.game)} tooltip='hold' className='gdb-shelved-cover' ariaLabel={t('gallery.home.openGame', { name: item.game.name })}><GameArtwork game={item.game} width={290} /></GameTitle>
							<GameTitle name={item.game.name} onOpen={() => open(item.game)} className='gdb-shelved-title' />
							<SampleBadge game={item.game} />
							<span>{item.game.platformName || '—'}</span>
						</article>) : <Link className='gdb-empty-shelf' to={`/playlists/${playlist.id}`}><CollectionIcon name={playlist.isAutomatic ? 'filter' : 'plus'} />{t(playlist.isAutomatic ? 'gallery.shelves.reviewRules' : 'gallery.shelves.addGames')}</Link>}
					</CollectionRail>}
			</section>)}</div>
				: !resource.error && !resource.loading && <div className='gdb-empty'><CollectionIcon name='playlists' /><h2>{t('gallery.shelves.emptyTitle')}</h2><p>{t('gallery.shelves.emptyHelp')}</p><Link className='gdb-button gdb-button--primary' to='/playlists'>{t('gallery.shelves.viewLists')}<CollectionIcon name='arrow' /></Link></div>}
		{localGame && <CollectionGameDetails game={localGame} closeDetails={() => setLocalGame(null)} />}
	</section>
}
