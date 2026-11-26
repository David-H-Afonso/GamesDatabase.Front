import { Children, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CollectionIcon } from './CollectionIcon'
import './CollectionRail.scss'

/** Native horizontal scrolling plus edge controls; never rotates or moves focus on its own. */
export const CollectionRail = ({ id, label, className = '', children }: { id?: string; label: string; className?: string; children: ReactNode }) => {
	const { t } = useTranslation(), track = useRef<HTMLDivElement>(null), root = useRef<HTMLDivElement>(null)
	const [edges, setEdges] = useState({ overflow: false, previous: false, next: false }), count = Children.count(children)
	const measure = () => {
		const node = track.current
		if (!node) return
		const maximum = node.scrollWidth - node.clientWidth, left = Math.max(0, node.scrollLeft)
		const next = { overflow: maximum > 2, previous: left > 2, next: left < maximum - 2 }
		setEdges(previous => previous.overflow === next.overflow && previous.previous === next.previous && previous.next === next.next ? previous : next)
		const art = node.querySelector<HTMLElement>('.gdb-home-game__art,.gdb-shelved-cover')
		if (art) root.current?.style.setProperty('--gdb-rail-art-height', `${art.getBoundingClientRect().height}px`)
	}
	useEffect(() => {
		measure()
		if (!track.current || typeof ResizeObserver === 'undefined') return
		const observer = new ResizeObserver(measure); observer.observe(track.current)
		if (track.current.firstElementChild) observer.observe(track.current.firstElementChild)
		return () => observer.disconnect()
	}, [count, className])
	const scroll = (direction: number) => track.current?.scrollBy({ left: direction * Math.max(180, track.current.clientWidth * .85), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
	return <div ref={root} className='gdb-collection-rail'>
		<div ref={track} id={id} className={className} tabIndex={0} role='region' aria-label={label} onScroll={measure}>{children}</div>
		<button type='button' className='gdb-rail-edge gdb-rail-edge--previous' hidden={!edges.overflow} disabled={!edges.previous} aria-label={t('gallery.home.scrollLeft', { title: label })} onClick={() => scroll(-1)}><CollectionIcon name='back' /></button>
		<button type='button' className='gdb-rail-edge gdb-rail-edge--next' hidden={!edges.overflow} disabled={!edges.next} aria-label={t('gallery.home.scrollRight', { title: label })} onClick={() => scroll(1)}><CollectionIcon name='arrow' /></button>
	</div>
}
