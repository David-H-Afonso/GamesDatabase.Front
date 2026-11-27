import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { metadataJob, metadataJobItem } from '@/test/factories/metadataJob'
import type { MetadataJobStart } from '@/models/api/MetadataAutofillJob'
import { useMetadataAutofillJob } from './useMetadataAutofillJob'

const calls = vi.hoisted(() => ({ current: vi.fn(), get: vi.fn(), history: vi.fn(), start: vi.fn(), change: vi.fn(), invalidate: vi.fn() }))
vi.mock('@/services/GamesService/MetadataAutofillJobService', () => ({ getCurrentMetadataJob: calls.current, getMetadataJob: calls.get, getMetadataJobHistory: calls.history, startMetadataJob: calls.start, changeMetadataJob: calls.change }))
vi.mock('@/services/CollectionService/collectionEvents', () => ({ invalidateCollection: calls.invalidate }))
const targets = [{ id: 11, name: 'Public fixture' }, { id: 12, name: 'Second public fixture' }]
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done }); return { promise, resolve } }
beforeEach(() => {
	Object.values(calls).forEach(call => call.mockReset())
	calls.current.mockResolvedValue(null); calls.history.mockResolvedValue([])
	calls.start.mockImplementation(async (request: MetadataJobStart) => metadataJob({ clientRequestId: request.clientRequestId, overwrite: request.overwrite, acceptListedPlatformCritic: request.acceptListedPlatformCritic }))
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('persistent autofill observation', () => {
	it('can submit on local HTTP where crypto.randomUUID is unavailable', async () => {
		const getRandomValues = crypto.getRandomValues.bind(crypto)
		vi.stubGlobal('crypto', { getRandomValues })
		const { result } = renderHook(() => useMetadataAutofillJob(1))
		act(() => { expect(result.current.start(targets, false)).toBe(true) })
		await waitFor(() => expect(result.current.busy).toBe(false))
		expect(calls.start.mock.calls[0][0].clientRequestId).toMatch(/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/)
	})
	it('only recovers on mount; explicit start freezes exact scope and batch critic choice', async () => {
		const { result } = renderHook(() => useMetadataAutofillJob(1))
		await waitFor(() => expect(calls.current).toHaveBeenCalledOnce()); expect(calls.start).not.toHaveBeenCalled()
		const input = targets.map(target => ({ ...target }))
		act(() => { expect(result.current.start(input, true)).toBe(true); input[0].id = 999 })
		await waitFor(() => expect(result.current.busy).toBe(false))
		expect(calls.start).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ gameIds: [11, 12], overwrite: true, acceptListedPlatformCritic: true }), expect.any(AbortSignal))
		expect(result.current.job?.totalGames).toBe(2)
	})
	it('hiding, navigation-like cleanup and closing the browser never send cancellation', async () => {
		calls.current.mockResolvedValue(metadataJob())
		const { result, unmount } = renderHook(() => useMetadataAutofillJob(1))
		await waitFor(() => expect(result.current.job?.active).toBe(true))
		act(() => { result.current.show(); result.current.hide() })
		expect(result.current.open).toBe(false); expect(result.current.job?.active).toBe(true)
		const signal = calls.current.mock.calls[0][1] as AbortSignal
		unmount(); expect(signal.aborted).toBe(true); expect(calls.change).not.toHaveBeenCalled(); expect(calls.start).not.toHaveBeenCalled()
		const resumed = renderHook(() => useMetadataAutofillJob(1))
		await waitFor(() => expect(resumed.result.current.job?.id).toBe(metadataJob().id)); expect(resumed.result.current.open).toBe(false); expect(calls.start).not.toHaveBeenCalled()
	})
	it('blocks same-tick duplicate submissions and never switches an active job scope', async () => {
		const delayed = deferred<ReturnType<typeof metadataJob>>()
		calls.start.mockReturnValue(delayed.promise)
		const { result } = renderHook(() => useMetadataAutofillJob(1))
		act(() => { expect(result.current.start(targets, false)).toBe(true); expect(result.current.start([{ id: 99, name: 'Different scope' }], true)).toBe(false) })
		const request = calls.start.mock.calls[0][0] as MetadataJobStart
		await act(async () => delayed.resolve(metadataJob({ clientRequestId: request.clientRequestId })))
		await act(async () => { expect(result.current.start(targets, true)).toBe(false) }); expect(calls.start).toHaveBeenCalledOnce()
	})
	it('reconciles an uncertain accepted POST with GET without sending another POST', async () => {
		calls.start.mockImplementation(async (request: MetadataJobStart) => { calls.current.mockResolvedValue(metadataJob({ clientRequestId: request.clientRequestId })); throw new TypeError('Synthetic lost response') })
		const { result } = renderHook(() => useMetadataAutofillJob(1))
		act(() => { result.current.start(targets, false) })
		await waitFor(() => expect(result.current.busy).toBe(false))
		expect(result.current.job?.active).toBe(true); expect(result.current.error).toBeNull(); expect(calls.start).toHaveBeenCalledOnce()
	})
	it('retains the request key for an explicit uncertain-start retry', async () => {
		calls.start.mockRejectedValue(new TypeError('Synthetic network error'))
		const { result } = renderHook(() => useMetadataAutofillJob(1))
		act(() => { result.current.start(targets, true) }); await waitFor(() => expect(result.current.error).toBe('start'))
		const first = calls.start.mock.calls[0][0] as MetadataJobStart
		act(() => { result.current.retryStart() }); await waitFor(() => expect(calls.start).toHaveBeenCalledTimes(2))
		expect(calls.start.mock.calls[1][0]).toEqual(first)
	})
	it('rejects old-owner callbacks and late read results without cancelling that owner’s server job', async () => {
		const delayed = deferred<ReturnType<typeof metadataJob> | null>()
		calls.current.mockReturnValueOnce(delayed.promise).mockResolvedValue(null)
		const { result, rerender } = renderHook(({ owner }) => useMetadataAutofillJob(owner), { initialProps: { owner: 1 } })
		const old = result.current
		rerender({ owner: 2 }); expect(result.current.job).toBeNull()
		act(() => { expect(old.start(targets, true)).toBe(false); old.show() })
		await act(async () => delayed.resolve(metadataJob()))
		expect(result.current.job).toBeNull(); expect(result.current.open).toBe(false); expect(calls.change).not.toHaveBeenCalled(); expect(calls.start).not.toHaveBeenCalled()
	})
	it('ignores a stale pre-start read instead of replacing the newly accepted job', async () => {
		const delayed = deferred<ReturnType<typeof metadataJob> | null>(); calls.current.mockReturnValueOnce(delayed.promise)
		const { result } = renderHook(() => useMetadataAutofillJob(1))
		act(() => { result.current.start(targets, false) }); await waitFor(() => expect(result.current.job).not.toBeNull())
		const accepted = result.current.job?.clientRequestId
		await act(async () => delayed.resolve(null)); expect(result.current.job?.clientRequestId).toBe(accepted)
	})
	it('cancellation is explicit and single-flight; it never repeats an uncertain action automatically', async () => {
		calls.current.mockResolvedValue(metadataJob())
		const delayed = deferred<ReturnType<typeof metadataJob>>(); calls.change.mockReturnValue(delayed.promise)
		const { result } = renderHook(() => useMetadataAutofillJob(1)); await waitFor(() => expect(result.current.job).not.toBeNull())
		let first!: Promise<boolean>, second!: Promise<boolean>
		act(() => { first = result.current.change('cancel'); second = result.current.change('cancel') })
		expect(await second).toBe(false); expect(calls.change).toHaveBeenCalledOnce()
		await act(async () => { delayed.resolve(metadataJob({ state: 'cancelling' })); await first })
		expect(calls.change).toHaveBeenCalledExactlyOnceWith(metadataJob().id, 'cancel', expect.any(AbortSignal))
	})
	it('retains full result details when a summary poll or hidden state omits the rows', async () => {
		const complete = metadataJob({ state: 'completed', active: false, items: [metadataJobItem({ status: 'review', notices: ['chooseDurationIdentity'] })] })
		calls.current.mockResolvedValue(complete)
		const { result } = renderHook(() => useMetadataAutofillJob(1)); await waitFor(() => expect(result.current.job).not.toBeNull())
		act(() => result.current.show()); await waitFor(() => expect(result.current.detail?.items).toHaveLength(1))
		calls.current.mockResolvedValue({ ...complete, items: [] }); act(() => { result.current.hide(); result.current.refresh() })
		await waitFor(() => expect(calls.current).toHaveBeenCalledTimes(3)); expect(result.current.detail?.items).toHaveLength(1)
	})
	it('polls only active work and stops all observation timers when unmounted', async () => {
		vi.useFakeTimers(); calls.current.mockResolvedValue(metadataJob())
		const { unmount } = renderHook(() => useMetadataAutofillJob(1))
		await act(async () => { await Promise.resolve() }); expect(calls.current).toHaveBeenCalledOnce()
		await act(async () => { await vi.advanceTimersByTimeAsync(5000) }); expect(calls.current).toHaveBeenCalledTimes(2)
		unmount(); expect(vi.getTimerCount()).toBe(0)
	})
})
