import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, pointerWithin, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { Modal, ConfirmDialog, OptimizedImage } from '@/components/elements'
import { useAppSelector } from '@/store/hooks'
import type { PlaylistGroup, PlaylistSummary } from '@/models/api/Playlist'
import { getPlaylistGroups, savePlaylistGroup, deletePlaylistGroup, movePlaylistToGroup, reorderPlaylistGroups } from '@/services/PlaylistService/PlaylistGroupService'
import './PlaylistLibrary.scss'

const FolderIcon = () => <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6' aria-hidden='true'><path d='M3 7V5h7l2 2h9v12H3z' /></svg>
const Grip = () => <svg viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>{[8,16].flatMap(x => [6,12,18].map(y => <circle key={`${x}-${y}`} cx={x} cy={y} r='1.3' />))}</svg>

function PlaylistRow({ playlist, selected, onSelect, overlay = false, selecting = false, checked = false, onCheck }: { playlist: PlaylistSummary; selected: boolean; onSelect: () => void; overlay?: boolean; selecting?: boolean; checked?: boolean; onCheck?: () => void }) {
	const { t } = useTranslation()
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `playlist-${playlist.id}`, data: { groupId: playlist.groupId ?? null }, disabled: overlay || selecting })
	return <div ref={setNodeRef} className={`playlist-library__row${selected ? ' is-selected' : ''}${isDragging ? ' is-dragging' : ''}${overlay ? ' is-overlay' : ''}`} style={overlay ? undefined : { transform: CSS.Transform.toString(transform), transition }}>
		<button type='button' className='playlist-library__select' onClick={selecting ? onCheck : onSelect} aria-current={selected ? 'page' : undefined}>
			{playlist.coverUrl ? <OptimizedImage src={playlist.coverUrl} alt='' width={40} height={48} /> : <span className='playlist-library__placeholder'><FolderIcon /></span>}
			<span className='playlist-library__name'><strong>{playlist.name}</strong><small>{playlist.gameCount} {t('command.games').toLocaleLowerCase()}{playlist.isAutomatic ? ` · ${t('playlists.automatic')}` : ''}</small></span>
		</button>
		{!overlay && (selecting ? <label className='playlist-library__checkbox'><input type='checkbox' checked={checked} onChange={onCheck} aria-label={t('playlists.selectPlaylist', { name: playlist.name })} /></label> : <button type='button' className='playlist-library__grip' aria-label={t('playlists.dragPlaylist', { name: playlist.name })} {...attributes} {...listeners}><Grip /></button>)}
	</div>
}

function GroupSection({ group, playlists, collapsed, onToggle, onEdit, onDelete, children, selecting }: { group: PlaylistGroup; playlists: PlaylistSummary[]; collapsed: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void; children: React.ReactNode; selecting: boolean }) {
	const { t } = useTranslation()
	const { setNodeRef, isOver } = useDroppable({ id: `group-${group.id}`, data: { groupId: group.id || null } })
	const sortable = useSortable({ id: `folder-${group.id}`, data: { groupId: group.id }, disabled: group.id === 0 || selecting })
	return <section ref={node => { setNodeRef(node); sortable.setNodeRef(node) }} style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }} className={`playlist-library__group${isOver ? ' is-over' : ''}${sortable.isDragging ? ' is-folder-dragging' : ''}`}>
		<div className='playlist-library__group-heading'>
			<button type='button' className='playlist-library__group-toggle' onClick={onToggle} aria-expanded={!collapsed} aria-controls={`playlist-group-${group.id}`}><span className={`playlist-library__chevron${collapsed ? '' : ' is-open'}`} aria-hidden='true'>›</span><FolderIcon /><strong>{group.name}</strong><span className='playlist-library__count'>{playlists.length}</span></button>
			{group.id > 0 && !selecting && <button type='button' className='playlist-library__grip playlist-library__folder-grip' aria-label={t('playlists.dragGroup', { name: group.name })} {...sortable.attributes} {...sortable.listeners}><Grip /></button>}
			{group.id > 0 && <div className='playlist-library__group-actions'><button type='button' onClick={onEdit} aria-label={t('playlists.renameGroup', { name: group.name })} title={t('common.edit')}><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6' aria-hidden='true'><path d='m15 4 5 5M4 20l5-1L20 8l-4-4L5 15z' /></svg></button><button type='button' onClick={onDelete} aria-label={t('playlists.deleteGroup', { name: group.name })} title={t('common.delete')}><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6' aria-hidden='true'><path d='m6 6 12 12M18 6 6 18' /></svg></button></div>}
		</div>
		{!collapsed && <div className='playlist-library__group-body' id={`playlist-group-${group.id}`}>{children}{!playlists.length && <p className='playlist-library__empty-group'>{t('playlists.dropHere')}</p>}</div>}
	</section>
}

export default function PlaylistLibrary({ playlists, selectedId, onSelect, onRefresh, onReorder }: { playlists: PlaylistSummary[]; selectedId: number | null; onSelect: (id: number) => void; onRefresh: () => Promise<unknown>; onReorder: (ids: number[]) => Promise<unknown> }) {
	const { t } = useTranslation()
	const userId = useAppSelector(state => state.auth.user?.id)
	const [groups, setGroups] = useState<PlaylistGroup[]>([])
	const [libraryExpanded, setLibraryExpanded] = useState(() => !window.matchMedia('(max-width: 900px)').matches)
	const [collapsed, setCollapsed] = useState<number[]>(() => { try { return JSON.parse(localStorage.getItem(`gdb.playlist-groups.${userId}`) ?? '[]') } catch { return [] } })
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
	const [activeFolderId, setActiveFolderId] = useState<number | null>(null)
	const [localPlaylists, setLocalPlaylists] = useState(playlists)
	const snapshot = useRef(playlists)
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
	useEffect(() => { setLocalPlaylists(playlists) }, [playlists])
	useEffect(() => { void getPlaylistGroups().then(setGroups).catch(() => setError(t('playlists.groupsLoadError'))) }, [t])
	useEffect(() => { try { localStorage.setItem(`gdb.playlist-groups.${userId}`, JSON.stringify(collapsed)) } catch { /* Storage is optional. */ } }, [collapsed, userId])
	const active = localPlaylists.find(playlist => playlist.id === activeId)
	const sections = [{ id: 0, name: t('playlists.ungrouped'), sortOrder: 0 }, ...groups]
	const openEditor = (group: PlaylistGroup | 'new') => { setEditor(group); setName(group === 'new' ? '' : group.name); setError(null) }
	const finishDrag = async ({ active, over }: DragEndEvent) => {
		setActiveId(null)
		setActiveFolderId(null)
		if (!over || moving) return
		if (String(active.id).startsWith('folder-')) {
			const from = groups.findIndex(group => `folder-${group.id}` === active.id)
			const to = groups.findIndex(group => `folder-${group.id}` === over.id)
			if (from < 0 || to < 0 || from === to) return
			const next = arrayMove(groups, from, to)
			setGroups(next); setMoving(true); setError(null)
			try { await reorderPlaylistGroups(next.map(group => group.id)) } catch { setGroups(groups); setError(t('common.reorderError')) } finally { setMoving(false) }
			return
		}
		const id = Number(String(active.id).replace('playlist-', ''))
		const targetPlaylist = localPlaylists.find(playlist => `playlist-${playlist.id}` === over.id)
		const groupId = targetPlaylist ? targetPlaylist.groupId ?? null : over.data.current?.groupId ?? null
		const source = localPlaylists.find(playlist => playlist.id === id)
		if (!source || active.id === over.id) return
		let next = [...localPlaylists]
		if (targetPlaylist) next = arrayMove(next, next.findIndex(playlist => playlist.id === id), next.findIndex(playlist => playlist.id === targetPlaylist.id))
		else { next = next.filter(playlist => playlist.id !== id); next.push(source) }
		next = next.map(playlist => playlist.id === id ? { ...playlist, groupId } : playlist)
		setLocalPlaylists(next)
		setMoving(true)
		setError(null)
		try {
			if ((source.groupId ?? null) !== groupId) await movePlaylistToGroup(id, groupId, next.map(playlist => playlist.id))
			else await onReorder(next.map(playlist => playlist.id))
			await onRefresh()
		} catch { setLocalPlaylists(snapshot.current); setError(t('common.reorderError')) }
		finally { setMoving(false) }
	}
	return <aside className='playlist-library'>
		<header className='playlist-library__header'><button type='button' className='playlist-library__collapse' aria-expanded={libraryExpanded} aria-controls='playlist-library-content' onClick={() => setLibraryExpanded(value => !value)}><span className={`playlist-library__chevron${libraryExpanded ? ' is-open' : ''}`} aria-hidden='true'>›</span><h2>{t('playlists.collection')}</h2></button><div className='playlist-library__header-actions'><button type='button' disabled={moving} aria-pressed={selecting} onClick={() => { setSelecting(value => !value); setCheckedIds([]); setLibraryExpanded(true) }} aria-label={t('playlists.selectionMode')} title={t('playlists.selectionMode')}><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6' aria-hidden='true'><rect x='4' y='4' width='16' height='16' rx='3' /><path d='m8 12 3 3 5-6' /></svg></button><button type='button' onClick={() => openEditor('new')} aria-label={t('playlists.newGroup')} title={t('playlists.newGroup')}><FolderIcon /><span>+</span></button></div></header>
		{!libraryExpanded && selectedId !== null && <p className='playlist-library__current'>{localPlaylists.find(playlist => playlist.id === selectedId)?.name}</p>}
		<div id='playlist-library-content' hidden={!libraryExpanded}>
		<label className='playlist-library__search'><input type='search' value={query} onChange={event => setQuery(event.target.value)} placeholder={t('playlists.findPlaylist')} aria-label={t('playlists.findPlaylist')} /></label>
		{error && <p role='alert' className='playlist-library__error'>{error}</p>}
		{selecting && <div className='playlist-library__move'><span>{t('playlists.selectedLists', { count: checkedIds.length })}</span><label><span className='sr-only'>{t('playlists.moveToGroup')}</span><select disabled={moving} value={destination} onChange={event => setDestination(event.target.value)}><option value=''>{t('playlists.ungrouped')}</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><button type='button' disabled={moving || checkedIds.length === 0} onClick={async () => { setMoving(true); setError(null); try { for (const id of checkedIds) await movePlaylistToGroup(id, destination ? Number(destination) : null); setCheckedIds([]); await onRefresh() } catch { setError(t('playlists.groupSaveError')); await onRefresh() } finally { setMoving(false) } }}>{t('playlists.moveSelected')}</button></div>}
		<DndContext sensors={sensors} modifiers={[restrictToVerticalAxis]} collisionDetection={args => { if (String(args.active.id).startsWith('folder-')) return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter(container => String(container.id).startsWith('folder-') && container.id !== 'folder-0') }); const hits = pointerWithin(args).filter(hit => !String(hit.id).startsWith('folder-')); const rows = hits.filter(hit => String(hit.id).startsWith('playlist-')); return rows.length ? rows : hits.length ? hits : closestCenter({ ...args, droppableContainers: args.droppableContainers.filter(container => !String(container.id).startsWith('folder-')) }) }} onDragStart={({ active }) => { snapshot.current = localPlaylists; if (String(active.id).startsWith('folder-')) setActiveFolderId(Number(String(active.id).replace('folder-', ''))); else setActiveId(Number(String(active.id).replace('playlist-', ''))) }} onDragCancel={() => { setActiveId(null); setActiveFolderId(null) }} onDragEnd={event => void finishDrag(event)}>
			<SortableContext items={groups.map(group => `folder-${group.id}`)} strategy={verticalListSortingStrategy}><div className='playlist-library__sections'>{sections.map(group => {
				const members = localPlaylists.filter(playlist => (playlist.groupId ?? 0) === group.id && playlist.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
				if (query && !members.length) return null
				return <GroupSection key={group.id} group={group} playlists={members} selecting={selecting} collapsed={!query && collapsed.includes(group.id)} onToggle={() => setCollapsed(current => current.includes(group.id) ? current.filter(id => id !== group.id) : [...current, group.id])} onEdit={() => openEditor(group)} onDelete={() => setDeleting(group)}>
					<SortableContext items={members.map(playlist => `playlist-${playlist.id}`)} strategy={verticalListSortingStrategy}>{members.map(playlist => <PlaylistRow key={playlist.id} playlist={playlist} selected={playlist.id === selectedId} selecting={selecting} checked={checkedIds.includes(playlist.id)} onCheck={() => setCheckedIds(ids => ids.includes(playlist.id) ? ids.filter(id => id !== playlist.id) : [...ids, playlist.id])} onSelect={() => onSelect(playlist.id)} />)}</SortableContext>
				</GroupSection>
			})}</div></SortableContext>
			{createPortal(<DragOverlay adjustScale={false} dropAnimation={{ duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' }}>{activeFolderId !== null ? <div className='playlist-library__folder-overlay'><FolderIcon /><strong>{groups.find(group => group.id === activeFolderId)?.name}</strong></div> : active && <PlaylistRow playlist={active} selected={false} onSelect={() => {}} overlay />}</DragOverlay>, document.body)}
		</DndContext>
		{moving && <p role='status' className='playlist-library__save-status'>{t('common.saving')}</p>}
		</div>
		<Modal isOpen={editor !== null} onClose={() => setEditor(null)} title={editor === 'new' ? t('playlists.newGroup') : t('common.edit')} maxWidth='420px'>
			<form className='playlist-form' onSubmit={async event => { event.preventDefault(); if (moving || !name.trim()) return; setMoving(true); try { await savePlaylistGroup(name, editor && editor !== 'new' ? editor.id : undefined); setGroups(await getPlaylistGroups()); setEditor(null) } catch { setError(t('playlists.groupSaveError')) } finally { setMoving(false) } }}>
				<label>{t('playlists.groupName')}<input value={name} maxLength={150} onChange={event => setName(event.target.value)} placeholder={t('playlists.groupExample')} required autoFocus /></label>
				{error && <p role='alert'>{error}</p>}<div className='playlist-form__actions'><button type='button' className='playlist-button playlist-button--quiet' onClick={() => setEditor(null)}>{t('common.cancel')}</button><button type='submit' className='playlist-button playlist-button--primary' disabled={moving}>{t('common.save')}</button></div>
			</form>
		</Modal>
		<ConfirmDialog isOpen={deleting !== null} title={t('playlists.deleteGroup', { name: deleting?.name })} message={t('playlists.deleteGroupHint')} onCancel={() => setDeleting(null)} onConfirm={async () => { if (!deleting) return; try { await deletePlaylistGroup(deleting.id); setGroups(await getPlaylistGroups()); await onRefresh(); setDeleting(null) } catch { setError(t('playlists.groupSaveError')) } }} />
	</aside>
}
