import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MetadataAutofillPhase, MetadataAutofillResult, MetadataAutofillTarget } from '@/services/GamesService/MetadataAutofillService'
import { useMetadataAutofillBatch } from './useMetadataAutofillBatch'

const calls = vi.hoisted(() => ({ fill: vi.fn(), artwork: vi.fn(), invalidate: vi.fn(), display: vi.fn() }))
vi.mock('@/services/GamesService/MetadataAutofillService', async original => ({ ...await original<typeof import('@/services/GamesService/MetadataAutofillService')>(), autofillGameMetadata: calls.fill, refreshGameMetadataArtwork: calls.artwork }))
vi.mock('@/services/CollectionService/collectionEvents', () => ({ invalidateCollection: calls.invalidate, gameArtworkRefreshed: calls.display }))
const targets = [{ id: 51, name: 'First public fixture' }, { id: 52, name: 'Second public fixture' }]
const result = (target: MetadataAutofillTarget, status: MetadataAutofillResult['status'] = 'updated'): MetadataAutofillResult => ({ ...target, status, appliedFields: status === 'updated' || status === 'partial' ? ['developer'] : [], notices: [] })
const deferred = <T,>() => { let resolve!: (value: T) => void, reject!: (reason: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }

describe('one explicit owner-scoped metadata batch', () => {
	beforeEach(() => {
		Object.values(calls).forEach(call => call.mockReset())
		calls.fill.mockImplementation(async (target: MetadataAutofillTarget, _overwrite: boolean, _signal: AbortSignal, phase: (value: MetadataAutofillPhase) => void) => { phase('looking'); phase('saving'); return result(target) })
		calls.artwork.mockImplementation(async (target: MetadataAutofillTarget) => ({ ...result(target), appliedFields: ['cover'] }))
	})
	it('freezes the exact selected IDs and processes them sequentially, not a changing dataset', async () => {
		const first = deferred<MetadataAutofillResult>(), scope = targets.map(target => ({ ...target }))
		calls.fill.mockReturnValueOnce(first.promise)
		const { result: hook } = renderHook(() => useMetadataAutofillBatch(1))
		act(() => { expect(hook.current.start(scope, false)).toBe(true); expect(hook.current.start([targets[1]], true)).toBe(false) })
		scope[0].id = 999; scope.push({ id: 1000, name: 'Never selected' })
		expect(calls.fill).toHaveBeenCalledOnce(); expect(calls.fill.mock.calls[0][0]).toEqual(targets[0]); expect(hook.current.batch?.targets).toEqual(targets)
		await act(async () => { first.resolve(result(targets[0])); await first.promise })
		await waitFor(() => expect(hook.current.batch?.busy).toBe(false))
		expect(calls.fill.mock.calls.map(([target]) => target.id)).toEqual([51, 52]); expect(hook.current.batch?.results.map(entry => entry.status)).toEqual(['updated', 'updated']); expect(calls.invalidate).toHaveBeenCalledTimes(2)
	})
	it('does not run without an owner or a valid nonempty scope', () => {
		const { result: anonymous } = renderHook(() => useMetadataAutofillBatch(undefined)); expect(anonymous.current.start(targets, false)).toBe(false)
		const { result: owner } = renderHook(() => useMetadataAutofillBatch(1)); expect(owner.current.start([], false)).toBe(false); expect(owner.current.start([targets[0], targets[0]], false)).toBe(false); expect(calls.fill).not.toHaveBeenCalled()
	})
	it('keeps successful receipts, continues after failure and retries only unfinished metadata', async () => {
		calls.fill.mockRejectedValueOnce(new Error('Source unavailable'))
		const { result: hook } = renderHook(() => useMetadataAutofillBatch(1))
		act(() => { hook.current.start(targets, true) }); await waitFor(() => expect(hook.current.batch?.busy).toBe(false))
		expect(hook.current.batch?.results.map(entry => entry.status)).toEqual(['failed', 'updated'])
		act(() => { expect(hook.current.retry()).toBe(true) }); await waitFor(() => expect(hook.current.batch?.busy).toBe(false))
		expect(calls.fill.mock.calls.map(([target]) => target.id)).toEqual([51, 52, 51]); expect(calls.fill.mock.calls.every(([, overwrite]) => overwrite === true)).toBe(true)
		expect(hook.current.batch?.targets).toEqual(targets); expect(hook.current.batch?.results.map(entry => entry.status)).toEqual(['updated', 'updated'])
	})
	it('retries a partially filled source failure without touching completed games or manual edition choices', async () => {
		calls.fill.mockResolvedValueOnce(result(targets[0], 'partial')).mockResolvedValueOnce(result(targets[1], 'review'))
		const { result: hook } = renderHook(() => useMetadataAutofillBatch(1))
		act(() => { hook.current.start(targets, false) }); await waitFor(() => expect(hook.current.batch?.busy).toBe(false))
		act(() => { expect(hook.current.retry()).toBe(true) }); await waitFor(() => expect(hook.current.batch?.busy).toBe(false))
		expect(calls.fill.mock.calls.map(([target]) => target.id)).toEqual([51, 52, 51]); expect(hook.current.batch?.results[1].status).toBe('review')
	})
	it('stops read-only work, marks the exact unprocessed remainder and keeps prior receipts', async () => {
		const pending = deferred<MetadataAutofillResult>(); calls.fill.mockImplementationOnce(async () => result(targets[0])).mockImplementationOnce((_target, _overwrite, _signal, phase) => { phase('looking'); return pending.promise })
		const { result: hook } = renderHook(() => useMetadataAutofillBatch(1))
		act(() => { hook.current.start(targets, false) }); await waitFor(() => expect(calls.fill).toHaveBeenCalledTimes(2))
		const signal = calls.fill.mock.calls[1][2] as AbortSignal
		act(() => hook.current.stop()); expect(signal.aborted).toBe(true)
		await act(async () => { pending.resolve(result(targets[1])); await pending.promise }); await waitFor(() => expect(hook.current.batch?.busy).toBe(false))
		expect(hook.current.batch?.results.map(entry => entry.status)).toEqual(['updated', 'cancelled']); expect(calls.invalidate).toHaveBeenCalledOnce()
	})
	it('does not cancel an in-flight write when Stop is requested', async () => {
		const pending = deferred<MetadataAutofillResult>(); calls.fill.mockImplementationOnce((_target, _overwrite, _signal, phase) => { phase('saving'); return pending.promise })
		const { result: hook } = renderHook(() => useMetadataAutofillBatch(1))
		act(() => { hook.current.start([targets[0]], false) }); act(() => hook.current.stop()); expect((calls.fill.mock.calls[0][2] as AbortSignal).aborted).toBe(false)
		await act(async () => { pending.resolve(result(targets[0])); await pending.promise }); expect(hook.current.batch?.results[0].status).toBe('updated')
	})
	it.each([false, true])('leaving during a pending write stops AFTER its receipt, even if it fails (failure=%s)', async failure => {
		const pending = deferred<MetadataAutofillResult>(); calls.fill.mockImplementationOnce((_target, _overwrite, _signal, phase) => { phase('saving'); return pending.promise })
		const { result: hook } = renderHook(() => useMetadataAutofillBatch(1))
		act(() => { hook.current.start(targets, false) }); act(() => hook.current.close()); expect(hook.current.batch?.busy).toBe(true); expect((calls.fill.mock.calls[0][2] as AbortSignal).aborted).toBe(false)
		await act(async () => { if (failure) pending.reject(new Error('Write could not be confirmed')); else pending.resolve(result(targets[0])); await pending.promise.catch(() => undefined) })
		await waitFor(() => expect(hook.current.batch).toBeNull()); expect(calls.fill).toHaveBeenCalledOnce()
	})
	it('clears a dismissed read batch and never publishes its late result or remaining IDs', async () => {
		const pending = deferred<MetadataAutofillResult>(); calls.fill.mockReturnValueOnce(pending.promise)
		const { result: hook } = renderHook(() => useMetadataAutofillBatch(1))
		act(() => { hook.current.start(targets, false); hook.current.close() }); expect(hook.current.batch).toBeNull()
		await act(async () => { pending.resolve(result(targets[0])); await pending.promise }); expect(hook.current.batch).toBeNull(); expect(calls.fill).toHaveBeenCalledOnce(); expect(calls.invalidate).not.toHaveBeenCalled()
	})
	it('aborts on account change and old callbacks cannot start or close the next owner operation', async () => {
		const first = deferred<MetadataAutofillResult>(), second = deferred<MetadataAutofillResult>(); calls.fill.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
		const { result: hook, rerender } = renderHook(({ ownerId }) => useMetadataAutofillBatch(ownerId), { initialProps: { ownerId: 1 } })
		act(() => { hook.current.start(targets, false) }); const old = hook.current, signal = calls.fill.mock.calls[0][2] as AbortSignal
		rerender({ ownerId: 2 }); expect(signal.aborted).toBe(true); expect(hook.current.batch).toBeNull()
		act(() => { expect(old.start(targets, false)).toBe(false); hook.current.start([targets[1]], false); old.close(); old.stop() })
		expect((calls.fill.mock.calls[1][2] as AbortSignal).aborted).toBe(false)
		await act(async () => { first.resolve(result(targets[0])); second.resolve(result(targets[1])); await Promise.all([first.promise, second.promise]) })
		expect(hook.current.batch?.ownerId).toBe(2); expect(hook.current.batch?.results.map(entry => entry.id)).toEqual([52]); expect(calls.invalidate).toHaveBeenCalledOnce()
	})
	it('aborts on provider unmount without a late invalidation or another target request', async () => {
		const pending = deferred<MetadataAutofillResult>(); calls.fill.mockReturnValueOnce(pending.promise)
		const { result: hook, unmount } = renderHook(() => useMetadataAutofillBatch(1))
		act(() => { hook.current.start(targets, false) }); const signal = calls.fill.mock.calls[0][2] as AbortSignal; unmount(); expect(signal.aborted).toBe(true)
		await act(async () => { pending.resolve(result(targets[0])); await pending.promise }); expect(calls.fill).toHaveBeenCalledOnce(); expect(calls.invalidate).not.toHaveBeenCalled()
	})
	it('keeps artwork retries separate from general autofill and retries same-URL display only after a confirmed save', async () => {
		calls.artwork.mockRejectedValueOnce(new Error('Image unavailable'))
		const { result: hook } = renderHook(() => useMetadataAutofillBatch(1))
		act(() => { hook.current.startArtwork(targets, 'cover') }); await waitFor(() => expect(hook.current.batch?.busy).toBe(false))
		expect(hook.current.batch?.artworkField).toBe('cover'); expect(calls.display).toHaveBeenCalledExactlyOnceWith(52)
		act(() => { hook.current.retry() }); await waitFor(() => expect(hook.current.batch?.busy).toBe(false))
		expect(calls.artwork.mock.calls.map(([target, field]) => [target.id, field])).toEqual([[51, 'cover'], [52, 'cover'], [51, 'cover']]); expect(calls.fill).not.toHaveBeenCalled(); expect(calls.display).toHaveBeenCalledTimes(2)
	})
})
