import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { DndContext, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCardStyle } from '@/store/features/theme/themeSlice'
import { usePlaylists } from '@/hooks'
import { setCurrentPlaylist, setPlaylists } from '@/store/features/playlists'
import { getGames } from '@/services/GamesService/GamesService'
import { ConfirmDialog, GameCard, Modal, OptimizedImage } from '@/components/elements'
import type { Game } from '@/models/api/Game'
import type { Playlist, PlaylistCreateDto, PlaylistItem, PlaylistTransfer } from '@/models/api/Playlist'
import './Playlists.scss'

const Icon = ({ path }: { path: string }) => (
	<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
		<path d={path} />
	</svg>
)

const SearchIcon = () => (
	<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
		<circle cx='10.8' cy='10.8' r='6.8' />
		<path d='m16 16 4.2 4.2' />
	</svg>
)

const Grip = () => <Icon path='M8 5h.01M16 5h.01M8 12h.01M16 12h.01M8 19h.01M16 19h.01' />

const MoreIcon = () => <Icon path='M5 12h.01M12 12h.01M19 12h.01' />

const PlaylistDescription = ({ description }: { description: string }) => {
	const { t } = useTranslation()
	return <>
		<p className='playlist-hero__description-desktop' title={description}>{description}</p>
		<details className='playlist-hero__description-mobile'>
			<summary>{t('playlists.showDescription')}</summary>
			<p>{description}</p>
		</details>
	</>
}

const PlaylistHeroImage = ({ src }: { src?: string }) => {
	const [failed, setFailed] = useState(false)
	if (!src || failed) return null
	return <img className='playlist-hero__background' src={src} alt='' aria-hidden='true' onError={() => setFailed(true)} />
}

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
	const { t } = useTranslation()
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `playlist-${id}` })
	return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`playlist-rail__item${selected ? ' is-selected' : ''}${isDragging ? ' is-dragging' : ''}`}>
		<button className='playlist-rail__select' onClick={onSelect} type='button'>
			{coverUrl ? <OptimizedImage src={coverUrl} alt='' width={52} height={70} /> : <span className='playlist-rail__placeholder'><Icon path='M5 5h14v14H5zM8 9h8M8 13h6' /></span>}
			<span><strong>{name}</strong></span>
		</button>
		<button className='playlist-drag-handle' type='button' aria-label={t('playlists.dragToReorder')} {...attributes} {...listeners}><Grip /></button>
	</div>
}

const SortableGame = ({ item, cardStyle, isDropTarget, onRemove }: { item: PlaylistItem; cardStyle: 'card' | 'row' | 'cover'; isDropTarget: boolean; onRemove: () => void }) => {
	const { t } = useTranslation()
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `item-${item.id}` })
	const toolbar = <div className='playlist-game__toolbar'>
		<button className='playlist-drag-handle' type='button' aria-label={t('playlists.dragToReorder')} {...attributes} {...listeners}><Grip /></button>
		<span className='playlist-game__position'>{item.position + 1}</span>
		<button type='button' className='playlist-game__remove' onClick={onRemove} aria-label={t('playlists.removeGame')}>×</button>
	</div>
	return <article ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`playlist-game playlist-game--${cardStyle}${isDragging ? ' is-dragging' : ''}${isDropTarget ? ' is-drop-target' : ''}`}>
		{cardStyle !== 'card' && toolbar}
		<GameCard game={item.game} variant={cardStyle} playlistControls={cardStyle === 'card' ? toolbar : undefined} />
	</article>
}

export default function Playlists() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const { id: routeId } = useParams<{ id?: string }>()
	const dispatch = useAppDispatch()
	const { playlists, currentPlaylist, loading, reordering, fetchAll, fetchById, create, update, remove, reorder, addItem, removeItem, reorderItems, exportPlaylist, importPlaylist } = usePlaylists()
	const cardStyle = useAppSelector(state => state.theme.cardStyle ?? 'card')
	const routePlaylistId = routeId && Number.isInteger(Number(routeId)) ? Number(routeId) : null
	const [selectedId, setSelectedId] = useState<number | null>(routePlaylistId)
	const [editor, setEditor] = useState<'create' | 'edit' | null>(null)
	const [deleteId, setDeleteId] = useState<number | null>(null)
	const [gameQuery, setGameQuery] = useState('')
	const [gameResults, setGameResults] = useState<Game[]>([])
	const [searching, setSearching] = useState(false)
	const [importOpen, setImportOpen] = useState(false)
	const [importText, setImportText] = useState('')
	const [exportReference, setExportReference] = useState<'id' | 'name'>('id')
	const [transferError, setTransferError] = useState<string | null>(null)
	const [importFileName, setImportFileName] = useState<string | null>(null)
	const [searchOpen, setSearchOpen] = useState(false)
	const [menuOpen, setMenuOpen] = useState(false)
	const [activePlaylistId, setActivePlaylistId] = useState<number | null>(null)
	const [activeGameId, setActiveGameId] = useState<number | null>(null)
	const [overGameId, setOverGameId] = useState<number | null>(null)
	const searchRef = useRef<HTMLDivElement>(null)
	const menuRef = useRef<HTMLDivElement>(null)
	const importFileRef = useRef<HTMLInputElement>(null)
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

	useEffect(() => { void fetchAll() }, [fetchAll])
	useEffect(() => {
		setSelectedId(routePlaylistId)
	}, [routePlaylistId])
	useEffect(() => {
		if (selectedId === null && !routePlaylistId && playlists.length) {
			navigate(`/playlists/${playlists[0].id}`, { replace: true })
			return
		}
		if (selectedId !== null && !playlists.some(item => item.id === selectedId)) {
			if (playlists[0]) navigate(`/playlists/${playlists[0].id}`, { replace: true })
			else setSelectedId(null)
		}
	}, [navigate, playlists, selectedId, routePlaylistId])
	useEffect(() => { if (selectedId !== null) void fetchById(selectedId) }, [selectedId, fetchById])
	const playlistMatchesRoute = routePlaylistId === null || currentPlaylist?.id === routePlaylistId
	useEffect(() => {
		const term = gameQuery.trim()
		if (!term) { setGameResults([]); return }
		setSearching(true)
		const timer = window.setTimeout(async () => {
			try { const result = await getGames({ search: term, page: 1, pageSize: 12 }); setGameResults(result.data) } catch { setGameResults([]) } finally { setSearching(false) }
		}, 250)
		return () => window.clearTimeout(timer)
	}, [gameQuery])
	useEffect(() => {
		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target as Node
			if (!searchRef.current?.contains(target)) setSearchOpen(false)
			if (!menuRef.current?.contains(target)) setMenuOpen(false)
		}
		document.addEventListener('pointerdown', handlePointerDown)
		return () => document.removeEventListener('pointerdown', handlePointerDown)
	}, [])

	const selectedGameIds = useMemo(() => new Set(currentPlaylist?.items.map(item => item.gameId) ?? []), [currentPlaylist])
	const selectedSummary = playlists.find(item => item.id === selectedId)

	const handlePlaylistDrag = async ({ active, over }: DragEndEvent) => {
		setActivePlaylistId(null)
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
		setActiveGameId(null)
		setOverGameId(null)
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
	const handleDragStart = ({ active }: DragStartEvent) => {
		const value = String(active.id)
		if (value.startsWith('playlist-')) setActivePlaylistId(Number(value.replace('playlist-', '')))
		if (value.startsWith('item-')) setActiveGameId(Number(value.replace('item-', '')))
	}
	const handleDragCancel = () => {
		setActivePlaylistId(null)
		setActiveGameId(null)
		setOverGameId(null)
	}

	const savePlaylist = async (data: PlaylistCreateDto) => {
		if (editor === 'create') { const created = await create(data) as Playlist; setSelectedId(created.id); navigate(`/playlists/${created.id}`) }
		else if (selectedId !== null) await update(selectedId, data)
		setEditor(null)
	}

	const handleDelete = async () => { if (deleteId !== null) { await remove(deleteId); setDeleteId(null); navigate('/playlists') } }
	const handleExport = async () => {
		if (!currentPlaylist) return
		try {
			const transfer = await exportPlaylist(currentPlaylist.id, exportReference) as PlaylistTransfer
			const blob = new Blob([JSON.stringify(transfer, null, 2)], { type: 'application/json' })
			const url = URL.createObjectURL(blob)
			const anchor = document.createElement('a')
			anchor.href = url
			anchor.download = `${currentPlaylist.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`
			anchor.click()
			URL.revokeObjectURL(url)
		} catch (error) { setTransferError(error instanceof Error ? error.message : t('playlists.transferError')) }
	}
	const handleImport = async () => {
		setTransferError(null)
		try {
			const parsed = JSON.parse(importText) as PlaylistTransfer
			if (parsed.format !== 'games-database-playlist' || parsed.version !== 1 || !parsed.name || !Array.isArray(parsed.games)) throw new Error(t('playlists.invalidImport'))
			await importPlaylist(parsed)
			setImportOpen(false)
			setImportText('')
			await fetchAll()
		} catch (error) { setTransferError(error instanceof Error ? error.message : t('playlists.transferError')) }
	}
	const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return
		try {
			setImportText(await file.text())
			setImportFileName(file.name)
			setTransferError(null)
		} catch {
			setTransferError(t('playlists.fileReadError'))
		}
		event.target.value = ''
	}

	const activeGame = currentPlaylist?.items.find(item => item.id === activeGameId)?.game
	return <main className='playlists-page'>
		<div className='playlists-layout'>
			<div className='playlists-sidebar'>
				<header className='playlists-page__header'><div className='playlists-page__heading'><span className='playlists-page__eyebrow'>{t('playlists.eyebrow')}</span><h1>{t('playlists.title')}</h1><div className='playlists-page__header-actions'><button className='playlist-button playlist-button--quiet' type='button' onClick={() => setImportOpen(true)}>{t('playlists.import')}</button><button className='playlist-button playlist-button--primary' type='button' onClick={() => setEditor('create')}>+ {t('playlists.new')}</button></div></div></header>
				<aside className='playlist-rail'>
				<div className='playlist-rail__header'><h2>{t('playlists.collection')}</h2><span>{playlists.length}</span></div>
				<DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis, restrictToParentElement]} onDragStart={handleDragStart} onDragCancel={handleDragCancel} onDragEnd={handlePlaylistDrag}>
					<SortableContext items={playlists.map(item => `playlist-${item.id}`)} strategy={verticalListSortingStrategy}>
						{playlists.map(playlist => <PlaylistRailItem key={playlist.id} id={playlist.id} name={playlist.name} coverUrl={playlist.coverUrl} selected={selectedId === playlist.id} onSelect={() => { setSelectedId(playlist.id); navigate(`/playlists/${playlist.id}`) }} />)}
					</SortableContext>
					<DragOverlay>{activePlaylistId !== null ? <div className='playlist-drag-preview'>{playlists.find(item => item.id === activePlaylistId)?.name}</div> : null}</DragOverlay>
				</DndContext>
				{!loading && !playlists.length && <p className='playlist-rail__empty'>{t('playlists.empty')}</p>}
				</aside>
			</div>
			<section className='playlist-detail'>
				{currentPlaylist && playlistMatchesRoute ? <>
					<div className='playlist-hero'>
						<PlaylistHeroImage src={currentPlaylist.heroUrl ?? currentPlaylist.coverUrl} />
						<div className='playlist-hero__shade' aria-hidden='true' />
						<div className='playlist-hero__top'>{currentPlaylist.logoUrl && <div className='playlist-hero__logo'><OptimizedImage src={currentPlaylist.logoUrl} alt='' width={160} height={64} /></div>}<div className='playlist-menu' ref={menuRef}><button type='button' className='playlist-menu__trigger' aria-label={t('playlists.options')} aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}><MoreIcon /></button>{menuOpen && <div className='playlist-menu__panel'><button type='button' onClick={() => { void handleExport(); setMenuOpen(false) }}>{t('playlists.export')}</button><select value={exportReference} onChange={event => setExportReference(event.target.value as 'id' | 'name')} aria-label={t('playlists.exportReference')}><option value='id'>{t('playlists.byId')}</option><option value='name'>{t('playlists.byName')}</option></select><button type='button' onClick={() => { setEditor('edit'); setMenuOpen(false) }}>{t('common.edit')}</button><button type='button' onClick={() => { setDeleteId(currentPlaylist.id); setMenuOpen(false) }}>{t('common.delete')}</button></div>}</div></div>
						<div className='playlist-hero__content'><div className='playlist-hero__copy'><span>{t('playlists.playlistLabel')}</span><h2>{currentPlaylist.name}</h2>{currentPlaylist.description && <PlaylistDescription description={currentPlaylist.description} />}</div></div>
					</div>
					<div className='playlist-tools'><div className='playlist-view-toggle' role='group' aria-label={t('playlists.viewMode')}>
						{(['row', 'card', 'cover'] as const).map(mode => <button key={mode} type='button' className={cardStyle === mode ? 'is-active' : ''} onClick={() => dispatch(setCardStyle(mode))}>{t(`playlists.views.${mode}`)}</button>)}
					</div><div className='playlist-search-area' ref={searchRef}><label className='playlist-search'><SearchIcon /><input value={gameQuery} onFocus={() => setSearchOpen(true)} onChange={event => { setSearchOpen(true); setGameQuery(event.target.value) }} placeholder={t('playlists.addPlaceholder')} /></label>
					{searchOpen && gameQuery && <div className='playlist-search-results' aria-live='polite'>{searching ? <div className='playlist-search-results__status'><span className='playlist-search-results__spinner' aria-hidden='true' />{t('common.loading')}</div> : gameResults.length ? gameResults.map(game => <button key={game.id} type='button' disabled={selectedGameIds.has(game.id)} onClick={() => { void addItem(currentPlaylist.id, game.id) }}><span>{game.name}</span><small>{selectedGameIds.has(game.id) ? t('playlists.added') : t('playlists.add')}</small></button>) : <div className='playlist-search-results__status'>{t('playlists.noSearchResults')}</div>}</div>}</div></div>
					<DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={cardStyle === 'row' ? [restrictToVerticalAxis, restrictToParentElement] : []} onDragStart={handleDragStart} onDragCancel={handleDragCancel} onDragOver={({ over }) => setOverGameId(over ? Number(String(over.id).replace('item-', '')) : null)} onDragEnd={handleGameDrag}>
						<SortableContext items={currentPlaylist.items.map(item => `item-${item.id}`)} strategy={verticalListSortingStrategy}>
							<div className={`playlist-games playlist-games--${cardStyle}`}>{currentPlaylist.items.map(item => <SortableGame key={item.id} item={item} cardStyle={cardStyle} isDropTarget={overGameId === item.id && activeGameId !== item.id} onRemove={() => void removeItem(currentPlaylist.id, item.id)} />)}</div>
						</SortableContext>
						<DragOverlay>{activeGame ? <div className='playlist-game-preview'>{activeGame.name}</div> : null}</DragOverlay>
					</DndContext>
					{reordering && <div className='playlist-reorder-status' role='status'>{t('playlists.reordering')}</div>}
					{!currentPlaylist.items.length && <div className='playlist-games__empty'><h3>{t('playlists.noGames')}</h3><p>{t('playlists.noGamesHint')}</p></div>}
				</> : <div className='playlist-detail__empty'><h2>{t('playlists.select')}</h2><p>{t('playlists.selectHint')}</p></div>}
			</section>
		</div>
		<Modal isOpen={editor !== null} onClose={() => setEditor(null)} title={editor === 'edit' ? t('playlists.edit') : t('playlists.new')} maxWidth='760px'><PlaylistForm initial={editor === 'edit' ? currentPlaylist : null} onClose={() => setEditor(null)} onSave={savePlaylist} /></Modal>
		<Modal isOpen={importOpen} onClose={() => setImportOpen(false)} title={t('playlists.import')} maxWidth='760px'><div className='playlist-import'><p>{t('playlists.importHint')}</p><input ref={importFileRef} className='playlist-import__file-input' type='file' accept='application/json,.json' onChange={handleImportFile} /><button type='button' className='playlist-button playlist-button--quiet playlist-import__file-button' onClick={() => importFileRef.current?.click()}>{t('playlists.chooseFile')}</button>{importFileName && <span className='playlist-import__file-name'>{importFileName}</span>}<textarea value={importText} onChange={event => { setImportText(event.target.value); setImportFileName(null) }} rows={14} placeholder={t('playlists.jsonPlaceholder')} />{transferError && <p className='playlist-import__error'>{transferError}</p>}<div className='playlist-form__actions'><button type='button' className='playlist-button playlist-button--quiet' onClick={() => setImportOpen(false)}>{t('common.cancel')}</button><button type='button' className='playlist-button playlist-button--primary' onClick={() => void handleImport()}>{t('playlists.import')}</button></div></div></Modal>
		<ConfirmDialog isOpen={deleteId !== null} title={t('playlists.deleteTitle')} message={t('playlists.deleteMessage', { name: selectedSummary?.name ?? '' })} onCancel={() => setDeleteId(null)} onConfirm={() => void handleDelete()} confirmLabel={t('common.delete')} />
	</main>
}
