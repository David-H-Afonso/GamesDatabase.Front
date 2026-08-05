import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCardStyle } from '@/store/features/theme/themeSlice'
import { usePlaylists } from '@/hooks'
import { setCurrentPlaylist, setPlaylists } from '@/store/features/playlists'
import { getGames } from '@/services/GamesService/GamesService'
import { ConfirmDialog, GameCard, Modal, OptimizedImage } from '@/components/elements'
import type { Game } from '@/models/api/Game'
import type { Playlist, PlaylistCreateDto, PlaylistItem } from '@/models/api/Playlist'
import './Playlists.scss'

const Icon = ({ path }: { path: string }) => (
	<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
		<path d={path} />
	</svg>
)

const Grip = () => <Icon path='M8 5h.01M16 5h.01M8 12h.01M16 12h.01M8 19h.01M16 19h.01' />

const PlaylistForm = ({ initial, onClose, onSave }: { initial?: Playlist | null; onClose: () => void; onSave: (data: PlaylistCreateDto) => Promise<void> }) => {
	const { t } = useTranslation()
	const [form, setForm] = useState<PlaylistCreateDto>({ name: initial?.name ?? '', description: initial?.description ?? '', heroUrl: initial?.heroUrlOverride ?? '', coverUrl: initial?.coverUrlOverride ?? '', logoUrl: initial?.logoUrlOverride ?? '' })
	const [saving, setSaving] = useState(false)
	const update = (key: keyof PlaylistCreateDto, value: string) => setForm(current => ({ ...current, [key]: value }))
	const submit = async (event: FormEvent) => {
		event.preventDefault()
		if (!form.name.trim()) return
		setSaving(true)
		try { await onSave(form) } finally { setSaving(false) }
	}
	return (
		<form className='playlist-form' onSubmit={submit}>
			<label>{t('playlists.name')}<input value={form.name} onChange={event => update('name', event.target.value)} autoFocus required /></label>
			<label>{t('playlists.description')}<textarea value={form.description} onChange={event => update('description', event.target.value)} rows={3} /></label>
			<div className='playlist-form__grid'>
				<label>{t('playlists.heroUrl')}<input type='url' value={form.heroUrl} onChange={event => update('heroUrl', event.target.value)} placeholder={t('playlists.urlPlaceholder')} /></label>
				<label>{t('playlists.coverUrl')}<input type='url' value={form.coverUrl} onChange={event => update('coverUrl', event.target.value)} placeholder={t('playlists.urlPlaceholder')} /></label>
				<label>{t('playlists.logoUrl')}<input type='url' value={form.logoUrl} onChange={event => update('logoUrl', event.target.value)} placeholder={t('playlists.urlPlaceholder')} /></label>
			</div>
			<div className='playlist-form__actions'><button type='button' className='playlist-button playlist-button--quiet' onClick={onClose}>{t('common.cancel')}</button><button type='submit' className='playlist-button playlist-button--primary' disabled={saving}>{saving ? t('common.saving') : t('common.save')}</button></div>
		</form>
	)
}

const PlaylistRailItem = ({ id, name, coverUrl, selected, onSelect }: { id: number; name: string; coverUrl?: string; selected: boolean; onSelect: () => void }) => {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `playlist-${id}` })
	return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`playlist-rail__item${selected ? ' is-selected' : ''}${isDragging ? ' is-dragging' : ''}`}>
		<button className='playlist-rail__select' onClick={onSelect} type='button'>
			{coverUrl ? <OptimizedImage src={coverUrl} alt='' width={52} height={70} /> : <span className='playlist-rail__placeholder'><Icon path='M5 5h14v14H5zM8 9h8M8 13h6' /></span>}
			<span><strong>{name}</strong><small>{id}</small></span>
		</button>
		<button className='playlist-drag-handle' type='button' aria-label='Drag to reorder' {...attributes} {...listeners}><Grip /></button>
	</div>
}

const SortableGame = ({ item, cardStyle, onRemove }: { item: PlaylistItem; cardStyle: 'card' | 'row' | 'cover'; onRemove: () => void }) => {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `item-${item.id}` })
	return <article ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`playlist-game playlist-game--${cardStyle}${isDragging ? ' is-dragging' : ''}`}>
		<div className='playlist-game__toolbar'>
			<button className='playlist-drag-handle' type='button' aria-label='Drag to reorder' {...attributes} {...listeners}><Grip /></button>
			<span className='playlist-game__position'>{item.position + 1}</span>
			<button type='button' className='playlist-game__remove' onClick={onRemove} aria-label='Remove game'>×</button>
		</div>
		<GameCard game={item.game} variant={cardStyle} />
	</article>
}

export default function Playlists() {
	const { t } = useTranslation()
	const dispatch = useAppDispatch()
	const { playlists, currentPlaylist, loading, fetchAll, fetchById, create, update, remove, reorder, addItem, removeItem, reorderItems } = usePlaylists()
	const cardStyle = useAppSelector(state => state.theme.cardStyle ?? 'card')
	const [selectedId, setSelectedId] = useState<number | null>(null)
	const [editor, setEditor] = useState<'create' | 'edit' | null>(null)
	const [deleteId, setDeleteId] = useState<number | null>(null)
	const [gameQuery, setGameQuery] = useState('')
	const [gameResults, setGameResults] = useState<Game[]>([])
	const [searching, setSearching] = useState(false)
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

	useEffect(() => { void fetchAll() }, [fetchAll])
	useEffect(() => {
		if (selectedId === null && playlists.length) setSelectedId(playlists[0].id)
		if (selectedId !== null && !playlists.some(item => item.id === selectedId)) setSelectedId(playlists[0]?.id ?? null)
	}, [playlists, selectedId])
	useEffect(() => { if (selectedId !== null) void fetchById(selectedId) }, [selectedId, fetchById])
	useEffect(() => {
		const term = gameQuery.trim()
		if (!term) { setGameResults([]); return }
		setSearching(true)
		const timer = window.setTimeout(async () => {
			try { const result = await getGames({ search: term, page: 1, pageSize: 12 }); setGameResults(result.data) } catch { setGameResults([]) } finally { setSearching(false) }
		}, 250)
		return () => window.clearTimeout(timer)
	}, [gameQuery])

	const selectedGameIds = useMemo(() => new Set(currentPlaylist?.items.map(item => item.gameId) ?? []), [currentPlaylist])
	const selectedSummary = playlists.find(item => item.id === selectedId)

	const handlePlaylistDrag = async ({ active, over }: DragEndEvent) => {
		if (!over || active.id === over.id) return
		const ids = playlists.map(item => item.id)
		const from = ids.findIndex(id => `playlist-${id}` === active.id)
		const to = ids.findIndex(id => `playlist-${id}` === over.id)
		if (from < 0 || to < 0) return
		const ordered = arrayMove(ids, from, to)
		dispatch(setPlaylists(ordered.map(id => playlists.find(item => item.id === id)!)))
		try { await reorder(ordered) } catch { dispatch(setPlaylists(playlists)) }
	}

	const handleGameDrag = async ({ active, over }: DragEndEvent) => {
		if (!currentPlaylist || !over || active.id === over.id) return
		const ids = currentPlaylist.items.map(item => item.id)
		const from = ids.findIndex(id => `item-${id}` === active.id)
		const to = ids.findIndex(id => `item-${id}` === over.id)
		if (from < 0 || to < 0) return
		const ordered = arrayMove(ids, from, to)
		const previous = currentPlaylist
		const optimistic = { ...currentPlaylist, items: ordered.map((id, position) => ({ ...currentPlaylist.items.find(item => item.id === id)!, position })) }
		dispatch(setCurrentPlaylist(optimistic))
		try { await reorderItems(currentPlaylist.id, ordered) } catch { dispatch(setCurrentPlaylist(previous)) }
	}

	const savePlaylist = async (data: PlaylistCreateDto) => {
		if (editor === 'create') { const created = await create(data) as Playlist; setSelectedId(created.id) }
		else if (selectedId !== null) await update(selectedId, data)
		setEditor(null)
	}

	const handleDelete = async () => { if (deleteId !== null) { await remove(deleteId); setDeleteId(null) } }

	return <main className='playlists-page'>
		<header className='playlists-page__header'><div><span className='playlists-page__eyebrow'>{t('playlists.eyebrow')}</span><h1>{t('playlists.title')}</h1><p>{t('playlists.subtitle')}</p></div><button className='playlist-button playlist-button--primary' type='button' onClick={() => setEditor('create')}>+ {t('playlists.new')}</button></header>
		<div className='playlists-layout'>
			<aside className='playlist-rail'>
				<div className='playlist-rail__header'><h2>{t('playlists.collection')}</h2><span>{playlists.length}</span></div>
				<DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis, restrictToParentElement]} onDragEnd={handlePlaylistDrag}>
					<SortableContext items={playlists.map(item => `playlist-${item.id}`)} strategy={verticalListSortingStrategy}>
						{playlists.map(playlist => <PlaylistRailItem key={playlist.id} id={playlist.id} name={playlist.name} coverUrl={playlist.coverUrl} selected={selectedId === playlist.id} onSelect={() => setSelectedId(playlist.id)} />)}
					</SortableContext>
				</DndContext>
				{!loading && !playlists.length && <p className='playlist-rail__empty'>{t('playlists.empty')}</p>}
			</aside>
			<section className='playlist-detail'>
				{currentPlaylist ? <>
					<div className='playlist-hero' style={currentPlaylist.heroUrl ? { backgroundImage: `linear-gradient(90deg, var(--playlist-hero-shade), rgba(0,0,0,.18)), url("${currentPlaylist.heroUrl}")` } : undefined}>
						<div className='playlist-hero__content'>{currentPlaylist.logoUrl && <OptimizedImage src={currentPlaylist.logoUrl} alt='' className='playlist-hero__logo' width={280} height={110} />}<div><span>{t('playlists.playlistLabel')}</span><h2>{currentPlaylist.name}</h2>{currentPlaylist.description && <p>{currentPlaylist.description}</p>}</div></div>
						<div className='playlist-hero__actions'><button type='button' onClick={() => setEditor('edit')}>{t('common.edit')}</button><button type='button' onClick={() => setDeleteId(currentPlaylist.id)}>{t('common.delete')}</button></div>
					</div>
					<div className='playlist-tools'><div className='playlist-view-toggle' role='group' aria-label={t('playlists.viewMode')}>
						{(['row', 'card', 'cover'] as const).map(mode => <button key={mode} type='button' className={cardStyle === mode ? 'is-active' : ''} onClick={() => dispatch(setCardStyle(mode))}>{t(`playlists.views.${mode}`)}</button>)}
					</div><label className='playlist-search'><Icon path='M11 4a7 7 0 1 0 4.9 12L20 20' /><input value={gameQuery} onChange={event => setGameQuery(event.target.value)} placeholder={t('playlists.addPlaceholder')} /></label></div>
					{gameQuery && <div className='playlist-search-results'>{searching ? <span>{t('common.loading')}</span> : gameResults.map(game => <button key={game.id} type='button' disabled={selectedGameIds.has(game.id)} onClick={() => { void addItem(currentPlaylist.id, game.id); setGameQuery('') }}><span>{game.name}</span><small>{selectedGameIds.has(game.id) ? t('playlists.added') : t('playlists.add')}</small></button>)}</div>}
					<DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={cardStyle === 'row' ? [restrictToVerticalAxis, restrictToParentElement] : []} onDragEnd={handleGameDrag}>
						<SortableContext items={currentPlaylist.items.map(item => `item-${item.id}`)} strategy={verticalListSortingStrategy}>
							<div className={`playlist-games playlist-games--${cardStyle}`}>{currentPlaylist.items.map(item => <SortableGame key={item.id} item={item} cardStyle={cardStyle} onRemove={() => void removeItem(currentPlaylist.id, item.id)} />)}</div>
						</SortableContext>
					</DndContext>
					{!currentPlaylist.items.length && <div className='playlist-games__empty'><h3>{t('playlists.noGames')}</h3><p>{t('playlists.noGamesHint')}</p></div>}
				</> : <div className='playlist-detail__empty'><h2>{t('playlists.select')}</h2><p>{t('playlists.selectHint')}</p></div>}
			</section>
		</div>
		<Modal isOpen={editor !== null} onClose={() => setEditor(null)} title={editor === 'edit' ? t('playlists.edit') : t('playlists.new')} maxWidth='760px'><PlaylistForm initial={editor === 'edit' ? currentPlaylist : null} onClose={() => setEditor(null)} onSave={savePlaylist} /></Modal>
		<ConfirmDialog isOpen={deleteId !== null} title={t('playlists.deleteTitle')} message={t('playlists.deleteMessage', { name: selectedSummary?.name ?? '' })} onCancel={() => setDeleteId(null)} onConfirm={() => void handleDelete()} confirmLabel={t('common.delete')} />
	</main>
}
