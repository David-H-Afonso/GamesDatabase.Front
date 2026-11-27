import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PLAYING_ROTATION_INTERVAL, usePlayingRotation } from './usePlayingRotation'

const region = () => ({ current: document.createElement('section') })
describe('visible Playing rotation', () => {
	beforeEach(() => {
		vi.useFakeTimers(); vi.stubGlobal('IntersectionObserver', undefined)
		vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
		vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
	})
	afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
	it('advances after20 seconds, wraps and resets the delay when selection changes', () => {
		const select = vi.fn(), ref = region(); const { rerender } = renderHook(({ selected }) => usePlayingRotation(ref, [1, 2, 3], selected, select), { initialProps: { selected: 1 } })
		act(() => vi.advanceTimersByTime(PLAYING_ROTATION_INTERVAL - 1)); expect(select).not.toHaveBeenCalled(); act(() => vi.advanceTimersByTime(1)); expect(select).toHaveBeenLastCalledWith(2)
		rerender({ selected: 3 }); act(() => vi.advanceTimersByTime(PLAYING_ROTATION_INTERVAL)); expect(select).toHaveBeenLastCalledWith(1)
	})
	it('pauses and resumes only after a fresh full interval', () => {
		const select = vi.fn(), ref = region(); const { result } = renderHook(() => usePlayingRotation(ref, [1, 2], 1, select))
		act(() => result.current.pause()); act(() => vi.advanceTimersByTime(60_000)); expect(select).not.toHaveBeenCalled()
		act(() => result.current.setPaused(false)); act(() => vi.advanceTimersByTime(19_999)); expect(select).not.toHaveBeenCalled(); act(() => vi.advanceTimersByTime(1)); expect(select).toHaveBeenCalledWith(2)
	})
	it('suspends while hovered and restarts the delay after leaving', () => {
		const select = vi.fn(), ref = region(); const { result } = renderHook(() => usePlayingRotation(ref, [1, 2], 1, select))
		act(() => result.current.setHovered(true)); act(() => vi.advanceTimersByTime(30_000)); expect(select).not.toHaveBeenCalled()
		act(() => result.current.setHovered(false)); act(() => vi.advanceTimersByTime(PLAYING_ROTATION_INTERVAL)); expect(select).toHaveBeenCalledOnce()
	})
	it('does not rotate in a hidden tab or jump immediately when the tab becomes visible', () => {
		const hidden = vi.spyOn(document, 'hidden', 'get'), select = vi.fn(), ref = region(); renderHook(() => usePlayingRotation(ref, [1, 2], 1, select))
		hidden.mockReturnValue(true); act(() => document.dispatchEvent(new Event('visibilitychange'))); act(() => vi.advanceTimersByTime(30_000)); expect(select).not.toHaveBeenCalled()
		hidden.mockReturnValue(false); act(() => document.dispatchEvent(new Event('visibilitychange'))); act(() => vi.advanceTimersByTime(19_999)); expect(select).not.toHaveBeenCalled(); act(() => vi.advanceTimersByTime(1)); expect(select).toHaveBeenCalledOnce()
	})
	it('starts paused for reduced motion but permits an explicit start', () => {
		vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
		const select = vi.fn(), ref = region(); const { result } = renderHook(() => usePlayingRotation(ref, [1, 2], 1, select))
		expect(result.current.paused).toBe(true); act(() => vi.advanceTimersByTime(30_000)); expect(select).not.toHaveBeenCalled(); act(() => result.current.setPaused(false)); act(() => vi.advanceTimersByTime(PLAYING_ROTATION_INTERVAL)); expect(select).toHaveBeenCalledOnce()
	})
	it('pauses offscreen and releases its observer on unmount', () => {
		let update!: IntersectionObserverCallback; const observe = vi.fn(), disconnect = vi.fn()
		vi.stubGlobal('IntersectionObserver', class { constructor(callback: IntersectionObserverCallback) { update = callback } observe = observe; disconnect = disconnect })
		const select = vi.fn(), ref = region(); const { unmount } = renderHook(() => usePlayingRotation(ref, [1, 2], 1, select))
		act(() => vi.advanceTimersByTime(30_000)); expect(select).not.toHaveBeenCalled()
		act(() => update([{ isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry], {} as IntersectionObserver)); act(() => vi.advanceTimersByTime(PLAYING_ROTATION_INTERVAL)); expect(select).toHaveBeenCalledOnce()
		unmount(); expect(disconnect).toHaveBeenCalledOnce()
	})
	it('stops rather than changing the background when a dialog is open', () => {
		const dialog = document.createElement('dialog'); dialog.open = true; document.body.append(dialog)
		const select = vi.fn(), ref = region(); const { result } = renderHook(() => usePlayingRotation(ref, [1, 2], 1, select))
		act(() => vi.advanceTimersByTime(PLAYING_ROTATION_INTERVAL)); expect(select).not.toHaveBeenCalled(); expect(result.current.paused).toBe(true); dialog.remove()
	})
	it('uses the latest callback without restarting for unrelated renders and cleans its timer', () => {
		const first = vi.fn(), latest = vi.fn(), ref = region(); const { rerender, unmount } = renderHook(({ select }) => usePlayingRotation(ref, [1, 2], 1, select), { initialProps: { select: first } })
		act(() => vi.advanceTimersByTime(10_000)); rerender({ select: latest }); act(() => vi.advanceTimersByTime(10_000)); expect(first).not.toHaveBeenCalled(); expect(latest).toHaveBeenCalledOnce(); unmount(); act(() => vi.advanceTimersByTime(60_000)); expect(latest).toHaveBeenCalledOnce()
	})
	it('does nothing with fewer than two games', () => {
		const select = vi.fn(), ref = region(); const { rerender } = renderHook(({ ids }) => usePlayingRotation(ref, ids, 1, select), { initialProps: { ids: [] as number[] } })
		act(() => vi.advanceTimersByTime(30_000)); rerender({ ids: [1] }); act(() => vi.advanceTimersByTime(30_000)); expect(select).not.toHaveBeenCalled()
	})
	it('reacts to a reduced-motion preference enabled while the page is open', () => {
		let changed!: () => void
		const media = { matches: false, addEventListener: vi.fn((_event, listener) => { changed = listener }), removeEventListener: vi.fn() }
		vi.stubGlobal('matchMedia', vi.fn(() => media))
		const select = vi.fn(), ref = region(); const { result } = renderHook(() => usePlayingRotation(ref, [1, 2], 1, select))
		media.matches = true; act(() => changed()); act(() => vi.advanceTimersByTime(PLAYING_ROTATION_INTERVAL)); expect(result.current.paused).toBe(true); expect(select).not.toHaveBeenCalled()
	})
	it('cancels the old dataset timer before rotating a replacement dataset', () => {
		const select = vi.fn(), ref = region(); const { rerender } = renderHook(({ ids, selected }) => usePlayingRotation(ref, ids, selected, select), { initialProps: { ids: [1, 2], selected: 1 } })
		act(() => vi.advanceTimersByTime(19_000)); rerender({ ids: [8, 9], selected: 8 }); act(() => vi.advanceTimersByTime(1_000)); expect(select).not.toHaveBeenCalled(); act(() => vi.advanceTimersByTime(19_000)); expect(select).toHaveBeenCalledExactlyOnceWith(9)
	})
})
