import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Game } from '@/models/api/Game'
import { useAppSelector } from '@/store/hooks'
import { useCollectionResource } from '@/hooks/useCollectionResource'
import { getCollectionFocus, manualPlaylist } from '@/services/CollectionService/PlaylistCollectionService'
import { addPlaylistItem, createPlaylist, getPlaylistById, removePlaylistItem, reorderPlaylistItems } from '@/services/PlaylistService/PlaylistService'
import { invalidateCollection } from '@/services/CollectionService/collectionEvents'
import { FOCUS_GAME_LIMIT, FOCUS_PLAYLIST_NAME, readFocusPlaylistId } from '@/utils/focusPlaylist'
import { CollectionIcon } from './CollectionIcon'
import { SampleBadge } from './SampleBadge'
import { CollectionSheet } from './CollectionSheet'
import { CollectionGamePicker } from './CollectionGamePicker'
import { GameArtwork } from './GameArtwork'
import './CollectionFocusAction.scss'

export const CollectionFocusAction = ({ game }: { game: Game }) => {
	const { t } = useTranslation(), userId = useAppSelector(state => state.auth.user?.id)
	const savedId = readFocusPlaylistId(userId)
	const resource = useCollectionResource(`detail-focus:${savedId ?? 'named'}`, signal => getCollectionFocus(savedId, signal))
	const [open, setOpen] = useState(false), [picking, setPicking] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null)
	const [status, setStatus] = useState('')
	const active = useRef(false)
	const focus = resource.data, items = focus?.items ?? []
	const capacity = Math.min(focus?.maxLength ?? FOCUS_GAME_LIMIT, FOCUS_GAME_LIMIT)
	const inFocus = items.some(item => item.gameId === game.id), full = items.length >= capacity
	const reload = () => { setError(null); invalidateCollection() }
	const perform = async (operation: () => Promise<void>, key: string | (() => string)) => {
		if (active.current) return
		active.current = true; setBusy(true); setError(null); setStatus('')
		try { await operation(); setStatus(t('gallery.detail.focusUpdated')) }
		catch { setError(t(typeof key === 'function' ? key() : key)); setOpen(true) }
		finally { active.current = false; setBusy(false) }
	}
	const add = (item: Game) => {
		if (!focus || full || items.some(value => value.gameId === item.id)) return
		void perform(async () => {
			resource.replaceData(manualPlaylist(await addPlaylistItem(focus.id, item.id), focus.id))
			setPicking(false)
		}, 'focus.addError')
	}
	const create = () => {
		let createdList = false
		void perform(async () => {
			const created = manualPlaylist(await createPlaylist({ name: FOCUS_PLAYLIST_NAME, description: t('focus.playlistDescription'), maxLength: FOCUS_GAME_LIMIT, isAutomatic: false }))
			// Keep an explicitly created list if adding fails; retry must not duplicate it.
			resource.replaceData(created)
			createdList = true
			resource.replaceData(manualPlaylist(await addPlaylistItem(created.id, game.id), created.id))
		}, () => createdList ? 'focus.addError' : 'focus.createError')
	}
	const move = (index: number, delta: number) => {
		const next = index + delta
		if (!focus || next < 0 || next >= items.length) return
		void perform(async () => {
			const reordered = [...items]
			;[reordered[index], reordered[next]] = [reordered[next], reordered[index]]
			await reorderPlaylistItems(focus.id, reordered.map(item => item.id))
			resource.replaceData(manualPlaylist(await getPlaylistById(focus.id), focus.id))
		}, 'gallery.focusPage.orderError')
	}
	const label = t(inFocus ? 'gallery.detail.manageFocus' : 'gallery.detail.addFocus')
	return <>
		<button type='button' className={`gdb-icon-button gdb-detail-focus${inFocus ? ' is-in-focus' : ''}`} aria-label={label} title={label} disabled={busy || resource.loading}
			aria-haspopup={inFocus || full || !focus ? 'dialog' : undefined}
			onClick={() => { if (inFocus || full || !focus || resource.error) setOpen(true); else add(game) }}><CollectionIcon name='focus' /></button>
		<span className='sr-only' role='status'>{status}</span>
		<CollectionSheet open={open} onClose={() => !busy && setOpen(false)} title={t('gallery.focusPage.managerTitle')} subtitle={focus ? t('gallery.focusPage.occupied', { count: items.length, max: capacity }) : undefined}
			className='gdb-detail-focus-manager' footer={<button type='button' className='gdb-button gdb-button--primary' disabled={busy} onClick={() => setOpen(false)}><CollectionIcon name='check' />{t('gallery.common.done')}</button>}>
			<div className='gdb-detail-focus-content' aria-busy={busy || resource.loading}>
				{error && <p className='gdb-error' role='alert'>{error}<button type='button' className='gdb-text-button' disabled={busy} onClick={reload}>{t('gallery.common.reload')}</button></p>}
				{resource.error ? <><p className='gdb-error' role='alert'>{t('focus.loadError')}</p><button type='button' className='gdb-button' onClick={reload}>{t('gallery.common.retry')}</button></>
					: resource.loading && !focus ? <p className='gdb-hint' role='status'>{t('gallery.common.loading')}</p>
					: !focus ? <><p className='gdb-hint'>{t('gallery.detail.createFocusHelp')}</p><button type='button' className='gdb-button gdb-button--primary' disabled={busy} onClick={create}>{t('gallery.detail.createFocusAndAdd', { name: game.name })}</button></>
					: <>
						<ol className='gdb-detail-focus-list'>{items.map((item, index) => <li key={item.id}>
							<span className='gdb-detail-focus-cover'><GameArtwork game={item.game} width={88} decorative /></span><div><strong>{item.game.name}</strong><span>{item.game.platformName || '—'}</span><SampleBadge game={item.game} /></div>
							<div className='gdb-detail-focus-item-actions'>
								<button type='button' className='gdb-icon-button' disabled={busy || index === 0} aria-label={t('gallery.focusPage.moveUp', { name: item.game.name })} onClick={() => move(index, -1)}><CollectionIcon name='up' /></button>
								<button type='button' className='gdb-icon-button' disabled={busy || index === items.length - 1} aria-label={t('gallery.focusPage.moveDown', { name: item.game.name })} onClick={() => move(index, 1)}><CollectionIcon name='down' /></button>
								<button type='button' className='gdb-icon-button' disabled={busy} aria-label={t('focus.removeGame', { name: item.game.name })} onClick={() => { void perform(async () => resource.replaceData(manualPlaylist(await removePlaylistItem(focus.id, item.id), focus.id)), 'focus.removeError') }}><CollectionIcon name='close' /></button>
							</div>
						</li>)}</ol>
						{full && <p className='gdb-hint'>{t('gallery.focusPage.full')}</p>}
						{!inFocus && <button type='button' className='gdb-button gdb-button--primary' disabled={busy || full} onClick={() => add(game)}>{t('gallery.detail.addNamedFocus', { name: game.name })}</button>}
						<button type='button' className='gdb-button' disabled={busy || full} onClick={() => { setError(null); setPicking(true) }}><CollectionIcon name='plus' />{t('gallery.focusPage.addFromLibrary')}</button>
						<p className='gdb-hint'>{t('gallery.focusPage.managerHelp')}</p>
						<Link className='gdb-text-button' to={`/playlists/${focus.id}`} aria-disabled={busy || undefined} onClick={event => { if (busy) event.preventDefault() }}>{t('focus.editFullPlaylist')}<CollectionIcon name='arrow' /></Link>
					</>}
			</div>
		</CollectionSheet>
		{focus && <CollectionGamePicker open={picking} onClose={() => !busy && setPicking(false)} title={t('gallery.focusPage.addFromLibrary')} query={{ metric: 'all' }} onChoose={add} disabledGameIds={items.map(item => item.gameId)} busy={busy} error={error ?? undefined} onReload={reload} />}
	</>
}
