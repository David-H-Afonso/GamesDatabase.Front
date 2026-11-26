import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCardStyle } from '@/store/features/theme/themeSlice'
import { usePlaylists } from '@/hooks'
import { setCurrentPlaylist } from '@/store/features/playlists'
import { getGames } from '@/services/GamesService/GamesService'
import { ConfirmDialog, Modal, OptimizedImage } from '@/components/elements'
import { GameCard } from '@/components/elements/GameCard/GameCard'
import type { Game } from '@/models/api/Game'
import type { Playlist, PlaylistCreateDto, PlaylistItem, PlaylistTransfer } from '@/models/api/Playlist'
import './Playlists.scss'
import PlaylistLibrary from './PlaylistLibrary'
import { PlaylistForm } from './PlaylistForm'
import { CollectionSheet } from '@/components/Collection/CollectionSheet'
import { CollectionIcon } from '@/components/Collection/CollectionIcon'
import { GameArtwork } from '@/components/Collection/GameArtwork'
import './GalleryPlaylists.scss'
import { getPlaylistGroups, movePlaylistToGroup } from '@/services/PlaylistService/PlaylistGroupService'
import { useCollectionResource } from '@/hooks/useCollectionResource'
import { effectivePlaytime } from '@/utils/collectionFormatting'
import { useDisplayedGames } from '@/hooks/useDisplayedGames'
import { CollectionMenu } from '@/components/Collection/CollectionMenu'

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
	return (
		<>
			<p className='playlist-hero__description-desktop' title={description}>
				{description}
			</p>
			<details className='playlist-hero__description-mobile'>
				<summary>{t('playlists.showDescription')}</summary>
				<p>{description}</p>
			</details>
		</>
	)
}

const PlaylistHeroImage = ({ src }: { src?: string }) => {
	const [failed, setFailed] = useState(false)
	if (!src || failed) return null
	return <img className='playlist-hero__background' src={src} alt='' aria-hidden='true' onError={() => setFailed(true)} />
}

const SortableGame = ({
	item,
	cardStyle,
	canReorder,
	isDropTarget,
	onRemove,
	onGameUpdated,
	onMoveUp,
	onMoveDown,
}: {
	item: PlaylistItem
	cardStyle: 'card' | 'row' | 'cover'
	canReorder: boolean
	isDropTarget: boolean
	onRemove: () => void
	onGameUpdated: (game: Game) => void
	onMoveUp?: () => void
	onMoveDown?: () => void
}) => {
	const { t } = useTranslation()
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `item-${item.id}`, disabled: !canReorder })
	const toolbar = (
		<div className='playlist-game__toolbar'>
			<button className='playlist-drag-handle' type='button' disabled={!canReorder} aria-label={`${t('playlists.dragToReorder')}: ${item.game.name}`} {...attributes} {...listeners}>
				<Grip />
			</button>
			<span className='playlist-game__position'>{item.position + 1}</span>
			<CollectionMenu label={`${t('gallery.playlist.itemOptions')}: ${item.game.name}`} className='gdb-playlist-item-order'>
				{close => <>
					<button type='button' disabled={!canReorder || !onMoveUp} onClick={() => { close(); onMoveUp?.() }}>
						<CollectionIcon name='up' />
						{t('common.moveUp')}
					</button>
					<button type='button' disabled={!canReorder || !onMoveDown} onClick={() => { close(); onMoveDown?.() }}>
						<CollectionIcon name='down' />
						{t('common.moveDown')}
					</button>
					{!canReorder && <p>{t('gallery.playlist.orderRequired')}</p>}
					<button type='button' onClick={() => { close(); onRemove() }}><CollectionIcon name='close' />{t('playlists.removeGame')}</button>
				</>}
			</CollectionMenu>
		</div>
	)
	return (
		<article
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			className={`playlist-game playlist-game--${cardStyle}${isDragging ? ' is-dragging' : ''}${isDropTarget ? ' is-drop-target' : ''}`}>
			{toolbar}
			<GameCard game={item.game} variant={cardStyle} hideSelection={true} onGameUpdated={onGameUpdated} />
		</article>
	)
}

export default function Playlists() {
	const { t } = useTranslation()
	const groups = useCollectionResource('playlist-group-names', () => getPlaylistGroups())
	const navigate = useNavigate()
	const location = useLocation(),
		folderId = Number(new URLSearchParams(location.search).get('folder')) || null
	const { id: routeId } = useParams<{ id?: string }>()
	const dispatch = useAppDispatch()
	const {
		playlists,
		currentPlaylist,
		reordering,
		loading,
		error: playlistError,
		fetchAll,
		fetchById,
		create,
		update,
		remove,
		reorder,
		addItem,
		removeItem,
		reorderItems,
		exportPlaylist,
		importPlaylist,
	} = usePlaylists()
	const cardStyle = useAppSelector((state) => state.theme.cardStyle ?? 'card')
	const statusOptions = useAppSelector((state) => state.gameStatus.activeStatuses)
	const [pendingGame, setPendingGame] = useState<Game | null>(null)
	const [addStatusId, setAddStatusId] = useState<number | null>(null)
	const [adding, setAdding] = useState(false)
	const [addError, setAddError] = useState<string | null>(null)
	const routePlaylistId = routeId && Number.isInteger(Number(routeId)) ? Number(routeId) : null
	const [selectedId, setSelectedId] = useState<number | null>(routePlaylistId)
	const [editor, setEditor] = useState<'create' | 'edit' | null>(null)
	const [deleteId, setDeleteId] = useState<number | null>(null)
	const [deleting, setDeleting] = useState(false)
	const deletePending = useRef(false)
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
	const [addOpen, setAddOpen] = useState(false),
		[displayOrder, setDisplayOrder] = useState('position')
	const [moveRequest, setMoveRequest] = useState<{ id: number }>()
	const [editRequest, setEditRequest] = useState<number | null>(null)
	const createdDraft = useRef<Playlist | null>(null)
	const [activeGameId, setActiveGameId] = useState<number | null>(null)
	const [overGameId, setOverGameId] = useState<number | null>(null)
	const searchRef = useRef<HTMLDivElement>(null)
	const menuRef = useRef<HTMLDivElement>(null)
	const menuPanelRef = useRef<HTMLDivElement>(null)
	const menuTriggerRef = useRef<HTMLButtonElement>(null)
	const importFileRef = useRef<HTMLInputElement>(null)
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
	const isFull = currentPlaylist?.maxLength != null && currentPlaylist.items.length >= currentPlaylist.maxLength

	useEffect(() => {
		void fetchAll().catch(() => { /* The thunk exposes the failure through playlistError and Retry. */ })
	}, [fetchAll])
	useEffect(() => {
		setSelectedId(routePlaylistId)
	}, [routePlaylistId])
	useEffect(() => {
		if (selectedId === null && !routePlaylistId && playlists.length) {
			const first = folderId ? playlists.find((value) => value.groupId === folderId) : playlists[0]
			if (first) navigate(`/playlists/${first.id}${location.search}`, { replace: true })
			return
		}
	}, [navigate, playlists, selectedId, routePlaylistId, folderId, location.search])
	useEffect(() => {
		if (selectedId !== null) void fetchById(selectedId).catch(() => { /* Keep the rejected read visible through Redux, not an unhandled promise. */ })
	}, [selectedId, fetchById])
	useEffect(() => {
		setDisplayOrder('position')
		setAddOpen(false)
		setGameQuery('')
		setMenuOpen(false)
	}, [selectedId])
	useEffect(() => {
		if (!editor) createdDraft.current = null
	}, [editor])
	useEffect(() => {
		if (menuOpen) menuPanelRef.current?.querySelector('button')?.focus()
	}, [menuOpen])
	const playlistMatchesRoute = selectedId !== null && currentPlaylist?.id === selectedId && (routePlaylistId === null || currentPlaylist.id === routePlaylistId)
	useEffect(() => {
		if (editRequest !== null && playlistMatchesRoute && currentPlaylist?.id === editRequest) { setEditor('edit'); setEditRequest(null) }
	}, [editRequest, currentPlaylist?.id, playlistMatchesRoute])
	useEffect(() => {
		const term = gameQuery.trim()
		if (!term || isFull) {
			setGameResults([])
			setSearching(false)
			setSearchOpen(false)
			return
		}
		let cancelled = false
		setSearching(true)
		const timer = window.setTimeout(async () => {
			try {
				const result = await getGames({ search: term, page: 1, pageSize: 12 })
				if (!cancelled) setGameResults(result.data)
			} catch {
				if (!cancelled) setGameResults([])
			} finally {
				if (!cancelled) setSearching(false)
			}
		}, 250)
		return () => {
			cancelled = true
			window.clearTimeout(timer)
		}
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
	const menuPanel =
		menuOpen && typeof document !== 'undefined' && menuTriggerRef.current
			? createPortal(
					<div
						ref={menuPanelRef}
						className='playlist-menu__panel'
						role='dialog'
						aria-label={t('playlists.options')}
						style={{
							top: menuTriggerRef.current.getBoundingClientRect().bottom + 8,
							left: Math.max(12, Math.min(window.innerWidth - 202, menuTriggerRef.current.getBoundingClientRect().right - 190)),
						}}
						onKeyDown={(event) => {
							if (event.key === 'Escape') {
								event.preventDefault()
								setMenuOpen(false)
								menuTriggerRef.current?.focus()
							}
						}}
						onPointerDown={(event) => event.stopPropagation()}>
						<button
							type='button'
							onClick={() => {
								void handleExport()
								setMenuOpen(false)
							}}>
							{t('playlists.export')}
						</button>
						<select value={exportReference} onChange={(event) => setExportReference(event.target.value as 'id' | 'name')} aria-label={t('playlists.exportReference')}>
							<option value='id'>{t('playlists.byId')}</option>
							<option value='name'>{t('playlists.byName')}</option>
						</select>
						<button
							type='button'
							onClick={() => {
								setEditor('edit')
								setMenuOpen(false)
								menuTriggerRef.current?.focus()
							}}>
							{t('common.edit')}
						</button>
						<button
							type='button'
							onClick={() => {
								setImportOpen(true)
								setMenuOpen(false)
								menuTriggerRef.current?.focus()
							}}>
							{t('playlists.import')}
						</button>
						<button
							type='button'
							onClick={() => {
								setDeleteId(currentPlaylist!.id)
								setMenuOpen(false)
								menuTriggerRef.current?.focus()
							}}>
							{t('common.delete')}
						</button>
					</div>,
					document.body
				)
			: null

	const selectedGameIds = useMemo(() => new Set(currentPlaylist?.items.map((item) => item.gameId) ?? []), [currentPlaylist])
	const selectedSummary = playlists.find((item) => item.id === selectedId)
	const groupName = groups.data?.find((group) => group.id === selectedSummary?.groupId)?.name
	const displayItems = useMemo(() => {
		const items = currentPlaylist?.items ?? []
		if (displayOrder === 'position') return items
		return [...items].sort((a, b) =>
			displayOrder === 'name'
				? a.game.name.localeCompare(b.game.name)
				: displayOrder === 'grade'
					? (b.game.grade ?? -1) - (a.game.grade ?? -1)
					: (effectivePlaytime(b.game) ?? -1) - (effectivePlaytime(a.game) ?? -1)
		)
	}, [currentPlaylist, displayOrder])
	useDisplayedGames(playlistMatchesRoute ? displayItems.map(item => item.game) : [], `playlist:${selectedId}:${displayOrder}`, loading || !playlistMatchesRoute)
	const allowedStatuses = statusOptions.filter((status) => (!currentPlaylist?.rules?.statusIds.length || currentPlaylist.rules.statusIds.includes(status.id)) && (!currentPlaylist?.rules?.playingNow || status.statusType === 'Playing'))
	const performAdd = async (game: Game, statusId?: number) => {
		if (!currentPlaylist || adding || isFull) return
		setAdding(true)
		setAddError(null)
		try {
			await addItem(currentPlaylist.id, game.id, statusId)
			setPendingGame(null)
			setGameQuery('')
			setSearchOpen(false)
		} catch (error) {
			setAddError(error instanceof Error ? error.message : String(error))
		} finally {
			setAdding(false)
		}
	}
	const requestAdd = (game: Game) => {
		if (isFull) return
		if (currentPlaylist?.isAutomatic) {
			setPendingGame(game)
			setAddStatusId(allowedStatuses.some((status) => status.id === game.statusId) ? game.statusId : null)
			setAddError(null)
		} else void performAdd(game)
	}

	const handleGameDrag = async ({ active, over }: DragEndEvent) => {
		setActiveGameId(null)
		setOverGameId(null)
		if (!currentPlaylist || !over || active.id === over.id) return
		const ids = currentPlaylist.items.map((item) => item.id)
		const from = ids.findIndex((id) => `item-${id}` === active.id)
		const to = ids.findIndex((id) => `item-${id}` === over.id)
		if (from < 0 || to < 0) return
		await changeGameOrder(from, to)
	}
	const changeGameOrder = async (from: number, to: number) => {
		if (!currentPlaylist || reordering || from < 0 || to < 0 || to >= currentPlaylist.items.length) return
		const ids = currentPlaylist.items.map((item) => item.id)
		const ordered = arrayMove(ids, from, to)
		const previous = currentPlaylist
		const optimistic = { ...currentPlaylist, items: ordered.map((id, position) => ({ ...currentPlaylist.items.find((item) => item.id === id)!, position })) }
		dispatch(setCurrentPlaylist(optimistic))
		try {
			await reorderItems(currentPlaylist.id, ordered)
			if (currentPlaylist.isAutomatic) await fetchById(currentPlaylist.id)
		} catch {
			dispatch(setCurrentPlaylist(previous))
		}
	}
	const handleGameUpdated = (updatedGame: Game) => {
		if (!currentPlaylist) return
		dispatch(
			setCurrentPlaylist({
				...currentPlaylist,
				items: currentPlaylist.items.map((item) => (item.gameId === updatedGame.id ? { ...item, game: updatedGame } : item)),
			})
		)
	}
	const handleDragStart = ({ active }: DragStartEvent) => {
		const value = String(active.id)
		if (value.startsWith('item-')) setActiveGameId(Number(value.replace('item-', '')))
	}
	const handleDragCancel = () => {
		setActiveGameId(null)
		setOverGameId(null)
	}

	const savePlaylist = async (data: PlaylistCreateDto, groupId: number | null) => {
		let saved = currentPlaylist
		if (editor === 'create') {
			// A failed folder move must not make a retry create a duplicate playlist.
			if (createdDraft.current) saved = (await update(createdDraft.current.id, data)) as Playlist
			else {
				saved = (await create(data)) as Playlist
				createdDraft.current = saved
			}
		} else if (selectedId !== null) saved = (await update(selectedId, data)) as Playlist
		if (saved && (saved.groupId ?? null) !== groupId) await movePlaylistToGroup(saved.id, groupId)
		await fetchAll()
		if (saved) {
			setSelectedId(saved.id)
			await fetchById(saved.id)
			if (editor === 'create') navigate(`/playlists/${saved.id}`)
		}
		setEditor(null)
	}

	const handleDelete = async () => {
		if (deleteId === null || deletePending.current) return
		deletePending.current = true
		setDeleting(true)
		try {
			await remove(deleteId)
			setDeleteId(null)
			navigate('/playlists')
		} catch {
			// Redux retains the error; the confirmation remains open for review/retry.
		} finally {
			deletePending.current = false
			setDeleting(false)
		}
	}
	const handleExport = async () => {
		if (!currentPlaylist) return
		try {
			const transfer = (await exportPlaylist(currentPlaylist.id, exportReference)) as PlaylistTransfer
			const blob = new Blob([JSON.stringify(transfer, null, 2)], { type: 'application/json' })
			const url = URL.createObjectURL(blob)
			const anchor = document.createElement('a')
			anchor.href = url
			anchor.download = `${currentPlaylist.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`
			anchor.click()
			URL.revokeObjectURL(url)
		} catch (error) {
			setTransferError(error instanceof Error ? error.message : t('playlists.transferError'))
		}
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
		} catch (error) {
			setTransferError(error instanceof Error ? error.message : t('playlists.transferError'))
		}
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

	const activeGame = currentPlaylist?.items.find((item) => item.id === activeGameId)?.game
	return (
		<section className='playlists-page gdb-page' aria-busy={loading || (!playlistError && selectedId !== null && !playlistMatchesRoute)}>
			<div className='playlists-layout'>
				<div className='playlists-sidebar'>
					<PlaylistLibrary
						playlists={playlists}
						selectedId={selectedId}
						loading={loading}
						moveRequest={moveRequest}
						onCreate={() => setEditor('create')}
						onImport={() => setImportOpen(true)}
						onSelect={(id) => {
							setSelectedId(id)
							navigate(`/playlists/${id}`)
						}}
						onRefresh={fetchAll}
						onReorder={reorder}
						onEdit={id => { setEditRequest(id); setSelectedId(id); navigate(`/playlists/${id}`) }}
					/>
				</div>
				<section className='playlist-detail'>
					{currentPlaylist && playlistMatchesRoute ? (
						<>
							<div className={`playlist-hero ${currentPlaylist.heroUrlOverride ? 'has-custom-art' : ''}`}>
								<PlaylistHeroImage src={currentPlaylist.heroUrlOverride || undefined} />
								{!currentPlaylist.heroUrlOverride && (
									<div className='gdb-playlist-collage' aria-hidden='true'>
										{currentPlaylist.coverUrlOverride ? (
											<img src={currentPlaylist.coverUrlOverride} alt='' />
										) : (
											currentPlaylist.items.slice(0, 4).map((item) => (
												<span key={item.gameId}>
													<GameArtwork game={item.game} decorative />
												</span>
											))
										)}
									</div>
								)}
								<div className='playlist-hero__shade' aria-hidden='true' />
								<div className='playlist-hero__content'>
									<div className='playlist-hero__copy'>
										<span className='playlist-kind'>
											<CollectionIcon name={currentPlaylist.isAutomatic ? 'auto' : 'playlists'} />
											{t(currentPlaylist.isAutomatic ? 'playlists.automatic' : 'gallery.playlist.manual')}
											{groupName ? ` · ${groupName}` : ''}
										</span>
										{currentPlaylist.logoUrlOverride && (
											<div className='playlist-hero__logo'>
												<OptimizedImage src={currentPlaylist.logoUrlOverride} alt='' width={160} height={64} />
											</div>
										)}
										<h1>{currentPlaylist.name}</h1>
										{currentPlaylist.description && <PlaylistDescription description={currentPlaylist.description} />}
										<div className='playlist-identity-actions'>
											<button type='button' className='gdb-text-button' onClick={() => setEditor('edit')}>
												<CollectionIcon name='edit' />
												{t('gallery.playlist.edit')}
											</button>
											{currentPlaylist.isAutomatic && (
												<button type='button' className='gdb-text-button' onClick={() => setEditor('edit')}>
													<CollectionIcon name='filter' />
													{t('gallery.playlist.editRules')}
												</button>
											)}
											<button type='button' className='gdb-text-button' onClick={() => setMoveRequest({ id: currentPlaylist.id })}>
												<CollectionIcon name='folder' />
												{t('gallery.playlist.move')}
											</button>
										</div>
									</div>
								</div>
							</div>
							<div className='playlist-tools'>
								<span className='playlist-count'>{t('gallery.common.games', { count: currentPlaylist.items.length })}</span>
								<button type='button' className='gdb-button playlist-add' disabled={isFull} onClick={() => setAddOpen(true)}>
									<CollectionIcon name='plus' />
									{t('playlists.add')}
								</button>
								<label className='playlist-display-order'>
									<CollectionIcon name='sort' />
									<span className='sr-only'>{t('gallery.library.order')}</span>
									<select
										value={displayOrder}
										onChange={(event) => {
											setDisplayOrder(event.target.value)
										}}>
										<option value='position'>{t('gallery.playlist.listOrder')}</option>
										<option value='name'>{t('gallery.library.rowGame')}</option>
										<option value='grade'>{t('gallery.library.rowGrade')}</option>
										<option value='time'>{t('gallery.library.rowPlaytime')}</option>
									</select>
								</label>
								<div className='playlist-view-toggle' role='group' aria-label={t('playlists.viewMode')}>
									{(['card', 'row', 'cover'] as const).map((mode) => (
										<button
											key={mode}
											type='button'
											aria-label={t(`playlists.views.${mode}`)}
											title={t(`playlists.views.${mode}`)}
											aria-pressed={cardStyle === mode}
											className={cardStyle === mode ? 'is-active' : ''}
											onClick={() => dispatch(setCardStyle(mode))}>
											<CollectionIcon name={mode === 'card' ? 'cards' : mode === 'cover' ? 'covers' : 'row'} />
										</button>
									))}
								</div>
								<div className='playlist-menu' ref={menuRef}>
									<button
										ref={menuTriggerRef}
										type='button'
										className='playlist-menu__trigger gdb-icon-button'
										aria-label={t('playlists.options')}
										aria-haspopup='dialog'
										aria-expanded={menuOpen}
										onClick={() => setMenuOpen((value) => !value)}>
										<span className='playlist-menu__count'>{t('gallery.common.games', { count: currentPlaylist.items.length })}</span>
										<MoreIcon />
									</button>
								</div>
							</div>
							{playlistError && <p role='alert' className='gdb-error'>{t('gallery.common.saveError')}</p>}
							{transferError && !importOpen && <p role='alert' className='gdb-error'>{t('playlists.transferError')}</p>}
							{addError && !pendingGame && (
								<p role='alert' className='playlist-import__error'>
									{addError}
								</p>
							)}
							{currentPlaylist.maxLength != null && (
								<p className='playlist-capacity' role='status'>
									{t('playlists.capacity', { count: currentPlaylist.items.length, max: currentPlaylist.maxLength })}
									{isFull && <> · {t('playlists.capacityHint')}</>}
								</p>
							)}
							<DndContext
								sensors={sensors}
								collisionDetection={closestCenter}
								modifiers={cardStyle === 'row' ? [restrictToVerticalAxis, restrictToParentElement] : []}
								onDragStart={handleDragStart}
								onDragCancel={handleDragCancel}
								onDragOver={({ over }) => setOverGameId(over ? Number(String(over.id).replace('item-', '')) : null)}
								onDragEnd={handleGameDrag}>
								<SortableContext items={currentPlaylist.items.map((item) => `item-${item.id}`)} strategy={cardStyle === 'row' ? verticalListSortingStrategy : rectSortingStrategy}>
									<div className={`playlist-games playlist-games--${cardStyle}`}>
										{cardStyle === 'row' && (
											<div className='gdb-row-heading'>
												<span>{t('gallery.library.rowGame')}</span>
												<span>{t('gallery.library.rowStory')}</span>
												<span>{t('gallery.library.rowPlaytime')}</span>
												<span>{t('gallery.library.rowGrade')}</span>
												<span>{t('home.columns.critic')}</span>
												<span>{t('home.columns.score')}</span>
												<span />
											</div>
										)}
										{displayItems.map((item, index) => (
											<SortableGame
												key={item.id}
												item={item}
												cardStyle={cardStyle}
												canReorder={displayOrder === 'position' && !reordering}
												isDropTarget={overGameId === item.id && activeGameId !== item.id}
												onRemove={() => { void removeItem(currentPlaylist.id, item.id).catch(() => { /* The rejected thunk leaves membership unchanged and renders playlistError. */ }) }}
												onGameUpdated={handleGameUpdated}
												onMoveUp={
													index > 0 && !reordering
														? () => {
																void changeGameOrder(index, index - 1)
															}
														: undefined
												}
												onMoveDown={
													index < currentPlaylist.items.length - 1 && !reordering
														? () => {
																void changeGameOrder(index, index + 1)
															}
														: undefined
												}
											/>
										))}
									</div>
								</SortableContext>
								{createPortal(
									<DragOverlay adjustScale={false} dropAnimation={{ duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' }}>
										{activeGame ? (
											<div className='playlist-game-preview playlist-game-preview--visual'>
												{activeGame.hero && <OptimizedImage src={activeGame.hero} alt='' width={480} height={240} />}
												<strong>{activeGame.name}</strong>
											</div>
										) : null}
									</DragOverlay>,
									document.body
								)}
							</DndContext>
							{reordering && (
								<div className='playlist-reorder-status' role='status'>
									{t('playlists.reordering')}
								</div>
							)}
							{!currentPlaylist.items.length && (
								<div className='playlist-games__empty'>
									<h3>{t('playlists.noGames')}</h3>
									<p>{t('playlists.noGamesHint')}</p>
								</div>
							)}
						</>
					) : playlistError ? (
						<div className='playlist-detail__empty' role='alert'>
							<h2>{t('gallery.common.loadError')}</h2>
							<button
								type='button'
								className='gdb-button'
								onClick={() => {
									if (selectedId !== null) void fetchById(selectedId).catch(() => { /* The retry error stays visible. */ })
									else void fetchAll().catch(() => { /* The retry error stays visible. */ })
								}}>
								{t('gallery.common.retry')}
							</button>
						</div>
					) : loading || selectedId !== null ? (
						<div className='playlist-detail__empty' role='status'>
							{t('gallery.common.loading')}
						</div>
					) : (
						<div className='playlist-detail__empty'>
							<h2>{t('playlists.select')}</h2>
							<p>{t('playlists.selectHint')}</p>
						</div>
					)}
				</section>
			</div>
			{menuPanel}
			<CollectionSheet open={addOpen} onClose={() => setAddOpen(false)} title={t('playlists.addPlaceholder')} subtitle={currentPlaylist?.name} className='gdb-playlist-add-sheet'>
				<div className='playlist-search-area' ref={searchRef}>
					<label className='playlist-search'>
						<SearchIcon />
						<span className='sr-only'>{t('playlists.addPlaceholder')}</span>
						<input
							disabled={isFull || adding}
							value={gameQuery}
							onFocus={() => setSearchOpen(true)}
							onChange={(event) => {
								setSearchOpen(true)
								setGameQuery(event.target.value)
							}}
							placeholder={t(isFull ? 'playlists.listFull' : 'playlists.addPlaceholder')}
						/>
					</label>
					{searchOpen && gameQuery && (
						<div className='playlist-search-results' aria-live='polite'>
							{searching ? (
								<div className='playlist-search-results__status'>{t('common.loading')}</div>
							) : gameResults.length ? (
								gameResults.map((game) => (
									<button key={game.id} type='button' disabled={selectedGameIds.has(game.id) || adding} onClick={() => requestAdd(game)}>
										<span className='gdb-mini-cover'>
											<GameArtwork game={game} />
										</span>
										<span>{game.name}</span>
										<small>{selectedGameIds.has(game.id) ? t('playlists.added') : t('playlists.add')}</small>
									</button>
								))
							) : (
								<div className='playlist-search-results__status'>{t('playlists.noSearchResults')}</div>
							)}
						</div>
					)}
					{addError && !pendingGame && (
						<p className='gdb-error' role='alert'>
							{addError}
						</p>
					)}
				</div>
			</CollectionSheet>
			<Modal
				isOpen={pendingGame !== null}
				onClose={() => {
					if (!adding) setPendingGame(null)
				}}
				title={t('playlists.addAutomaticTitle')}
				maxWidth='540px'>
				<div className='playlist-add-dialog'>
					<h3>{pendingGame?.name}</h3>
					<p>{t('playlists.addAutomaticHint', { playlist: currentPlaylist?.name, status: pendingGame?.statusName ?? '' })}</p>
					<fieldset>
						<legend>{t('playlists.assignStatus')}</legend>
						{allowedStatuses.map((status) => (
							<label key={status.id}>
								<input type='radio' name='playlist-add-status' checked={addStatusId === status.id} onChange={() => setAddStatusId(status.id)} disabled={adding} />
								<span style={{ borderLeftColor: status.color }}>{status.name}</span>
							</label>
						))}
					</fieldset>
					<p className='playlist-add-dialog__hint'>{t('playlists.otherRulesHint')}</p>
					{addError && (
						<p role='alert' className='playlist-import__error'>
							{addError}
						</p>
					)}
					<div className='playlist-form__actions'>
						<button type='button' className='playlist-button playlist-button--quiet' disabled={adding} onClick={() => setPendingGame(null)}>
							{t('playlists.doNotAdd')}
						</button>
						<button
							type='button'
							className='playlist-button playlist-button--primary'
							disabled={adding || isFull || addStatusId === null}
							onClick={() => pendingGame && void performAdd(pendingGame, addStatusId!)}>
							{t(adding ? 'common.saving' : 'playlists.confirmAdd')}
						</button>
					</div>
				</div>
			</Modal>
			<CollectionSheet
				open={editor !== null}
				onClose={() => setEditor(null)}
				title={editor === 'edit' ? t('gallery.rules.editorTitle') : t('gallery.rules.newTitle')}
				subtitle={editor === 'edit' ? currentPlaylist?.name : undefined}
				wide
				className='gdb-playlist-editor'>
				{editor && (
					<PlaylistForm
						key={`${editor}:${currentPlaylist?.id ?? ''}`}
						groups={groups.data ?? []}
						initial={editor === 'edit' ? currentPlaylist : null}
						onClose={() => setEditor(null)}
						onSave={savePlaylist}
					/>
				)}
			</CollectionSheet>
			<Modal isOpen={importOpen} onClose={() => setImportOpen(false)} title={t('playlists.import')} maxWidth='760px'>
				<div className='playlist-import'>
					<p>{t('playlists.importHint')}</p>
					<input ref={importFileRef} className='playlist-import__file-input' type='file' accept='application/json,.json' onChange={handleImportFile} />
					<button type='button' className='playlist-button playlist-button--quiet playlist-import__file-button' onClick={() => importFileRef.current?.click()}>
						{t('playlists.chooseFile')}
					</button>
					{importFileName && <span className='playlist-import__file-name'>{importFileName}</span>}
					<textarea
						value={importText}
						onChange={(event) => {
							setImportText(event.target.value)
							setImportFileName(null)
						}}
						rows={14}
						placeholder={t('playlists.jsonPlaceholder')}
					/>
					{transferError && <p className='playlist-import__error'>{transferError}</p>}
					<div className='playlist-form__actions'>
						<button type='button' className='playlist-button playlist-button--quiet' onClick={() => setImportOpen(false)}>
							{t('common.cancel')}
						</button>
						<button type='button' className='playlist-button playlist-button--primary' onClick={() => void handleImport()}>
							{t('playlists.import')}
						</button>
					</div>
				</div>
			</Modal>
			<ConfirmDialog
				isOpen={deleteId !== null}
				title={t('playlists.deleteTitle')}
				message={<><p>{t('playlists.deleteMessage', { name: selectedSummary?.name ?? '' })}</p>{playlistError && <p role='alert'>{t('gallery.common.saveError')}</p>}</>}
				onCancel={() => { if (!deleting) setDeleteId(null) }}
				isConfirming={deleting}
				onConfirm={() => void handleDelete()}
				confirmLabel={t('common.delete')}
			/>
		</section>
	)
}
