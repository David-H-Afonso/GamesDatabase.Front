import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './GameTitle.scss'

interface Props { name: string; onOpen: () => void; children?: ReactNode; className?: string; ariaLabel?: string; tooltip?: 'overflow' | 'hold' }

/** Full titles remain discoverable with a mouse, keyboard, or a stationary touch hold. */
export const GameTitle = ({ name, onOpen, children, className, ariaLabel, tooltip = 'overflow' }: Props) => {
	const trigger = useRef<HTMLButtonElement>(null), popup = useRef<HTMLSpanElement>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null)
	const origin = useRef<{ x: number; y: number } | null>(null), held = useRef(false)
	const [position, setPosition] = useState<CSSProperties | null>(null), id = useId()
	const clearTimer = () => { if (timer.current) clearTimeout(timer.current); timer.current = null }
	const show = (reason: 'hover' | 'focus' | 'hold') => {
		const text = trigger.current?.querySelector<HTMLElement>('.gdb-title-text') ?? trigger.current
		if (reason !== 'hold' && (tooltip === 'hold' || !text || text.scrollWidth <= text.clientWidth + 1 && text.scrollHeight <= text.clientHeight + 1)) return
		const rect = trigger.current?.getBoundingClientRect()
		if (!rect) return
		const width = Math.min(320, window.innerWidth - 24), above = rect.top >= 100
		setPosition({ width: 'max-content', maxWidth: width, left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), ...(above ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }) })
	}
	const hideSoon = () => { clearTimer(); timer.current = setTimeout(() => setPosition(null), 120) }
	useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
	useEffect(() => {
		if (!position) return
		const dismiss = () => setPosition(null)
		const outside = (event: PointerEvent) => { if (!trigger.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) dismiss() }
		const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismiss() } }
		document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape, true)
		window.addEventListener('resize', dismiss); window.addEventListener('scroll', dismiss, true)
		return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape, true); window.removeEventListener('resize', dismiss); window.removeEventListener('scroll', dismiss, true) }
	}, [position])
	return <><button type='button' ref={trigger} className={className} aria-label={ariaLabel} aria-describedby={position ? id : undefined}
		onPointerEnter={event => { if (event.pointerType === 'mouse' && tooltip !== 'hold') { clearTimer(); timer.current = setTimeout(() => show('hover'), 500) } }} onPointerLeave={event => { clearTimer(); origin.current = null; if (event.pointerType === 'mouse') hideSoon() }}
		onFocus={() => show('focus')} onBlur={() => { clearTimer(); setPosition(null) }}
		onPointerDown={event => { held.current = false; if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return; clearTimer(); origin.current = { x: event.clientX, y: event.clientY }; timer.current = setTimeout(() => { held.current = true; show('hold') }, 500) }}
		onPointerMove={event => { if (origin.current && Math.hypot(event.clientX - origin.current.x, event.clientY - origin.current.y) > 10) { clearTimer(); origin.current = null; setPosition(null) } }}
		onPointerUp={() => { clearTimer(); origin.current = null }} onPointerCancel={() => { clearTimer(); origin.current = null; setPosition(null) }} onContextMenu={event => { if (held.current) event.preventDefault() }}
		onClick={event => { if (held.current) { event.preventDefault(); event.stopPropagation(); held.current = false; return } clearTimer(); setPosition(null); onOpen() }}>{children ?? <span className='gdb-title-text'>{name}</span>}</button>
		{position && createPortal(<span ref={popup} id={id} role='tooltip' className='gdb-full-title-tooltip' style={position} onPointerEnter={clearTimer} onPointerLeave={hideSoon}>{name}</span>, trigger.current?.closest('dialog[open]')?.querySelector('[data-gdb-modal-layer]') ?? document.body)}
	</>
}
