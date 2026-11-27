import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createGame } from '@/test/factories'
import { GameMetadataProvider } from './GameMetadataProvider'
import { useGameMetadata } from './gameMetadataContext'
import type { MetadataAutofillResult, MetadataAutofillTarget } from '@/services/GamesService/MetadataAutofillService'

let ownerId: number | undefined = 1
vi.mock('@/store/hooks', () => ({ useAppSelector: (selector: (state: unknown) => unknown) => selector({ auth: { isAuthenticated: Boolean(ownerId), user: ownerId ? { id: ownerId } : null } }) }))
const calls = vi.hoisted(() => ({ fill: vi.fn(), artwork: vi.fn() }))
vi.mock('@/services/GamesService/MetadataAutofillService', async original => ({ ...await original<typeof import('@/services/GamesService/MetadataAutofillService')>(), autofillGameMetadata: calls.fill, refreshGameMetadataArtwork: calls.artwork }))
const targets = [{ id: 11, name: 'Public fixture' }]

describe('metadata selections are scoped to the current account', () => {
	beforeEach(() => { ownerId = 1; Object.values(calls).forEach(call => call.mockReset()); calls.fill.mockImplementation(async (target: MetadataAutofillTarget): Promise<MetadataAutofillResult> => ({ ...target, status: 'unchanged', appliedFields: [], notices: [] })) })
	it('keeps a selection across replaced cards but closes it immediately on account change', () => {
		const { result, rerender } = renderHook(useGameMetadata, { wrapper: GameMetadataProvider })
		const game = createGame({ id: 11, name: 'First account' })
		act(() => result.current!.open(game)); rerender(); expect(result.current!.game).toEqual(game)
		ownerId = 2; rerender(); expect(result.current!.game).toBeNull()
	})
	it('late callbacks from an old account cannot replace or close the current review', () => {
		const { result, rerender } = renderHook(useGameMetadata, { wrapper: GameMetadataProvider })
		const old = result.current!, first = createGame({ id: 11 }), second = createGame({ id: 22 })
		ownerId = 2; rerender(); act(() => result.current!.open(second))
		act(() => { old.open(first); old.close() }); expect(result.current!.game).toEqual(second)
		act(() => result.current!.close(first.id)); expect(result.current!.game).toEqual(second)
		act(() => result.current!.close(second.id)); expect(result.current!.game).toBeNull()
	})
	it('does not retain or create a review after logout', () => {
		const { result, rerender } = renderHook(useGameMetadata, { wrapper: GameMetadataProvider })
		act(() => result.current!.open(createGame())); ownerId = undefined; rerender()
		act(() => result.current!.open(createGame())); expect(result.current!.game).toBeNull()
	})
	it('does not open a batch while a manual review is active, including the same event tick', () => {
		const { result } = renderHook(useGameMetadata, { wrapper: GameMetadataProvider })
		act(() => { result.current!.open(createGame({ id: 11 })); expect(result.current!.openBatch(targets)).toBe(false); expect(result.current!.openArtworkBatch(targets, 'cover')).toBe(false) })
		expect(result.current!.game?.id).toBe(11); expect(result.current!.batch).toBeNull(); expect(calls.fill).not.toHaveBeenCalled(); expect(calls.artwork).not.toHaveBeenCalled()
	})
	it('does not replace a running batch with a manual review, even using a same-tick callback', () => {
		calls.fill.mockImplementation((target, _overwrite, signal, phase) => { phase('looking'); return new Promise(resolve => signal.addEventListener('abort', () => resolve({ ...target, status: 'cancelled', appliedFields: [], notices: [] }), { once: true })) })
		const { result } = renderHook(useGameMetadata, { wrapper: GameMetadataProvider })
		act(() => { expect(result.current!.openBatch(targets)).toBe(true); result.current!.open(createGame({ id: 99 })) })
		expect(result.current!.game).toBeNull(); expect(result.current!.batch?.busy).toBe(true); expect((calls.fill.mock.calls[0][2] as AbortSignal).aborted).toBe(false)
	})
	it('defaults batches to empty-only, retains results and permits a later explicit manual review', async () => {
		const { result } = renderHook(useGameMetadata, { wrapper: GameMetadataProvider })
		act(() => { result.current!.openBatch(targets) }); await waitFor(() => expect(result.current!.batch?.busy).toBe(false))
		expect(calls.fill.mock.calls[0][1]).toBe(false); expect(result.current!.batch?.results[0].status).toBe('unchanged')
		act(() => result.current!.open(createGame({ id: 11 }))); expect(result.current!.batch).toBeNull(); expect(result.current!.game?.id).toBe(11)
	})
	it('rejects stale batch starts and result retries after an owner transition', async () => {
		const { result, rerender } = renderHook(useGameMetadata, { wrapper: GameMetadataProvider }), old = result.current!
		ownerId = 2; rerender(); act(() => { expect(old.openBatch(targets)).toBe(false); expect(old.openArtworkBatch(targets, 'cover')).toBe(false); expect(old.retryBatch()).toBe(false); result.current!.openBatch([{ id: 22, name: 'Second public fixture' }]) })
		await waitFor(() => expect(result.current!.batch?.busy).toBe(false)); expect(result.current!.batch?.ownerId).toBe(2); expect(calls.fill).toHaveBeenCalledOnce()
	})
})
