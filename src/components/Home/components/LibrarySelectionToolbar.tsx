import { useId, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CollectionIcon } from '@/components/Collection/CollectionIcon'
import { CollectionMenu } from '@/components/Collection/CollectionMenu'
import { ConfirmDialog } from '@/components/elements/ConfirmDialog/ConfirmDialog'
import './LibrarySelectionToolbar.scss'

type ArtworkField = 'logo' | 'hero' | 'cover'
type OptionalGroup = 'selection' | 'edit' | 'artwork' | 'secondary'
type MeasuredGroup = OptionalGroup | 'count' | 'autofill' | 'done'
const collapseOrder: OptionalGroup[] = ['secondary', 'selection', 'artwork', 'edit']

interface Props {
	selectedCount: number
	selectionKey?: string
	onSelectAll?: () => void
	onDeselectAll?: () => void
	onBulkEdit?: () => void
	onBulkDelete?: () => void
	onBulkExport?: () => void
	onBulkRefreshImages?: (field: ArtworkField) => void
	bulkImagesDisabled?: boolean
	onBulkAutofill?: (options: { overwrite: boolean }) => void
	bulkAutofillBusy?: boolean
	onDone?: () => void
}

/** Selection presentation only. The Library owns the exact IDs and all mutations. */
export const LibrarySelectionToolbar = ({ selectedCount, selectionKey, onSelectAll, onDeselectAll, onBulkEdit, onBulkDelete, onBulkExport, onBulkRefreshImages, bulkImagesDisabled = false, onBulkAutofill, bulkAutofillBusy = false, onDone }: Props) => {
	const { t, i18n } = useTranslation()
	const busy = bulkAutofillBusy || bulkImagesDisabled, disabled = busy || selectedCount === 0
	const scope = JSON.stringify([selectionKey, selectedCount, busy])
	const [mode, setMode] = useState({ scope, replace: false, confirming: false })
	// Reset during reconciliation, not after paint: permission can never cross an
	// exact-ID/owner/query boundary, even when the new selection has the same count.
	if (mode.scope !== scope) setMode({ scope, replace: false, confirming: false })
	const replace = mode.scope === scope && mode.replace
	const confirming = mode.scope === scope && mode.confirming && !disabled
	const [artworkField, setArtworkField] = useState<ArtworkField>('cover')
	const hintId = useId(), root = useRef<HTMLDivElement>(null)
	const groups = useRef<Partial<Record<MeasuredGroup, HTMLElement | null>>>({})
	const widths = useRef<Partial<Record<MeasuredGroup, number>>>({})
	const restoreAction = useRef<string | null>(null)
	const present: Record<OptionalGroup, boolean> = { selection: Boolean(onSelectAll || onDeselectAll), edit: Boolean(onBulkEdit), artwork: Boolean(onBulkRefreshImages), secondary: Boolean(onBulkExport || onBulkDelete) }
	const measurementKey = JSON.stringify([i18n.resolvedLanguage ?? i18n.language, selectedCount, replace, Boolean(onBulkAutofill), Boolean(onDone), Boolean(onSelectAll), Boolean(onDeselectAll), Boolean(onBulkExport), Boolean(onBulkDelete), ...collapseOrder.map(group => present[group]), bulkImagesDisabled])
	const [layout, setLayout] = useState({ key: measurementKey, width: 0, compact: false, overflow: [] as OptionalGroup[] })
	// A label/locale change gets one full measurement before paint. Widths of
	// subsequently overflowed groups are retained; there are no duplicate controls.
	const currentLayout = layout.key === measurementKey ? layout : { key: measurementKey, width: 0, compact: false, overflow: [] as OptionalGroup[] }
	const overflowed = (group: OptionalGroup) => currentLayout.overflow.includes(group)
	const hasOverflow = currentLayout.overflow.length > 0

	useLayoutEffect(() => {
		const element = root.current
		if (!element) return
		if (layout.key !== measurementKey) widths.current = {}
		const measure = () => {
			const style = getComputedStyle(element)
			const available = element.getBoundingClientRect().width - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0) - (parseFloat(style.borderLeftWidth) || 0) - (parseFloat(style.borderRightWidth) || 0)
			if (available <= 0) return
			for (const [group, node] of Object.entries(groups.current)) if (node) {
				// Compact rows stretch the primary cluster. Keep its intrinsic width
				// so a wider container can restore inline tools without getting stuck.
				if (group === 'autofill' && element.dataset.compact === 'true' && widths.current.autofill != null) continue
				widths.current[group as MeasuredGroup] = node.getBoundingClientRect().width
			}
			const gap = parseFloat(style.columnGap) || 8
			const width = Math.floor(available), overflow: OptionalGroup[] = []
			const needed = () => {
				const visible = (['count', ...(onBulkAutofill ? ['autofill'] : []), ...(onDone ? ['done'] : []), ...collapseOrder.filter(group => present[group] && !overflow.includes(group))] as MeasuredGroup[]).map(group => widths.current[group] ?? 0)
				if (overflow.length) visible.push(44)
				return visible.reduce((sum, width) => sum + width, 0) + Math.max(0, visible.length - 1) * gap
			}
			for (const group of collapseOrder) if (present[group] && needed() > available) overflow.push(group)
			const compact = needed() > available
			if (layout.key === measurementKey && layout.width === width && layout.compact === compact && layout.overflow.join() === overflow.join()) return
			const active = document.activeElement
			const trigger = element.querySelector<HTMLElement>('.gdb-context-menu>button')
			const panelId = trigger?.getAttribute('aria-controls'), panel = panelId ? document.getElementById(panelId) : null
			if (active instanceof HTMLElement) {
				if (active === trigger || panel?.contains(active)) restoreAction.current = 'more'
				else if (element.contains(active)) restoreAction.current = active.dataset.bulkAction ?? null
			}
			setLayout({ key: measurementKey, width, compact, overflow })
		}
		measure()
		if (typeof ResizeObserver === 'undefined') {
			window.addEventListener('resize', measure)
			return () => window.removeEventListener('resize', measure)
		}
		const observer = new ResizeObserver(measure)
		observer.observe(element)
		for (const node of Object.values(groups.current)) if (node) observer.observe(node)
		return () => observer.disconnect()
	}, [measurementKey, layout])

	useLayoutEffect(() => {
		if (!restoreAction.current || !root.current) return
		const action = root.current.querySelector<HTMLElement>(`[data-bulk-action="${restoreAction.current}"]:not(:disabled)`)
		const fallback = root.current.querySelector<HTMLElement>('.gdb-context-menu>button:not(:disabled)') ?? root.current.querySelector<HTMLElement>('[data-bulk-action="autofill"]:not(:disabled)') ?? root.current.querySelector<HTMLElement>('button:not(:disabled)')
		;(action ?? fallback ?? root.current).focus({ preventScroll: true })
		restoreAction.current = null
	}, [layout])

	const run = (action: (() => void) | undefined, close?: () => void) => {
		if (disabled || confirming) return
		close?.() // Popups must leave before opening the edit/export/delete dialog.
		action?.()
	}
	const reset = () => setMode({ scope, replace: false, confirming: false })
	const selectionActions = (close?: () => void) => <>
		{onSelectAll && <button type='button' className='gdb-bulk-toolbar__button' data-bulk-action='select' disabled={busy} onClick={() => { if (!busy) { close?.(); reset(); onSelectAll() } }}>{t('gallery.library.selectVisible')}</button>}
		{onDeselectAll && <button type='button' className='gdb-bulk-toolbar__button' data-bulk-action='deselect' disabled={disabled} onClick={() => { if (!disabled) { close?.(); reset(); onDeselectAll() } }}>{t('home.chips.deselect')}</button>}
	</>
	const editAction = (close?: () => void) => onBulkEdit && <button type='button' className='gdb-bulk-toolbar__button' data-bulk-action='edit' disabled={disabled} onClick={() => run(onBulkEdit, close)}><CollectionIcon name='edit' />{t('home.chips.bulkEdit')}</button>
	const artworkActions = (close?: () => void) => <div className='gdb-bulk-toolbar__artwork' role='group' aria-label={t('gallery.bulkToolbar.artwork')}>
		<select value={artworkField} data-bulk-action='artwork-field' disabled={disabled} aria-label={t('home.chips.bulkImageField')} onChange={event => setArtworkField(event.target.value as ArtworkField)}>
			<option value='cover'>{t('home.imageFields.cover')}</option><option value='hero'>{t('home.imageFields.hero')}</option><option value='logo'>{t('home.imageFields.logo')}</option>
		</select>
		<button type='button' className='gdb-bulk-toolbar__button' data-bulk-action='artwork' disabled={disabled} onClick={() => run(() => onBulkRefreshImages?.(artworkField), close)}><CollectionIcon name='refresh' />{t(bulkImagesDisabled ? 'home.chips.bulkImagesRefreshing' : 'home.chips.bulkImages')}</button>
	</div>
	const secondaryActions = (close?: () => void) => <>
		{onBulkExport && <button type='button' className='gdb-bulk-toolbar__button' data-bulk-action='export' disabled={disabled} onClick={() => run(onBulkExport, close)}><CollectionIcon name='download' />{t('home.chips.bulkExport')}</button>}
		{onBulkDelete && <button type='button' className='gdb-bulk-toolbar__button gdb-bulk-toolbar__button--danger' data-bulk-action='delete' disabled={disabled} onClick={() => run(onBulkDelete, close)}><CollectionIcon name='trash' />{t('home.chips.bulkDelete')}</button>}
	</>
	const end = (hasOverflow || onDone) && <div className='gdb-bulk-toolbar__end' key='end'>
		{hasOverflow && <CollectionMenu key={`${scope}:${currentLayout.width}:${currentLayout.overflow.join()}`} label={t('gallery.library.moreActions')} className='gdb-bulk-toolbar__more' panelClassName='gdb-bulk-toolbar-menu' disabled={busy}>{close => <>
			{overflowed('selection') && <div className='gdb-bulk-toolbar-menu__group'>{selectionActions(close)}</div>}
			{overflowed('edit') && editAction(close)}
			{overflowed('artwork') && <div className='gdb-bulk-toolbar-menu__group'><p>{t('gallery.bulkToolbar.artwork')}</p>{artworkActions(close)}</div>}
			{overflowed('secondary') && <div className='gdb-bulk-toolbar-menu__group'>{secondaryActions(close)}</div>}
		</>}</CollectionMenu>}
		{onDone && <button ref={node => { groups.current.done = node }} type='button' className='gdb-bulk-toolbar__button gdb-bulk-toolbar__done' data-bulk-action='done' disabled={busy} onClick={() => { reset(); onDone() }}>{t('gallery.common.done')}<CollectionIcon name='close' /></button>}
	</div>

	// The existing warning is portalled, not a native <dialog>. Contain its keys
	// so Library shortcuts (including /) cannot move focus behind the warning.
	return <div ref={root} className='gdb-bulk-toolbar' role='group' tabIndex={-1} aria-label={t('gallery.bulkToolbar.label')} aria-busy={busy} data-compact={currentLayout.compact} onKeyDown={event => { if (confirming) event.stopPropagation() }}>
		<span ref={node => { groups.current.count = node }} className='gdb-bulk-toolbar__count'>{t('home.chips.selected', { count: selectedCount })}</span>
		{currentLayout.compact && end}
		{present.selection && !overflowed('selection') && <div ref={node => { groups.current.selection = node }} className='gdb-bulk-toolbar__group'>{selectionActions()}</div>}
		{onBulkAutofill && <div ref={node => { groups.current.autofill = node }} className='gdb-bulk-toolbar__autofill'>
			<div className='gdb-bulk-toolbar__autofill-controls'>
				<button type='button' className='gdb-bulk-toolbar__button gdb-bulk-toolbar__button--primary' data-bulk-action='autofill' disabled={disabled} aria-label={t('gallery.bulkToolbar.autofill')} aria-describedby={hintId} onClick={() => { if (!disabled && !confirming) onBulkAutofill({ overwrite: replace }) }}><CollectionIcon name='auto' /><span className='gdb-bulk-toolbar__autofill-copy'><span>{t('gallery.bulkToolbar.autofill')}</span><span id={hintId} className='gdb-bulk-toolbar__hint'>{t(replace ? 'gallery.bulkToolbar.replaceEnabled' : 'gallery.bulkToolbar.emptyOnly')}</span></span></button>
				<label className='gdb-bulk-toolbar__replace' data-active={replace} title={t('gallery.bulkToolbar.replaceLabel')}><input type='checkbox' data-bulk-action='replace' checked={replace} disabled={disabled} aria-label={t('gallery.bulkToolbar.replaceLabel')} aria-describedby={hintId} onChange={event => { if (!disabled) setMode({ scope, replace: false, confirming: event.target.checked }) }} /><span>{t('gallery.bulkToolbar.replace')}</span></label>
			</div>
		</div>}
		{present.edit && !overflowed('edit') && <div ref={node => { groups.current.edit = node }} className='gdb-bulk-toolbar__group'>{editAction()}</div>}
		{present.artwork && !overflowed('artwork') && <div ref={node => { groups.current.artwork = node }} className='gdb-bulk-toolbar__group gdb-bulk-toolbar__artwork-inline'>{artworkActions()}</div>}
		{present.secondary && !overflowed('secondary') && <div ref={node => { groups.current.secondary = node }} className='gdb-bulk-toolbar__group'>{secondaryActions()}</div>}
		{!currentLayout.compact && end}
		<ConfirmDialog isOpen={confirming} title={t('gallery.bulkToolbar.replaceTitle')} message={t('gallery.bulkToolbar.replaceMessage', { count: selectedCount })} confirmLabel={t('gallery.bulkToolbar.enableReplace')} cancelLabel={t('gallery.bulkToolbar.keepExisting')} variant='danger' onCancel={reset} onConfirm={() => { if (!disabled && mode.scope === scope) setMode({ scope, replace: true, confirming: false }) }} />
	</div>
}
