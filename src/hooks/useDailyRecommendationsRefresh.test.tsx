import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HomeRowResult } from '@/models/api/Collection'
import { invalidateCollection } from '@/services/CollectionService/collectionEvents'
import { useDailyRecommendationsRefresh } from './useDailyRecommendationsRefresh'

let ownerId: number | undefined = 1
vi.mock('@/store/hooks', () => ({ useAppSelector: (selector: (state: unknown) => unknown) => selector({ auth: { user: ownerId ? { id: ownerId } : null } }) }))
vi.mock('@/services/CollectionService/collectionEvents', () => ({ invalidateCollection: vi.fn() }))
const row = (values: Partial<HomeRowResult> = {}): HomeRowResult => ({ rowId: 'daily', state: 'ready', totalMatches: 0, returnedCount: 0, hasMore: false, items: [], serverTime: '2026-11-25T23:59:59Z', refreshAt: '2026-11-26T00:00:00Z', ...values })

describe('page-scoped daily server boundary', () => {
	beforeEach(() => { ownerId = 1; vi.clearAllMocks(); vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] }); vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible') })
	afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })
	it('uses server elapsed time even when the client date is years out of sync', () => {
		vi.setSystemTime(new Date('2035-01-01T12:00:00Z')); renderHook(() => useDailyRecommendationsRefresh([row()]))
		act(() => vi.advanceTimersByTime(1299)); expect(invalidateCollection).not.toHaveBeenCalled()
		act(() => vi.advanceTimersByTime(1)); expect(invalidateCollection).toHaveBeenCalledOnce()
		act(() => vi.advanceTimersByTime(86400000)); expect(invalidateCollection).toHaveBeenCalledOnce()
	})
	it('defers hidden-page refresh until visibility resumes and never fires twice', () => {
		vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden'); renderHook(() => useDailyRecommendationsRefresh([row()]))
		act(() => vi.advanceTimersByTime(2000)); expect(invalidateCollection).not.toHaveBeenCalled()
		vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
		act(() => document.dispatchEvent(new Event('visibilitychange'))); act(() => document.dispatchEvent(new Event('visibilitychange')))
		expect(invalidateCollection).toHaveBeenCalledOnce()
	})
	it('does not refresh early just because the page becomes visible before the server deadline', () => {
		renderHook(() => useDailyRecommendationsRefresh([row()]))
		act(() => vi.advanceTimersByTime(500)); act(() => document.dispatchEvent(new Event('visibilitychange')))
		expect(invalidateCollection).not.toHaveBeenCalled()
		act(() => vi.advanceTimersByTime(800)); expect(invalidateCollection).toHaveBeenCalledOnce()
	})
	it('cancels the previous account timer and cleans up on logout or unmount', () => {
		const { rerender, unmount } = renderHook(() => useDailyRecommendationsRefresh([row()]))
		act(() => vi.advanceTimersByTime(600)); ownerId = 2; rerender()
		act(() => vi.advanceTimersByTime(700)); expect(invalidateCollection).not.toHaveBeenCalled()
		ownerId = undefined; rerender(); expect(vi.getTimerCount()).toBe(0)
		ownerId = 2; rerender(); unmount(); expect(vi.getTimerCount()).toBe(0)
		act(() => vi.advanceTimersByTime(10000)); expect(invalidateCollection).not.toHaveBeenCalled()
	})
	it('observes the earliest valid deadline and ignores malformed or non-daily rows', () => {
		renderHook(() => useDailyRecommendationsRefresh([row({ refreshAt: 'invalid' }), row({ refreshAt: undefined }), row(), row({ refreshAt: '2026-11-26T00:00:03Z' })]))
		act(() => vi.advanceTimersByTime(1300)); expect(invalidateCollection).toHaveBeenCalledOnce()
	})
	it('does not install a timer for an anonymous account or a source without server time', () => {
		ownerId = undefined; const { rerender } = renderHook(() => useDailyRecommendationsRefresh([row({ serverTime: undefined })]))
		ownerId = 1; rerender(); expect(vi.getTimerCount()).toBe(0)
	})
})
