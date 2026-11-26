import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createGame } from '@/test/factories'
import { useRandomGame } from './useRandomGame'

const fetchGame = vi.hoisted(() => vi.fn())
vi.mock('@/services/CollectionService/DiscoveryService', () => ({ getRandomGame: fetchGame }))
const deferred = () => { let resolve!: (game: ReturnType<typeof createGame>) => void; return { promise: new Promise<ReturnType<typeof createGame>>(yes => { resolve = yes }), resolve: (game: ReturnType<typeof createGame>) => resolve(game) } }
describe('whole-library random command', () => {
	beforeEach(() => { fetchGame.mockReset() })
	it('is single-flight and opens only the server-selected full DTO', async () => {
		const pending = deferred(), open = vi.fn(); fetchGame.mockReturnValue(pending.promise)
		const { result } = renderHook(() => useRandomGame(1, 'route', open))
		let task!: Promise<void>; act(() => { task = result.current.pick(); void result.current.pick() }); expect(fetchGame).toHaveBeenCalledOnce()
		const game = createGame({ id: 900 }); await act(async () => { pending.resolve(game); await task })
		expect(open).toHaveBeenCalledWith(game); expect(result.current.loading).toBe(false)
	})
	it.each([{ owner: 2, route: 'one' }, { owner: 1, route: 'two' }])('aborts a late result on an account or route transition', async next => {
		const pending = deferred(), open = vi.fn(); fetchGame.mockReturnValue(pending.promise)
		const { result, rerender } = renderHook(({ owner, route }) => useRandomGame(owner, route, open), { initialProps: { owner: 1, route: 'one' } })
		let task!: Promise<void>; act(() => { task = result.current.pick() }); const signal = fetchGame.mock.calls[0][0] as AbortSignal
		rerender(next); expect(signal.aborted).toBe(true)
		await act(async () => { pending.resolve(createGame()); await task }); expect(open).not.toHaveBeenCalled(); expect(result.current.loading).toBe(false)
	})
	it.each([404, 500])('reports %i as a failure without treating an unknown route as an empty library', async status => {
		fetchGame.mockRejectedValue(Object.assign(new Error('Fixture'), { status })); const open = vi.fn()
		const { result } = renderHook(() => useRandomGame(1, 'route', open)); await act(async () => { await result.current.pick() })
		expect(result.current.error).toBe('failed'); expect(fetchGame).toHaveBeenCalledOnce(); expect(open).not.toHaveBeenCalled()
	})
	it.each(['emptyLibrary', 'emptySelection'])('recognizes the explicit %s contract and never widens its pool', async code => {
		fetchGame.mockRejectedValue(Object.assign(new Error('Fixture'), { status: 404, code })); const open = vi.fn()
		const { result } = renderHook(() => useRandomGame(1, 'page-1', open)); await act(async () => { await result.current.pick([51, 52]) })
		expect(fetchGame).toHaveBeenCalledExactlyOnceWith(expect.any(AbortSignal), [51, 52]); expect(result.current.error).toBe('empty'); expect(open).not.toHaveBeenCalled()
	})
	it('does not fetch while anonymous', async () => {
		const { result } = renderHook(() => useRandomGame(undefined, 'route', vi.fn())); await act(async () => { await result.current.pick() }); expect(fetchGame).not.toHaveBeenCalled()
	})
	it('rejects a valid DTO outside the requested displayed IDs instead of opening a different page', async () => {
		fetchGame.mockResolvedValue(createGame({ id: 900 })); const open = vi.fn()
		const { result } = renderHook(() => useRandomGame(1, 'page-1', open)); await act(async () => { await result.current.pick([51, 52]) })
		expect(open).not.toHaveBeenCalled(); expect(result.current.error).toBe('failed')
	})
	it('cancels without opening a late result and lets a newer explicit pick finish independently', async () => {
		const first = deferred(), second = deferred(), open = vi.fn(); fetchGame.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
		const { result } = renderHook(() => useRandomGame(1, 'page-1', open)); let old!: Promise<void>, current!: Promise<void>
		act(() => { old = result.current.pick([51]) }); const signal = fetchGame.mock.calls[0][0] as AbortSignal
		act(() => { result.current.cancel(); current = result.current.pick([52]) }); expect(signal.aborted).toBe(true)
		await act(async () => { first.resolve(createGame({ id: 51 })); await old }); expect(open).not.toHaveBeenCalled(); expect(result.current.loading).toBe(true)
		await act(async () => { second.resolve(createGame({ id: 52 })); await current }); expect(open).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 52 })); expect(result.current.loading).toBe(false)
	})
	it('freezes the requested page IDs even when the caller later mutates its array', async () => {
		const pending = deferred(), open = vi.fn(), ids = [51]; fetchGame.mockReturnValue(pending.promise)
		const { result } = renderHook(() => useRandomGame(1, 'page-1', open)); let task!: Promise<void>; act(() => { task = result.current.pick(ids) }); ids.push(52)
		await act(async () => { pending.resolve(createGame({ id: 52 })); await task }); expect(fetchGame.mock.calls[0][1]).toEqual([51]); expect(open).not.toHaveBeenCalled(); expect(result.current.error).toBe('failed')
	})
	it.each([null, { id: 0, name: 'Invalid' }, { id: 51, name: null }])('rejects malformed result %j without changing the scope', async dto => {
		fetchGame.mockResolvedValue(dto); const open = vi.fn(), { result } = renderHook(() => useRandomGame(1, 'page-1', open)); await act(async () => { await result.current.pick([51]) }); expect(open).not.toHaveBeenCalled(); expect(result.current.error).toBe('failed'); expect(fetchGame).toHaveBeenCalledOnce()
	})
})
