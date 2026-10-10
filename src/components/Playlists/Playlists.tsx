import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCardStyle } from '@/store/features/theme/themeSlice'
import { usePlaylists } from '@/hooks'
import { setCurrentPlaylist } from '@/store/features/playlists'
import { getGames } from '@/services/GamesService/GamesService'
import { useGamePlatform, useGamePlayedStatus, useGameStatus } from '@/hooks'
import { ConfirmDialog, GameCard, Modal, OptimizedImage } from '@/components/elements'
import type { Game } from '@/models/api/Game'
import type { Playlist, PlaylistCreateDto, PlaylistItem, PlaylistRules, PlaylistTransfer } from '@/models/api/Playlist'
import './Playlists.scss'
import PlaylistOrdering from './PlaylistOrdering'
import PlaylistLibrary from './PlaylistLibrary'

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
	const activeStatuses = useAppSelector(state => state.gameStatus.activeStatuses)
	const [form, setForm] = useState<PlaylistCreateDto>({ maxLength: initial?.maxLength ?? null, name: initial?.name ?? '', description: initial?.description ?? '', heroUrl: initial?.heroUrlOverride ?? '', coverUrl: initial?.coverUrlOverride ?? '', logoUrl: initial?.logoUrlOverride ?? '', isAutomatic: initial?.isAutomatic ?? false, rules: initial?.rules ?? { statusIds: [], platformIds: [], playedStatusIds: [], sortBy: 'Name', sortDescending: false, orderedGameIds: [] } })
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
			<label>{t('playlists.maxLength')}<input type='number' min='1' step='1' value={form.maxLength ?? ''} placeholder={t('playlists.unlimited')} onChange={event => setForm(current => ({ ...current, maxLength: event.target.value === '' ? null : Number(event.target.value) }))} /><small>{t('playlists.maxLengthHint')}</small></label>
			<div className='playlist-form__grid'>
				<label>{t('playlists.heroUrl')}<input type='url' value={form.heroUrl} onChange={event => update('heroUrl', event.target.value)} placeholder={t('playlists.urlPlaceholder')} /></label>
				<label>{t('playlists.coverUrl')}<input type='url' value={form.coverUrl} onChange={event => update('coverUrl', event.target.value)} placeholder={t('playlists.urlPlaceholder')} /></label>
				<label>{t('playlists.logoUrl')}<input type='url' value={form.logoUrl} onChange={event => update('logoUrl', event.target.value)} placeholder={t('playlists.urlPlaceholder')} /></label>
			</div>
			<label className='playlist-form__checkbox'><input type='checkbox' checked={form.isAutomatic ?? false} onChange={event => setForm(current => ({ ...current, isAutomatic: event.target.checked }))} />{t('playlists.automatic')}</label>
			{form.isAutomatic && <AutomaticRules rules={form.rules!} onChange={rules => setForm(current => ({ ...current, rules }))} />}
			{form.isAutomatic && <PlaylistOrdering rules={form.rules!} statuses={activeStatuses} onChange={rules => setForm(current => ({ ...current, rules }))} />}
			<div className='playlist-form__actions'><button type='button' className='playlist-button playlist-button--quiet' onClick={onClose}>{t('common.cancel')}</button><button type='submit' className='playlist-button playlist-button--primary' disabled={saving}>{saving ? t('common.saving') : t('common.save')}</button></div>
		</form>
	)
}

const AutomaticRules = ({ rules, onChange }: { rules: PlaylistRules; onChange: (rules: PlaylistRules) => void }) => {
	const { t } = useTranslation()
	const { activeStatuses } = useGameStatus()
	const { activePlatforms } = useGamePlatform()
	const { activePlayedStatuses } = useGamePlayedStatus()
	const update = (patch: Partial<PlaylistRules>) => onChange({ ...rules, ...patch })
	const toggle = (key: 'statusIds' | 'platformIds' | 'playedStatusIds', id: number) => update({ [key]: rules[key].includes(id) ? rules[key].filter(value => value !== id) : [...rules[key], id] })
	return <fieldset className='playlist-rules'><legend>{t('playlists.rulesTitle')}</legend><label>{t('playlists.ruleSearch')}<input value={rules.search ?? ''} onChange={event => update({ search: event.target.value })} /></label><div className='playlist-rules__group'><strong>{t('playlists.ruleStatuses')}</strong><div className='playlist-rules__options'>{activeStatuses.map(option => <label key={option.id} className='playlist-form__checkbox'><input type='checkbox' checked={rules.statusIds.includes(option.id)} onChange={() => toggle('statusIds', option.id)} />{option.name}</label>)}</div></div><div className='playlist-rules__group'><strong>{t('playlists.rulePlatforms')}</strong><div className='playlist-rules__options'>{activePlatforms.map(option => <label key={option.id} className='playlist-form__checkbox'><input type='checkbox' checked={rules.platformIds.includes(option.id)} onChange={() => toggle('platformIds', option.id)} />{option.name}</label>)}</div></div><div className='playlist-rules__group'><strong>{t('playlists.rulePlayedStatuses')}</strong><div className='playlist-rules__options'>{activePlayedStatuses.map(option => <label key={option.id} className='playlist-form__checkbox'><input type='checkbox' checked={rules.playedStatusIds.includes(option.id)} onChange={() => toggle('playedStatusIds', option.id)} />{option.name}</label>)}</div></div><div className='playlist-rules__grid'><label>{t('playlists.ruleMinGrade')}<input type='number' min='0' max='100' value={rules.minGrade ?? ''} onChange={event => update({ minGrade: event.target.value ? Number(event.target.value) : undefined })} /></label><label>{t('playlists.ruleMaxGrade')}<input type='number' min='0' max='100' value={rules.maxGrade ?? ''} onChange={event => update({ maxGrade: event.target.value ? Number(event.target.value) : undefined })} /></label><label>{t('playlists.ruleLimit')}<input type='number' min='1' value={rules.limit ?? ''} onChange={event => update({ limit: event.target.value ? Number(event.target.value) : undefined })} /></label></div><label>{t('playlists.ruleSort')}<select value={rules.sortBy} onChange={event => update({ sortBy: event.target.value as PlaylistRules['sortBy'] })}><option value='Name'>{t('playlists.sortName')}</option><option value='Grade'>{t('playlists.sortGrade')}</option><option value='Critic'>{t('playlists.sortCritic')}</option><option value='Score'>{t('playlists.sortScore')}</option><option value='Released'>{t('playlists.sortReleased')}</option><option value='Story'>{t('playlists.sortStory')}</option><option value='Updated'>{t('playlists.sortUpdated')}</option></select></label><label className='playlist-form__checkbox'><input type='checkbox' checked={rules.favorite === true} onChange={event => update({ favorite: event.target.checked ? true : undefined })} />{t('playlists.ruleFavorites')}</label><label className='playlist-form__checkbox'><input type='checkbox' checked={rules.hasSteam === true} onChange={event => update({ hasSteam: event.target.checked ? true : undefined })} />{t('playlists.ruleSteam')}</label><label className='playlist-form__checkbox'><input type='checkbox' checked={rules.fullCompletion === true} onChange={event => update({ fullCompletion: event.target.checked ? true : undefined })} />{t('playlists.ruleCompleted')}</label><label className='playlist-form__checkbox'><input type='checkbox' checked={rules.sortDescending} onChange={event => update({ sortDescending: event.target.checked })} />{t('playlists.ruleDescending')}</label></fieldset>
}

const SortableGame = ({ item, cardStyle, isDropTarget, onRemove, onGameUpdated }: { item: PlaylistItem; cardStyle: 'card' | 'row' | 'cover'; isDropTarget: boolean; onRemove: () => void; onGameUpdated: (game: Game) => void }) => {
	const { t } = useTranslation()
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `item-${item.id}` })
	const toolbar = <div className='playlist-game__toolbar'>
		<button className='playlist-drag-handle' type='button' aria-label={t('playlists.dragToReorder')} {...attributes} {...listeners}><Grip /></button>
		<span className='playlist-game__position'>{item.position + 1}</span>
		<button type='button' className='playlist-game__remove' onClick={onRemove} aria-label={t('playlists.removeGame')}>×</button>
	</div>
	return <article ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`playlist-game playlist-game--${cardStyle}${isDragging ? ' is-dragging' : ''}${isDropTarget ? ' is-drop-target' : ''}`}>
		{cardStyle !== 'card' && toolbar}
		<GameCard game={item.game} variant={cardStyle} hideSelection={true} playlistControls={cardStyle === 'card' ? toolbar : undefined} onGameUpdated={onGameUpdated} />
	</article>
}

export default function Playlists() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const { id: routeId } = useParams<{ id?: string }>()
	const dispatch = useAppDispatch()
	const { playlists, currentPlaylist, reordering, fetchAll, fetchById, create, update, remove, reorder, addItem, removeItem, reorderItems, exportPlaylist, importPlaylist } = usePlaylists()
	const cardStyle = useAppSelector(state => state.theme.cardStyle ?? 'card')
	const statusOptions = useAppSelector(state => state.gameStatus.activeStatuses)
	const [pendingGame, setPendingGame] = useState<Game | null>(null)
	const [addStatusId, setAddStatusId] = useState<number | null>(null)
	const [adding, setAdding] = useState(false)
	const [addError, setAddError] = useState<string | null>(null)
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
	const [activeGameId, setActiveGameId] = useState<number | null>(null)
	const [overGameId, setOverGameId] = useState<number | null>(null)
	const searchRef = useRef<HTMLDivElement>(null)
	const menuRef = useRef<HTMLDivElement>(null)
	const menuPanelRef = useRef<HTMLDivElement>(null)
	const menuTriggerRef = useRef<HTMLButtonElement>(null)
	const importFileRef = useRef<HTMLInputElement>(null)
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
	const isFull = currentPlaylist?.maxLength != null && currentPlaylist.items.length >= currentPlaylist.maxLength

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
		if (!term || isFull) { setGameResults([]); setSearching(false); setSearchOpen(false); return }
		let cancelled = false
		setSearching(true)
		const timer = window.setTimeout(async () => {
			try { const result = await getGames({ search: term, page: 1, pageSize: 12 }); if (!cancelled) setGameResults(result.data) } catch { if (!cancelled) setGameResults([]) } finally { if (!cancelled) setSearching(false) }
		}, 250)
		return () => { cancelled = true; window.clearTimeout(timer) }
	}, [gameQuery, isFull])
	useEffect(() => {
		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target as Node
			if (!searchRef.current?.contains(target)) setSearchOpen(false)
			if (!menuRef.current?.contains(target) && !menuPanelRef.current?.contains(target)) setMenuOpen(false)
		}
		document.addEventListener('pointerdown', handlePointerDown)
		return () => document.removeEventListener('pointerdown', handlePointerDown)
	}, [])
	const menuPanel = menuOpen && typeof document !== 'undefined' && menuTriggerRef.current
		? createPortal(
				<div ref={menuPanelRef} className='playlist-menu__panel' style={{ top: menuTriggerRef.current.getBoundingClientRect().bottom + 8, left: menuTriggerRef.current.getBoundingClientRect().right - 190 }} onPointerDown={event => event.stopPropagation()}>
					<button type='button' onClick={() => { void handleExport(); setMenuOpen(false) }}>{t('playlists.export')}</button>
					<select value={exportReference} onChange={event => setExportReference(event.target.value as 'id' | 'name')} aria-label={t('playlists.exportReference')}><option value='id'>{t('playlists.byId')}</option><option value='name'>{t('playlists.byName')}</option></select>
					<button type='button' onClick={() => { setEditor('edit'); setMenuOpen(false) }}>{t('common.edit')}</button>
					<button type='button' onClick={() => { setDeleteId(currentPlaylist!.id); setMenuOpen(false) }}>{t('common.delete')}</button>
				</div>,
				document.body
			)
		: null

	const selectedGameIds = useMemo(() => new Set(currentPlaylist?.items.map(item => item.gameId) ?? []), [currentPlaylist])
	const selectedSummary = playlists.find(item => item.id === selectedId)
	const allowedStatuses = statusOptions.filter(status => !currentPlaylist?.rules?.statusIds.length || currentPlaylist.rules.statusIds.includes(status.id))
	const performAdd = async (game: Game, statusId?: number) => {
		if (!currentPlaylist || adding || isFull) return
		setAdding(true)
		setAddError(null)
		try {
			await addItem(currentPlaylist.id, game.id, statusId)
			setPendingGame(null)
			setGameQuery('')
			setSearchOpen(false)
		} catch (error) { setAddError(error instanceof Error ? error.message : String(error)) }
		finally { setAdding(false) }
	}
	const requestAdd = (game: Game) => {
		if (isFull) return
		if (currentPlaylist?.isAutomatic) {
			setPendingGame(game)
			setAddStatusId(allowedStatuses.some(status => status.id === game.statusId) ? game.statusId : null)
			setAddError(null)
		} else void performAdd(game)
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
		try {
			await reorderItems(currentPlaylist.id, ordered)
			if (currentPlaylist.isAutomatic) await fetchById(currentPlaylist.id)
		} catch { dispatch(setCurrentPlaylist(previous)) }
	}
	const handleGameUpdated = (updatedGame: Game) => {
		if (!currentPlaylist) return
		dispatch(setCurrentPlaylist({
			...currentPlaylist,
			items: currentPlaylist.items.map(item => item.gameId === updatedGame.id ? { ...item, game: updatedGame } : item),
		}))
	}
	const handleDragStart = ({ active }: DragStartEvent) => {
		const value = String(active.id)
		if (value.startsWith('item-')) setActiveGameId(Number(value.replace('item-', '')))
	}
	const handleDragCancel = () => {
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
				<PlaylistLibrary playlists={playlists} selectedId={selectedId} onSelect={id => { setSelectedId(id); navigate(`/playlists/${id}`) }} onRefresh={fetchAll} onReorder={reorder} />
			</div>
			<section className='playlist-detail'>
				{currentPlaylist && playlistMatchesRoute ? <>
					<div className='playlist-hero'>
						<PlaylistHeroImage src={currentPlaylist.heroUrl ?? currentPlaylist.coverUrl} />
						<div className='playlist-hero__shade' aria-hidden='true' />
						<div className='playlist-hero__top'>{currentPlaylist.logoUrl && <div className='playlist-hero__logo'><OptimizedImage src={currentPlaylist.logoUrl} alt='' width={160} height={64} /></div>}<div className='playlist-menu' ref={menuRef}><button ref={menuTriggerRef} type='button' className='playlist-menu__trigger' aria-label={t('playlists.options')} aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}><MoreIcon /></button></div></div>
						<div className='playlist-hero__content'><div className='playlist-hero__copy'><span>{t('playlists.playlistLabel')}</span><h2>{currentPlaylist.name}</h2>{currentPlaylist.description && <PlaylistDescription description={currentPlaylist.description} />}</div></div>
						{currentPlaylist.isAutomatic && <span className='playlist-hero__automatic'>{t('playlists.automatic')}</span>}
					</div>
					<div className='playlist-tools'><div className='playlist-view-toggle' role='group' aria-label={t('playlists.viewMode')}>
						{(['row', 'card', 'cover'] as const).map(mode => <button key={mode} type='button' className={cardStyle === mode ? 'is-active' : ''} onClick={() => dispatch(setCardStyle(mode))}>{t(`playlists.views.${mode}`)}</button>)}
					</div><div className='playlist-search-area' ref={searchRef}><label className='playlist-search'><SearchIcon /><input disabled={isFull || adding} value={gameQuery} onFocus={() => setSearchOpen(true)} onChange={event => { setSearchOpen(true); setGameQuery(event.target.value) }} placeholder={t(isFull ? 'playlists.listFull' : 'playlists.addPlaceholder')} /></label>
					{searchOpen && gameQuery && <div className='playlist-search-results' aria-live='polite'>{searching ? <div className='playlist-search-results__status'><span className='playlist-search-results__spinner' aria-hidden='true' />{t('common.loading')}</div> : gameResults.length ? gameResults.map(game => <button key={game.id} type='button' disabled={selectedGameIds.has(game.id) || adding} onClick={() => requestAdd(game)}><span>{game.name}</span><small>{selectedGameIds.has(game.id) ? t('playlists.added') : t('playlists.add')}</small></button>) : <div className='playlist-search-results__status'>{t('playlists.noSearchResults')}</div>}</div>}</div></div>
					{addError && !pendingGame && <p role='alert' className='playlist-import__error'>{addError}</p>}
					{currentPlaylist.maxLength != null && <p className='playlist-capacity' role='status'>{t('playlists.capacity', { count: currentPlaylist.items.length, max: currentPlaylist.maxLength })}{isFull && <> · {t('playlists.capacityHint')}</>}</p>}
					<DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={cardStyle === 'row' ? [restrictToVerticalAxis, restrictToParentElement] : []} onDragStart={handleDragStart} onDragCancel={handleDragCancel} onDragOver={({ over }) => setOverGameId(over ? Number(String(over.id).replace('item-', '')) : null)} onDragEnd={handleGameDrag}>
						<SortableContext items={currentPlaylist.items.map(item => `item-${item.id}`)} strategy={cardStyle === 'row' ? verticalListSortingStrategy : rectSortingStrategy}>
							<div className={`playlist-games playlist-games--${cardStyle}`}>{currentPlaylist.items.map(item => <SortableGame key={item.id} item={item} cardStyle={cardStyle} isDropTarget={!currentPlaylist.isAutomatic && overGameId === item.id && activeGameId !== item.id} onRemove={() => void removeItem(currentPlaylist.id, item.id)} onGameUpdated={handleGameUpdated} />)}</div>
						</SortableContext>
						{createPortal(<DragOverlay adjustScale={false} dropAnimation={{ duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' }}>{activeGame ? <div className='playlist-game-preview playlist-game-preview--visual'>{activeGame.hero && <OptimizedImage src={activeGame.hero} alt='' width={480} height={240} />}<strong>{activeGame.name}</strong></div> : null}</DragOverlay>, document.body)}
					</DndContext>
					{reordering && <div className='playlist-reorder-status' role='status'>{t('playlists.reordering')}</div>}
					{!currentPlaylist.items.length && <div className='playlist-games__empty'><h3>{t('playlists.noGames')}</h3><p>{t('playlists.noGamesHint')}</p></div>}
				</> : <div className='playlist-detail__empty'><h2>{t('playlists.select')}</h2><p>{t('playlists.selectHint')}</p></div>}
			</section>
		</div>
		{menuPanel}
		<Modal isOpen={pendingGame !== null} onClose={() => { if (!adding) setPendingGame(null) }} title={t('playlists.addAutomaticTitle')} maxWidth='540px'>
			<div className='playlist-add-dialog'>
				<h3>{pendingGame?.name}</h3>
				<p>{t('playlists.addAutomaticHint', { playlist: currentPlaylist?.name, status: pendingGame?.statusName ?? '' })}</p>
				<fieldset><legend>{t('playlists.assignStatus')}</legend>{allowedStatuses.map(status => <label key={status.id}><input type='radio' name='playlist-add-status' checked={addStatusId === status.id} onChange={() => setAddStatusId(status.id)} disabled={adding} /><span style={{ borderLeftColor: status.color }}>{status.name}</span></label>)}</fieldset>
				<p className='playlist-add-dialog__hint'>{t('playlists.otherRulesHint')}</p>
				{addError && <p role='alert' className='playlist-import__error'>{addError}</p>}
				<div className='playlist-form__actions'><button type='button' className='playlist-button playlist-button--quiet' disabled={adding} onClick={() => setPendingGame(null)}>{t('playlists.doNotAdd')}</button><button type='button' className='playlist-button playlist-button--primary' disabled={adding || isFull || addStatusId === null} onClick={() => pendingGame && void performAdd(pendingGame, addStatusId!)}>{t(adding ? 'common.saving' : 'playlists.confirmAdd')}</button></div>
			</div>
		</Modal>
		<Modal isOpen={editor !== null} onClose={() => setEditor(null)} title={editor === 'edit' ? t('playlists.edit') : t('playlists.new')} maxWidth='760px'><PlaylistForm initial={editor === 'edit' ? currentPlaylist : null} onClose={() => setEditor(null)} onSave={savePlaylist} /></Modal>
		<Modal isOpen={importOpen} onClose={() => setImportOpen(false)} title={t('playlists.import')} maxWidth='760px'><div className='playlist-import'><p>{t('playlists.importHint')}</p><input ref={importFileRef} className='playlist-import__file-input' type='file' accept='application/json,.json' onChange={handleImportFile} /><button type='button' className='playlist-button playlist-button--quiet playlist-import__file-button' onClick={() => importFileRef.current?.click()}>{t('playlists.chooseFile')}</button>{importFileName && <span className='playlist-import__file-name'>{importFileName}</span>}<textarea value={importText} onChange={event => { setImportText(event.target.value); setImportFileName(null) }} rows={14} placeholder={t('playlists.jsonPlaceholder')} />{transferError && <p className='playlist-import__error'>{transferError}</p>}<div className='playlist-form__actions'><button type='button' className='playlist-button playlist-button--quiet' onClick={() => setImportOpen(false)}>{t('common.cancel')}</button><button type='button' className='playlist-button playlist-button--primary' onClick={() => void handleImport()}>{t('playlists.import')}</button></div></div></Modal>
		<ConfirmDialog isOpen={deleteId !== null} title={t('playlists.deleteTitle')} message={t('playlists.deleteMessage', { name: selectedSummary?.name ?? '' })} onCancel={() => setDeleteId(null)} onConfirm={() => void handleDelete()} confirmLabel={t('common.delete')} />
	</main>
}
