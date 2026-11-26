import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, pointerWithin, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { Modal, ConfirmDialog } from '@/components/elements'
import { useAppSelector } from '@/store/hooks'
import type { PlaylistGroup, PlaylistSummary } from '@/models/api/Playlist'
import { getPlaylistGroups, savePlaylistGroup, deletePlaylistGroup, movePlaylistToGroup, reorderPlaylistGroups } from '@/services/PlaylistService/PlaylistGroupService'
import './PlaylistLibrary.scss'
import { CollectionIcon } from '@/components/Collection/CollectionIcon'
import { matchesNameSearch } from '@/utils/nameSearch'
import { CollectionMenu } from '@/components/Collection/CollectionMenu'
import { CollectionSheet } from '@/components/Collection/CollectionSheet'

const FolderIcon = () => (
	<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6' aria-hidden='true'>
		<path d='M3 7V5h7l2 2h9v12H3z' />
	</svg>
)
const Grip = () => (
	<svg viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
		{[8, 16].flatMap((x) => [6, 12, 18].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r='1.3' />))}
	</svg>
)

function PlaylistRow({
	playlist,
	selected,
	onSelect,
	overlay = false,
	selecting = false,
	checked = false,
	onCheck,
	orderControls,
	onMove,
	onEdit,
	onMoveUp,
	onMoveDown,
}: {
	playlist: PlaylistSummary
	selected: boolean
	onSelect: () => void
	overlay?: boolean
	selecting?: boolean
	checked?: boolean
	onCheck?: () => void
	orderControls?: React.ReactNode
	onMove?: () => void
	onEdit?: () => void
	onMoveUp?: () => void
	onMoveDown?: () => void
}) {
	const { t } = useTranslation()
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: `playlist-${playlist.id}`,
		data: { groupId: playlist.groupId ?? null },
		disabled: overlay,
	})
	return (
		<div
			ref={setNodeRef}
			className={`playlist-library__row${selected ? ' is-selected' : ''}${isDragging ? ' is-dragging' : ''}${overlay ? ' is-overlay' : ''}`}
			style={overlay ? undefined : { transform: CSS.Transform.toString(transform), transition }}>
			<button type='button' className='playlist-library__select' onClick={selecting ? onCheck : onSelect} aria-current={selected ? 'page' : undefined}>
				<CollectionIcon name={playlist.isAutomatic ? 'auto' : 'playlists'} />
				<span className='playlist-library__name' title={playlist.name}>{playlist.name}</span>
				<small>
					{playlist.gameCount}
					<span className='sr-only'> {t('command.games')}</span>
				</small>
			</button>
			{!overlay && selecting && (
				<>
					<label className='playlist-library__checkbox'>
						<input type='checkbox' checked={checked} onChange={onCheck} aria-label={t('playlists.selectPlaylist', { name: playlist.name })} />
					</label>
					<button type='button' className='playlist-library__grip' aria-label={t('playlists.dragPlaylist', { name: playlist.name })} {...attributes} {...listeners}>
						<Grip />
					</button>
				</>
			)}
			{orderControls}
			{!overlay && !selecting && <CollectionMenu label={`${t('playlists.options')}: ${playlist.name}`} className='playlist-library__item-actions'>
				{close => <>
					{onEdit && <button type='button' onClick={() => { close(); onEdit() }}><CollectionIcon name='edit' />{t('gallery.playlist.edit')}</button>}
					<button type='button' onClick={() => { close(); onMove?.() }}><CollectionIcon name='folder' />{t('gallery.playlist.move')}</button>
					<button type='button' disabled={!onMoveUp} onClick={() => { close(); onMoveUp?.() }}><CollectionIcon name='up' />{t('common.moveUp')}</button>
					<button type='button' disabled={!onMoveDown} onClick={() => { close(); onMoveDown?.() }}><CollectionIcon name='down' />{t('common.moveDown')}</button>
				</>}
			</CollectionMenu>}
		</div>
	)
}

function GroupSection({
	group,
	playlists,
	collapsed,
	onToggle,
	onEdit,
	onDelete,
	children,
	selecting,
	orderControls,
}: {
	group: PlaylistGroup
	playlists: PlaylistSummary[]
	collapsed: boolean
	onToggle: () => void
	onEdit: () => void
	onDelete: () => void
	children: React.ReactNode
	selecting: boolean
	orderControls?: React.ReactNode
}) {
	const { t } = useTranslation()
	const actions = useRef<HTMLDetailsElement>(null)
	useEffect(() => {
		const outside = (event: PointerEvent) => {
			if (actions.current && !actions.current.contains(event.target as Node)) actions.current.open = false
		}
		document.addEventListener('pointerdown', outside)
		return () => document.removeEventListener('pointerdown', outside)
	}, [])
	const { setNodeRef, isOver } = useDroppable({ id: `group-${group.id}`, data: { groupId: group.id || null } })
	const sortable = useSortable({ id: `folder-${group.id}`, data: { groupId: group.id }, disabled: !selecting })
	return (
		<section
			ref={(node) => {
				setNodeRef(node)
				sortable.setNodeRef(node)
			}}
			style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }}
			className={`playlist-library__group${isOver ? ' is-over' : ''}${sortable.isDragging ? ' is-folder-dragging' : ''}`}>
			<div className='playlist-library__group-heading'>
				<button type='button' className='playlist-library__group-toggle' onClick={onToggle} aria-expanded={!collapsed} aria-controls={`playlist-group-${group.id}`}>
					<span className={`playlist-library__chevron${collapsed ? '' : ' is-open'}`} aria-hidden='true'>
						›
					</span>
					<FolderIcon />
					<strong>{group.name}</strong>
					<span className='playlist-library__count'>{playlists.length}</span>
				</button>
				{selecting && (
					<button
						type='button'
						className='playlist-library__grip playlist-library__folder-grip'
						aria-label={t('playlists.dragGroup', { name: group.name })}
						{...sortable.attributes}
						{...sortable.listeners}>
						<Grip />
					</button>
				)}
				{group.id > 0 && (
					<details
						ref={actions}
						className='playlist-library__group-actions'
						onKeyDown={(event) => {
							if (event.key === 'Escape' && actions.current?.open) {
								event.preventDefault()
								event.stopPropagation()
								actions.current.open = false
								actions.current.querySelector('summary')?.focus()
							}
						}}>
						<summary aria-label={`${t('playlists.options')}: ${group.name}`}>
							<CollectionIcon name='more' />
						</summary>
						<div>
							<button
								type='button'
								onClick={() => {
									if (actions.current) { actions.current.open = false; actions.current.querySelector('summary')?.focus() }
									onEdit()
								}}>
								<CollectionIcon name='edit' />
								{t('playlists.renameGroup', { name: group.name })}
							</button>
							<button
								type='button'
								onClick={() => {
									if (actions.current) { actions.current.open = false; actions.current.querySelector('summary')?.focus() }
									onDelete()
								}}>
								<CollectionIcon name='trash' />
								{t('playlists.deleteGroup', { name: group.name })}
							</button>
						</div>
					</details>
				)}
			</div>
			{orderControls}
			{!collapsed && (
				<div className='playlist-library__group-body' id={`playlist-group-${group.id}`}>
					{children}
					{!playlists.length && <p className='playlist-library__empty-group'>{t('playlists.dropHere')}</p>}
				</div>
			)}
		</section>
	)
}

interface LibraryProps {
	playlists: PlaylistSummary[]
	selectedId: number | null
	loading?: boolean
	moveRequest?: { id: number }
	onCreate?: () => void
	onImport?: () => void
	onSelect: (id: number) => void
	onRefresh: () => Promise<unknown>
	onReorder: (ids: number[]) => Promise<unknown>
	onEdit?: (id: number) => void
}
export default function PlaylistLibrary(props: LibraryProps) {
	const userId = useAppSelector((state) => state.auth.user?.id)
	return <PlaylistLibraryContent key={userId ?? 'anonymous'} {...props} />
}

function PlaylistLibraryContent({ playlists, selectedId, loading, moveRequest, onCreate, onImport, onSelect, onRefresh, onReorder, onEdit }: LibraryProps) {
	const { t } = useTranslation()
	const [params, setParams] = useSearchParams(),
		focusedFolder = Number(params.get('folder')) || null
	const userId = useAppSelector((state) => state.auth.user?.id)
	const [groups, setGroups] = useState<PlaylistGroup[]>([])
	const [libraryExpanded, setLibraryExpanded] = useState(() => !window.matchMedia('(max-width: 650px)').matches)
	const [collapsed, setCollapsed] = useState<number[]>(() => {
		try {
			const saved: unknown = JSON.parse(localStorage.getItem(`gdb.playlist-groups.${userId}`) ?? '[]')
			return Array.isArray(saved) ? saved.filter((id): id is number => Number.isSafeInteger(id) && id >= 0) : []
		} catch {
			return []
		}
	})
	const [activeId, setActiveId] = useState<number | null>(null)
	const [editor, setEditor] = useState<PlaylistGroup | 'new' | null>(null)
	const [name, setName] = useState('')
	const [deleting, setDeleting] = useState<PlaylistGroup | null>(null)
	const [moving, setMoving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [query, setQuery] = useState('')
	const [selecting, setSelecting] = useState(false)
	const [checkedIds, setCheckedIds] = useState<number[]>([])
	const [destination, setDestination] = useState('')
	const [directMove, setDirectMove] = useState<number | null>(null)
	const [directDestination, setDirectDestination] = useState('')
	const [directError, setDirectError] = useState(false)
	const directSelect = useRef<HTMLSelectElement>(null), directBusy = useRef(false)
	const [activeFolderId, setActiveFolderId] = useState<number | null>(null)
	const [localPlaylists, setLocalPlaylists] = useState(playlists)
	const snapshot = useRef(playlists)
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
	useEffect(() => {
		setLocalPlaylists(playlists)
	}, [playlists])
	useEffect(() => {
		void getPlaylistGroups()
			.then(setGroups)
			.catch(() => setError(t('playlists.groupsLoadError')))
	}, [t])
	useEffect(() => {
		try {
			localStorage.setItem(`gdb.playlist-groups.${userId}`, JSON.stringify(collapsed))
		} catch {
			/* Storage is optional. */
		}
	}, [collapsed, userId])
	const active = localPlaylists.find((playlist) => playlist.id === activeId)
	const sections = [{ id: 0, name: t('playlists.ungrouped'), sortOrder: 0 }, ...groups].sort((a, b) => a.sortOrder - b.sortOrder)
	useEffect(() => {
		if (focusedFolder) setLibraryExpanded(true)
	}, [focusedFolder])
	useEffect(() => {
		if (moveRequest) {
			setDirectMove(moveRequest.id)
			setDirectDestination(String(localPlaylists.find(playlist => playlist.id === moveRequest.id)?.groupId ?? ''))
			setDirectError(false)
		}
	}, [moveRequest])
	useEffect(() => { if (directMove !== null) directSelect.current?.focus() }, [directMove])
	const moveGroup = async (id: number, delta: number) => {
		const from = sections.findIndex((value) => value.id === id),
			to = from + delta
		if (moving || from < 0 || to < 0 || to >= sections.length) return
		const next = arrayMove(sections, from, to),
			origin = next.findIndex((value) => value.id === 0)
		setMoving(true)
		setError(null)
		const previous = groups
		setGroups(next.filter((value) => value.id !== 0).map((value) => ({ ...value, sortOrder: next.indexOf(value) - origin })))
		try {
			await reorderPlaylistGroups(next.map((value) => value.id))
		} catch {
			setGroups(previous)
			setError(t('common.reorderError'))
		} finally {
			setMoving(false)
		}
	}
	const moveList = async (id: number, delta: number) => {
		const source = localPlaylists.find((value) => value.id === id),
			siblings = localPlaylists.filter((value) => (value.groupId ?? null) === (source?.groupId ?? null)),
			from = siblings.findIndex((value) => value.id === id),
			target = siblings[from + delta]
		if (moving || !target) return
		const next = arrayMove(
				localPlaylists,
				localPlaylists.findIndex((value) => value.id === id),
				localPlaylists.findIndex((value) => value.id === target.id)
			),
			previous = localPlaylists
		setLocalPlaylists(next)
		setMoving(true)
		setError(null)
		try {
			await onReorder(next.map((value) => value.id))
			await onRefresh()
		} catch {
			setLocalPlaylists(previous)
			setError(t('common.reorderError'))
		} finally {
			setMoving(false)
		}
	}
	const orderControls = (id: number, name: string, values: number[], move: (id: number, delta: number) => Promise<void>) =>
		selecting &&
		!query && (
			<div className='gdb-playlist-order-controls'>
				<button
					type='button'
					disabled={moving || values.indexOf(id) <= 0}
					onClick={() => {
						void move(id, -1)
					}}
					aria-label={`${t('common.moveUp')}: ${name}`}>
					<CollectionIcon name='up' />
				</button>
				<button
					type='button'
					disabled={moving || values.indexOf(id) === values.length - 1}
					onClick={() => {
						void move(id, 1)
					}}
					aria-label={`${t('common.moveDown')}: ${name}`}>
					<CollectionIcon name='down' />
				</button>
			</div>
		)
	const openEditor = (group: PlaylistGroup | 'new') => {
		setEditor(group)
		setName(group === 'new' ? '' : group.name)
		setError(null)
	}
	const finishDrag = async ({ active, over }: DragEndEvent) => {
		setActiveId(null)
		setActiveFolderId(null)
		if (!over || moving) return
		if (String(active.id).startsWith('folder-')) {
			const from = sections.findIndex((group) => `folder-${group.id}` === active.id)
			const to = sections.findIndex((group) => `folder-${group.id}` === over.id)
			if (from < 0 || to < 0 || from === to) return
			const next = arrayMove(sections, from, to)
			const origin = next.findIndex((group) => group.id === 0)
			setGroups(next.map((group, index) => ({ ...group, sortOrder: index - origin })).filter((group) => group.id !== 0))
			setMoving(true)
			setError(null)
			try {
				await reorderPlaylistGroups(next.map((group) => group.id))
			} catch {
				setGroups(groups)
				setError(t('common.reorderError'))
			} finally {
				setMoving(false)
			}
			return
		}
		const id = Number(String(active.id).replace('playlist-', ''))
		const targetPlaylist = localPlaylists.find((playlist) => `playlist-${playlist.id}` === over.id)
		const groupId = targetPlaylist ? (targetPlaylist.groupId ?? null) : (over.data.current?.groupId ?? null)
		const source = localPlaylists.find((playlist) => playlist.id === id)
		if (!source || active.id === over.id) return
		let next = [...localPlaylists]
		if (targetPlaylist)
			next = arrayMove(
				next,
				next.findIndex((playlist) => playlist.id === id),
				next.findIndex((playlist) => playlist.id === targetPlaylist.id)
			)
		else {
			next = next.filter((playlist) => playlist.id !== id)
			next.push(source)
		}
		next = next.map((playlist) => (playlist.id === id ? { ...playlist, groupId } : playlist))
		setLocalPlaylists(next)
		setMoving(true)
		setError(null)
		try {
			if ((source.groupId ?? null) !== groupId)
				await movePlaylistToGroup(
					id,
					groupId,
					next.map((playlist) => playlist.id)
				)
			else await onReorder(next.map((playlist) => playlist.id))
			await onRefresh()
		} catch {
			setLocalPlaylists(snapshot.current)
			setError(t('common.reorderError'))
		} finally {
			setMoving(false)
		}
	}
	return (
		<aside className={`playlist-library ${selecting ? 'is-organizing' : ''}`} aria-busy={loading}>
			<header className='playlist-library__header'>
				<button
					type='button'
					className='playlist-library__collapse'
					aria-expanded={libraryExpanded}
					aria-controls='playlist-library-content'
					onClick={() => setLibraryExpanded((value) => !value)}>
					<CollectionIcon name='folder' />
					<h2>
						<span className='playlist-library__desktop-title'>{t('playlists.title')}</span>
						<span className='playlist-library__mobile-title'>{t('gallery.playlist.folders')}</span>
					</h2>
					<CollectionIcon name='down' />
				</button>
				<div className='playlist-library__header-actions'>
					<button type='button' onClick={() => openEditor('new')} aria-label={t('playlists.newGroup')} title={t('playlists.newGroup')}>
						<FolderIcon />
					</button>
					{onCreate && (
						<button type='button' onClick={onCreate} aria-label={t('playlists.new')} title={t('playlists.new')}>
							<CollectionIcon name='plus' />
						</button>
					)}
					<button
						type='button'
						disabled={moving}
						aria-pressed={selecting}
						onClick={() => {
							setSelecting((value) => !value)
							setCheckedIds([])
							setLibraryExpanded(true)
						}}
						aria-label={t('playlists.selectionMode')}
						title={t('playlists.selectionMode')}>
						<CollectionIcon name='sort' />
					</button>
					{onImport && (
						<button type='button' onClick={onImport} aria-label={t('playlists.import')} title={t('playlists.import')}>
							<CollectionIcon name='download' />
						</button>
					)}
				</div>
			</header>
			<Link className='gdb-text-button gdb-playlist-shelves-link' to='/shelves'><CollectionIcon name='playlists' />{t('gallery.shelves.title')}<CollectionIcon name='arrow' /></Link>
			<div id='playlist-library-content' hidden={!libraryExpanded}>
				{focusedFolder && (
					<button
						type='button'
						className='gdb-text-button'
						onClick={() =>
							setParams((current) => {
								current.delete('folder')
								return current
							})
						}>
						<CollectionIcon name='back' />
						{t('playlists.collection')}
					</button>
				)}
				<label className='playlist-library__search'>
					<CollectionIcon name='search' />
					<input
						type='search'
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder={t('playlists.findPlaylist')}
						aria-label={t('playlists.findPlaylist')}
					/>
				</label>
				{loading && !localPlaylists.length && (
					<p className='playlist-library__save-status' role='status'>
						{t('gallery.common.loading')}
					</p>
				)}
				{error && (
					<p role='alert' className='playlist-library__error'>
						{error}
					</p>
				)}
				{selecting && (
					<div className='playlist-library__move'>
						<span>{t('playlists.selectedLists', { count: checkedIds.length })}</span>
						<label>
							<span className='sr-only'>{t('playlists.moveToGroup')}</span>
							<select disabled={moving} value={destination} onChange={(event) => setDestination(event.target.value)}>
								<option value=''>{t('playlists.ungrouped')}</option>
								{groups.map((group) => (
									<option key={group.id} value={group.id}>
										{group.name}
									</option>
								))}
							</select>
						</label>
						<button
							type='button'
							disabled={moving || checkedIds.length === 0}
							onClick={async () => {
								setMoving(true)
								setError(null)
								try {
									for (const id of checkedIds) await movePlaylistToGroup(id, destination ? Number(destination) : null)
									setCheckedIds([])
									await onRefresh()
								} catch {
									setError(t('playlists.groupSaveError'))
									await onRefresh()
								} finally {
									setMoving(false)
								}
							}}>
							{t('playlists.moveSelected')}
						</button>
					</div>
				)}
				<DndContext
					sensors={sensors}
					modifiers={[restrictToVerticalAxis]}
					collisionDetection={(args) => {
						if (String(args.active.id).startsWith('folder-'))
							return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((container) => String(container.id).startsWith('folder-')) })
						const hits = pointerWithin(args).filter((hit) => !String(hit.id).startsWith('folder-'))
						const rows = hits.filter((hit) => String(hit.id).startsWith('playlist-'))
						return rows.length
							? rows
							: hits.length
								? hits
								: closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((container) => !String(container.id).startsWith('folder-')) })
					}}
					onDragStart={({ active }) => {
						snapshot.current = localPlaylists
						if (String(active.id).startsWith('folder-')) setActiveFolderId(Number(String(active.id).replace('folder-', '')))
						else setActiveId(Number(String(active.id).replace('playlist-', '')))
					}}
					onDragCancel={() => {
						setActiveId(null)
						setActiveFolderId(null)
					}}
					onDragEnd={(event) => void finishDrag(event)}>
					<SortableContext
						items={sections.filter((group) => group.id !== 0 || localPlaylists.some((playlist) => !playlist.groupId)).map((group) => `folder-${group.id}`)}
						strategy={verticalListSortingStrategy}>
						<div className='playlist-library__sections'>
							{sections.map((group) => {
								if (focusedFolder && !query && group.id !== focusedFolder) return null
								const members = localPlaylists.filter(
									(playlist) =>
										(playlist.groupId ?? 0) === group.id &&
										matchesNameSearch(`${playlist.name} · ${playlist.description ?? ''} · ${group.name}`, { includeTerms: query ? [query] : [] })
								)
								if (group.id === 0 && !members.length) return null
								if (query && !members.length) return null
								return (
									<GroupSection
										key={group.id}
										group={group}
										playlists={members}
										selecting={selecting}
										collapsed={!query && group.id !== focusedFolder && collapsed.includes(group.id)}
										orderControls={orderControls(
											group.id,
											group.name,
											sections.map((value) => value.id),
											moveGroup
										)}
										onToggle={() => setCollapsed((current) => (current.includes(group.id) ? current.filter((id) => id !== group.id) : [...current, group.id]))}
										onEdit={() => openEditor(group)}
										onDelete={() => setDeleting(group)}>
										<SortableContext items={members.map((playlist) => `playlist-${playlist.id}`)} strategy={verticalListSortingStrategy}>
											{members.map((playlist) => (
												<PlaylistRow
													key={playlist.id}
													playlist={playlist}
													selected={playlist.id === selectedId}
													selecting={selecting}
													checked={checkedIds.includes(playlist.id)}
													orderControls={orderControls(
														playlist.id,
														playlist.name,
														localPlaylists.filter((value) => (value.groupId ?? 0) === group.id).map((value) => value.id),
														moveList
													)}
													onCheck={() => setCheckedIds((ids) => (ids.includes(playlist.id) ? ids.filter((id) => id !== playlist.id) : [...ids, playlist.id]))}
													onSelect={() => onSelect(playlist.id)}
													onEdit={onEdit ? () => onEdit(playlist.id) : undefined}
													onMove={() => { setDirectMove(playlist.id); setDirectDestination(String(playlist.groupId ?? '')); setDirectError(false) }}
													onMoveUp={!query && !moving && members.indexOf(playlist) > 0 ? () => { void moveList(playlist.id, -1) } : undefined}
													onMoveDown={!query && !moving && members.indexOf(playlist) < members.length - 1 ? () => { void moveList(playlist.id, 1) } : undefined}
												/>
											))}
										</SortableContext>
									</GroupSection>
								)
							})}
						</div>
					</SortableContext>
					{createPortal(
						<DragOverlay adjustScale={false} dropAnimation={{ duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' }}>
							{activeFolderId !== null ? (
								<div className='playlist-library__folder-overlay'>
									<FolderIcon />
									<strong>{sections.find((group) => group.id === activeFolderId)?.name}</strong>
								</div>
							) : (
								active && <PlaylistRow playlist={active} selected={false} onSelect={() => {}} overlay />
							)}
						</DragOverlay>,
						document.body
					)}
				</DndContext>
				{moving && (
					<p role='status' className='playlist-library__save-status'>
						{t('common.saving')}
					</p>
				)}
			</div>
			<CollectionSheet open={directMove !== null} onClose={() => { if (!moving) setDirectMove(null) }} title={t('gallery.playlist.move')} subtitle={localPlaylists.find(playlist => playlist.id === directMove)?.name} className='gdb-playlist-move-sheet'
				footer={<><button type='button' className='gdb-button' disabled={moving} onClick={() => setDirectMove(null)}>{t('common.cancel')}</button><button type='submit' form='gdb-move-playlist' className='gdb-button gdb-button--primary' disabled={moving || !localPlaylists.some(playlist => playlist.id === directMove)}>{t(moving ? 'common.saving' : 'gallery.playlist.confirmMove')}<CollectionIcon name='folder' /></button></>}>
				<form id='gdb-move-playlist' className='gdb-form' onSubmit={async event => {
					event.preventDefault()
					if (directMove === null || moving || directBusy.current || !localPlaylists.some(playlist => playlist.id === directMove)) return
					directBusy.current = true; setMoving(true); setDirectError(false)
					try { await movePlaylistToGroup(directMove, directDestination ? Number(directDestination) : null); await onRefresh(); setDirectMove(null) }
					catch { setDirectError(true) }
					finally { directBusy.current = false; setMoving(false) }
				}}>
					<label>{t('playlists.moveToGroup')}<select ref={directSelect} disabled={moving} value={directDestination} onChange={event => setDirectDestination(event.target.value)}><option value=''>{t('playlists.ungrouped')}</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
					{directError && <p className='gdb-error' role='alert'>{t('playlists.groupSaveError')}</p>}
				</form>
			</CollectionSheet>
			<Modal isOpen={editor !== null} onClose={() => setEditor(null)} title={editor === 'new' ? t('playlists.newGroup') : t('common.edit')} maxWidth='420px'>
				<form
					className='playlist-form'
					onSubmit={async (event) => {
						event.preventDefault()
						if (moving || !name.trim()) return
						setMoving(true)
						try {
							await savePlaylistGroup(name, editor && editor !== 'new' ? editor.id : undefined)
							setGroups(await getPlaylistGroups())
							setEditor(null)
						} catch {
							setError(t('playlists.groupSaveError'))
						} finally {
							setMoving(false)
						}
					}}>
					<label>
						{t('playlists.groupName')}
						<input value={name} maxLength={150} onChange={(event) => setName(event.target.value)} placeholder={t('playlists.groupExample')} required autoFocus />
					</label>
					{error && <p role='alert'>{error}</p>}
					<div className='playlist-form__actions'>
						<button type='button' className='playlist-button playlist-button--quiet' onClick={() => setEditor(null)}>
							{t('common.cancel')}
						</button>
						<button type='submit' className='playlist-button playlist-button--primary' disabled={moving}>
							{t('common.save')}
						</button>
					</div>
				</form>
			</Modal>
			<ConfirmDialog
				isOpen={deleting !== null}
				title={t('playlists.deleteGroup', { name: deleting?.name })}
				message={t('playlists.deleteGroupHint')}
				onCancel={() => setDeleting(null)}
				onConfirm={async () => {
					if (!deleting) return
					try {
						await deletePlaylistGroup(deleting.id)
						setGroups(await getPlaylistGroups())
						await onRefresh()
						setDeleting(null)
					} catch {
						setError(t('playlists.groupSaveError'))
					}
				}}
			/>
		</aside>
	)
}
