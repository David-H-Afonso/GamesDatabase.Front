import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCollectionResource } from './useCollectionResource'
import { invalidateCollection } from '@/services/CollectionService/collectionEvents'

let userId: number | undefined = 1
vi.mock('@/store/hooks', () => ({ useAppSelector: (selector: (value: unknown) => unknown) => selector({ auth: { user: userId ? { id: userId } : null } }) }))
const pending = <T,>() => { let resolve!: (value: T) => void; let reject!: () => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }

describe('collection resource identity and invalidation', () => {
	beforeEach(() => { userId = 1 })
	it('hides another query immediately and ignores its late response', async () => {
		const first = pending<string>(), second = pending<string>(), signals: AbortSignal[] = []
		const { result, rerender } = renderHook(({ key }) => useCollectionResource(key, signal => { signals.push(signal); return key === 'first' ? first.promise : second.promise }), { initialProps: { key: 'first' } })
		rerender({ key: 'second' }); expect(signals[0].aborted).toBe(true); expect(result.current.data).toBeNull()
		await act(async () => { second.resolve('second'); await second.promise }); expect(result.current.data).toBe('second')
		await act(async () => { first.resolve('stale'); await first.promise }); expect(result.current.data).toBe('second')
	})
	it('retains the same identity during invalidation but removes it as soon as the account changes', async () => {
		const refresh = pending<string>(), load = vi.fn().mockResolvedValueOnce('account one').mockImplementationOnce(() => refresh.promise).mockResolvedValue('account two')
		const { result, rerender } = renderHook(() => useCollectionResource('home', load))
		await waitFor(() => expect(result.current.data).toBe('account one'))
		act(invalidateCollection); expect(result.current.loading).toBe(true); expect(result.current.data).toBe('account one')
		userId = 2; rerender(); expect(result.current.data).toBeNull()
		await waitFor(() => expect(result.current.data).toBe('account two'))
		await act(async () => { refresh.resolve('late old account'); await refresh.promise }); expect(result.current.data).toBe('account two')
	})
	it('does not fetch an anonymous or disabled source', () => {
		const load = vi.fn().mockResolvedValue('private')
		userId = undefined
		const { result } = renderHook(() => useCollectionResource('home', load))
		expect(load).not.toHaveBeenCalled(); expect(result.current.data).toBeNull()
	})
	it('accepts an authoritative mutation result without an older in-flight read replacing it', async () => {
		const old = pending<string>()
		const { result } = renderHook(() => useCollectionResource('config', () => old.promise))
		act(() => result.current.replaceData('just saved revision'))
		expect(result.current.data).toBe('just saved revision'); expect(result.current.loading).toBe(false)
		await act(async () => { old.resolve('old read'); await old.promise })
		expect(result.current.data).toBe('just saved revision')
	})
	it('ignores a stale account mutation callback instead of erasing the current account data', async () => {
		const load = vi.fn().mockResolvedValueOnce('account one').mockResolvedValue('account two')
		const { result, rerender } = renderHook(() => useCollectionResource('config', load))
		await waitFor(() => expect(result.current.data).toBe('account one')); const staleReplace = result.current.replaceData
		userId = 2; rerender(); await waitFor(() => expect(result.current.data).toBe('account two'))
		act(() => staleReplace('old mutation'))
		expect(result.current.data).toBe('account two')
	})
	it('revalidates only this resource and retains its last data until the new read completes', async () => {
		const next = pending<string>(), load = vi.fn().mockResolvedValueOnce('before').mockImplementationOnce(() => next.promise)
		const { result } = renderHook(() => useCollectionResource('detail:51', load))
		await waitFor(() => expect(result.current.data).toBe('before'))
		act(() => result.current.refresh()); expect(result.current.data).toBe('before'); expect(result.current.loading).toBe(true)
		await act(async () => { next.resolve('persisted metadata'); await next.promise }); expect(result.current.data).toBe('persisted metadata')
	})
})
