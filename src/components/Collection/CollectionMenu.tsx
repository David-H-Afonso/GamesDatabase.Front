import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CollectionIcon } from './CollectionIcon'
import './CollectionMenu.scss'

const focusable = 'button:not(:disabled),a[href],input:not(:disabled):not([type=hidden]),select:not(:disabled),textarea:not(:disabled),summary,[tabindex]:not([tabindex="-1"])'
const targets = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>(focusable)].filter(element => !element.closest('[hidden],[inert]') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden')

/** Small non-modal action panel, portalled so scroll rails never clip it. */
export const CollectionMenu = ({ label, children, className = '', panelClassName = '', disabled = false }: { label: string; children: (close: () => void) => ReactNode; className?: string; panelClassName?: string; disabled?: boolean }) => {
	const [open, setOpen] = useState(false), [position, setPosition] = useState<CSSProperties>({ visibility: 'hidden' })
	const trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null), id = useId()
	const close = () => { setOpen(false); trigger.current?.focus({ preventScroll: true }) }
	useLayoutEffect(() => {
		if (!open || !trigger.current || !panel.current) return
		const rect = trigger.current.getBoundingClientRect(), width = Math.min(256, window.innerWidth - 24)
		const below = window.innerHeight - rect.bottom - 20, above = rect.top - 20, upwards = below < Math.min(panel.current.scrollHeight, 220) && above > below
		setPosition({ width, left: Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12)), maxHeight: Math.max(100, upwards ? above : below), ...(upwards ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }) })
	}, [open])
	useLayoutEffect(() => {
		if (open && position.visibility !== 'hidden') panel.current?.querySelector<HTMLElement>(focusable)?.focus({ preventScroll: true })
	}, [open, position])
	useEffect(() => {
		if (!open) return
		const outside = (event: PointerEvent) => { if (!trigger.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) setOpen(false) }
		const scroll = (event: Event) => { if (!(event.target instanceof Node) || !panel.current?.contains(event.target)) setOpen(false) }
		const resize = () => setOpen(false)
		document.addEventListener('pointerdown', outside); window.addEventListener('scroll', scroll, true); window.addEventListener('resize', resize)
		return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('scroll', scroll, true); window.removeEventListener('resize', resize) }
	}, [open])
	const boundary = (event: React.FocusEvent) => { if (event.relatedTarget instanceof Node && !trigger.current?.contains(event.relatedTarget) && !panel.current?.contains(event.relatedTarget)) setOpen(false) }
	return <span className={`gdb-context-menu ${className}`} onBlur={boundary} onKeyDown={event => {
		if (!open || event.defaultPrevented) return
		if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
		if (event.key === 'Tab' && panel.current && trigger.current && panel.current.contains(event.target as Node)) {
			const inside = targets(panel.current), end = event.shiftKey ? inside[0] : inside.at(-1)
			if (document.activeElement !== end) return
			// Portals live at the end of the document. Leave at the trigger's
			// logical position rather than sending Tab to the browser chrome.
			event.preventDefault(); setOpen(false)
			const outside = targets(trigger.current.closest('dialog[open]') ?? document).filter(element => !panel.current?.contains(element))
			const next = event.shiftKey ? trigger.current : outside[outside.indexOf(trigger.current) + 1] ?? trigger.current
			next.focus({ preventScroll: true })
		}
	}}>
		<button ref={trigger} type='button' className='gdb-icon-button' disabled={disabled} aria-label={label} aria-haspopup='dialog' aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => { setPosition({ visibility: 'hidden' }); setOpen(value => !value) }}><CollectionIcon name='more' /></button>
		{open && createPortal(<div ref={panel} id={id} role='dialog' aria-label={label} className={`gdb-context-menu__panel ${panelClassName}`} style={position}>{children(close)}</div>, trigger.current?.closest('dialog[open]')?.querySelector('[data-gdb-modal-layer]') ?? document.body)}
	</span>
}
