import { type ReactNode, type RefObject, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { CollectionIcon } from './CollectionIcon'
import './CollectionControls.scss'

interface Props { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; header?: ReactNode; wide?: boolean; className?: string; initialFocusRef?: RefObject<HTMLElement | null>; closeDisabled?: boolean; bodyLabel?: string }
export const CollectionSheet = ({ open, onClose, title, subtitle, children, footer, header, wide = false, className = '', initialFocusRef, closeDisabled = false, bodyLabel }: Props) => {
	const { t } = useTranslation()
	const dialog = useRef<HTMLDialogElement>(null), sheetHead = useRef<HTMLElement>(null), titleId = useId()
	useEffect(() => {
		const element = dialog.current
		if (!open || !element) return
		const opener = document.activeElement as HTMLElement | null
		if (!element.open) element.showModal()
		// A title input inside a native dialog cannot reliably receive focus until
		// showModal has made the top layer interactive. Never defer a focus steal.
		initialFocusRef?.current?.focus({ preventScroll: true })
		return () => { if (element.open) element.close(); if (opener?.isConnected) opener.focus({ preventScroll: true }); else document.getElementById('main-content')?.focus({ preventScroll: true }) }
	}, [open, initialFocusRef])
	useEffect(() => {
		if (!open || !sheetHead.current) return
		const measure = () => { const height = sheetHead.current?.getBoundingClientRect().height; if (height) dialog.current?.style.setProperty('--gdb-sheet-head-height', `${height}px`) }
		measure()
		if (typeof ResizeObserver === 'undefined') return
		const observer = new ResizeObserver(measure)
		observer.observe(sheetHead.current)
		return () => observer.disconnect()
	}, [open, title, subtitle])
	if (!open) return null
	return createPortal(<dialog ref={dialog} className={`gdb-sheet ${wide ? 'gdb-sheet--wide' : ''} ${className}`} aria-labelledby={titleId}
		onKeyDown={event => {
			if (event.key !== 'Tab' || event.defaultPrevented || !(event.target instanceof Element) || event.target.closest('dialog[open], [role="dialog"][aria-modal="true"]') !== event.currentTarget) return
			// Explicit document order also covers DOM engines that group selector-list matches.
			const targets = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"])')).filter(element => !element.closest('[hidden], [inert]') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden').sort((left, right) => left === right ? 0 : left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)
			const first = targets[0], last = targets[targets.length - 1]
			if (first && last && (event.shiftKey && document.activeElement === first || !event.shiftKey && document.activeElement === last)) { event.preventDefault(); (event.shiftKey ? last : first).focus() }
		}}
		onCancel={event => { event.preventDefault(); event.stopPropagation(); if (!closeDisabled) onClose() }} onClick={event => {
			event.stopPropagation()
			if (event.target !== event.currentTarget) return
			const rect = event.currentTarget.getBoundingClientRect()
			if (!closeDisabled && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) onClose()
		}}>
		<header ref={sheetHead} className='gdb-sheet__head'>{header === undefined ? <div><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div> : <><h2 id={titleId} className='sr-only'>{title}</h2>{header}</>}<button type='button' className='gdb-icon-button' onClick={onClose} disabled={closeDisabled} aria-label={t('common.close')}><CollectionIcon name='close' /></button></header>
		<div className='gdb-sheet__body' role={bodyLabel ? 'region' : undefined} aria-label={bodyLabel} tabIndex={bodyLabel ? 0 : undefined}>{children}</div>{footer && <footer className='gdb-sheet__footer'>{footer}</footer>}<div data-gdb-modal-layer />
	</dialog>, document.body)
}
