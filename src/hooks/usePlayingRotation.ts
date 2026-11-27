import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

export const PLAYING_ROTATION_INTERVAL = 20_000
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

/** Visible-page UI only: never changes playlist order, game status or server state. */
export const usePlayingRotation = (region: RefObject<HTMLElement | null>, ids: readonly number[], selectedId: number | undefined, onSelect: (id: number) => void) => {
	const [paused, setPaused] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION).matches)
	const [hovered, setHovered] = useState(false)
	const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden)
	const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined')
	const select = useRef(onSelect)
	select.current = onSelect
	const key = ids.join(',')
	const multiple = ids.length > 1
	const running = multiple && !paused && !hovered && visible && inView
	const pause = useCallback(() => setPaused(true), [])

	useEffect(() => {
		const visibility = () => setVisible(!document.hidden)
		document.addEventListener('visibilitychange', visibility)
		const motion = typeof window.matchMedia === 'function' ? window.matchMedia(REDUCED_MOTION) : null
		const changed = () => { if (motion?.matches) setPaused(true) }
		motion?.addEventListener?.('change', changed)
		return () => { document.removeEventListener('visibilitychange', visibility); motion?.removeEventListener?.('change', changed) }
	}, [])

	useEffect(() => {
		if (!multiple || !region.current || typeof IntersectionObserver === 'undefined') return
		const observer = new IntersectionObserver(entries => setInView(entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .2)), { threshold: .2 })
		observer.observe(region.current)
		return () => observer.disconnect()
	}, [region, multiple])

	useEffect(() => {
		if (!running) return
		const choices = key.split(',').map(Number)
		const timer = window.setTimeout(() => {
			// A dialog may have been opened outside this section while the timer ran.
			if (document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')) { setPaused(true); return }
			const index = Math.max(0, choices.indexOf(selectedId ?? choices[0]))
			select.current(choices[(index + 1) % choices.length])
		}, PLAYING_ROTATION_INTERVAL)
		return () => window.clearTimeout(timer)
	}, [key, selectedId, running])

	return { paused, setPaused, pause, setHovered, running }
}
