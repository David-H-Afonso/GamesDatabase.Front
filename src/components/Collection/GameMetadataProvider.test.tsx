import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createGame } from '@/test/factories'
import { GameMetadataProvider } from './GameMetadataProvider'
import { useGameMetadata } from './gameMetadataContext'
import type { MetadataAutofillResult, MetadataAutofillTarget } from '@/services/GamesService/MetadataAutofillService'
import type { MetadataJobStart } from '@/models/api/MetadataAutofillJob'
import { metadataJob, metadataJobItem } from '@/test/factories/metadataJob'

let ownerId: number | undefined = 1
vi.mock('@/store/hooks', () => ({ useAppSelector: (selector: (state: unknown) => unknown) => selector({ auth: { isAuthenticated: Boolean(ownerId), user: ownerId ? { id: ownerId } : null } }) }))
const calls = vi.hoisted(() => ({ fill: vi.fn(), artwork: vi.fn(), current: vi.fn(), get: vi.fn(), history: vi.fn(), start: vi.fn(), change: vi.fn(), details: vi.fn() }))
vi.mock('@/services/GamesService/MetadataAutofillService', async original => ({ ...await original<typeof import('@/services/GamesService/MetadataAutofillService')>(), autofillGameMetadata: calls.fill, refreshGameMetadataArtwork: calls.artwork }))
vi.mock('@/services/GamesService/MetadataAutofillJobService', () => ({ getCurrentMetadataJob: calls.current, getMetadataJob: calls.get, getMetadataJobHistory: calls.history, startMetadataJob: calls.start, changeMetadataJob: calls.change }))
vi.mock('@/services/GamesService/GamesService', () => ({ getGameById: calls.details }))
const targets = [{ id: 11, name: 'Public fixture' }]

describe('metadata selections are scoped to the current account', () => {
	beforeEach(() => {
		ownerId = 1; Object.values(calls).forEach(call => call.mockReset())
		calls.fill.mockImplementation(async (target: MetadataAutofillTarget): Promise<MetadataAutofillResult> => ({ ...target, status: 'unchanged', appliedFields: [], notices: [] }))
		calls.current.mockResolvedValue(null); calls.history.mockResolvedValue([]); calls.details.mockImplementation(async (id: number) => createGame({ id }))
		calls.start.mockImplementation(async (request: MetadataJobStart) => {
			const job = metadataJob({ clientRequestId: request.clientRequestId, state: 'completed', active: false, overwrite: request.overwrite, acceptListedPlatformCritic: request.acceptListedPlatformCritic, items: request.gameIds.map(gameId => metadataJobItem({ gameId, status: 'unchanged' })) })
			calls.current.mockResolvedValue(job); calls.get.mockResolvedValue(job); return job
		})
	})
	it('keeps a selection across replaced cards but closes it immediately on account change', async () => {
		const { result, rerender } = renderHook(useGameMetadata, { wrapper: GameMetadataProvider })
		const game = createGame({ id: 11, name: 'First account' })
		await act(async () => { result.current!.open(game); rerender() }); expect(result.current!.game).toEqual(game)
		ownerId = 2; await act(async () => { rerender() }); expect(result.current!.game).toBeNull()
	})
	it('late callbacks from an old account cannot replace or close the current review', async () => {
		const { result, rerender } = renderHook(useGameMetadata, { wrapper: GameMetadataProvider })
		const old = result.current!, first = createGame({ id: 11 }), second = createGame({ id: 22 })
		ownerId = 2; await act(async () => { rerender() }); await act(async () => { result.current!.open(second) })
		act(() => { old.open(first); old.close() }); expect(result.current!.game).toEqual(second)
		act(() => result.current!.close(first.id)); expect(result.current!.game).toEqual(second)
		act(() => result.current!.close(second.id)); expect(result.current!.game).toBeNull()
	})
	it('does not retain or create a review after logout', () => {
		const { result, rerender } = renderHook(useGameMetadata, { wrapper: GameMetadataProvider })
		act(() => result.current!.open(createGame())); ownerId = undefined; rerender()
		act(() => result.current!.open(createGame())); expect(result.current!.game).toBeNull()
	})
	it('does not open a batch while a manual review is active, including the same event tick', async () => {
		const { result } = renderHook(useGameMetadata, { wrapper: GameMetadataProvider })
		await act(async () => { result.current!.open(createGame({ id: 11 })); expect(result.current!.openBatch(targets)).toBe(false); expect(result.current!.openArtworkBatch(targets, 'cover')).toBe(false) })
		expect(result.current!.game?.id).toBe(11); expect(result.current!.batch).toBeNull(); expect(calls.fill).not.toHaveBeenCalled(); expect(calls.artwork).not.toHaveBeenCalled()
	})
	it('allows normal app/manual use while server work continues, without cancelling the same-tick submission', async () => {
		let finish!: (value: ReturnType<typeof metadataJob>) => void
		calls.start.mockReturnValue(new Promise(resolve => { finish = resolve }))
		const { result } = renderHook(useGameMetadata, { wrapper: GameMetadataProvider })
		act(() => { expect(result.current!.openBatch(targets)).toBe(true); result.current!.open(createGame({ id: 99 })) })
		expect(result.current!.game?.id).toBe(99); expect((calls.start.mock.calls[0][1] as AbortSignal).aborted).toBe(false)
		const request = calls.start.mock.calls[0][0] as MetadataJobStart
		await act(async () => finish(metadataJob({ clientRequestId: request.clientRequestId, items: [metadataJobItem()] })))
		expect(result.current!.background?.job?.active).toBe(true); expect(calls.change).not.toHaveBeenCalled(); expect(calls.fill).not.toHaveBeenCalled()
	})
	it('defaults batches to empty-only, retains results and permits a later explicit manual review', async () => {
		const { result } = renderHook(useGameMetadata, { wrapper: GameMetadataProvider })
		act(() => { result.current!.openBatch(targets) }); await waitFor(() => expect(result.current!.background?.job?.active).toBe(false))
		expect(calls.start.mock.calls[0][0]).toMatchObject({ overwrite: false, acceptListedPlatformCritic: false }); expect(result.current!.background?.job?.items[0].status).toBe('unchanged')
		const id = result.current!.background?.job?.id
		act(() => result.current!.open(createGame({ id: 11 }))); expect(result.current!.background?.job?.id).toBe(id); expect(result.current!.game?.id).toBe(11)
	})
	it('rejects stale batch starts and result retries after an owner transition', async () => {
		const { result, rerender } = renderHook(useGameMetadata, { wrapper: GameMetadataProvider }), old = result.current!
		ownerId = 2; rerender(); act(() => { expect(old.openBatch(targets)).toBe(false); expect(old.openArtworkBatch(targets, 'cover')).toBe(false); expect(old.retryBatch()).toBe(false); result.current!.openBatch([{ id: 22, name: 'Second public fixture' }]) })
		await waitFor(() => expect(result.current!.background?.job?.active).toBe(false)); expect(calls.start).toHaveBeenCalledOnce(); expect(calls.start.mock.calls[0][0].gameIds).toEqual([22]); expect(calls.fill).not.toHaveBeenCalled()
	})
	it('reviewing the first pending game preserves its siblings and returns to the same results', async () => {
		const job = metadataJob({ state: 'completed', active: false, items: [metadataJobItem({ status: 'review', notices: ['chooseDurationIdentity'] }), metadataJobItem({ gameId: 12, status: 'review', notices: ['chooseDurationIdentity'] })] })
		calls.current.mockResolvedValue(job); calls.get.mockResolvedValue(job)
		const { result } = renderHook(useGameMetadata, { wrapper: GameMetadataProvider })
		await waitFor(() => expect(result.current!.background?.job?.id).toBe(job.id))
		act(() => result.current!.background!.show()); await waitFor(() => expect(result.current!.background?.detail?.items).toHaveLength(2))
		act(() => result.current!.reviewJobItem!(11)); await waitFor(() => expect(result.current!.game?.id).toBe(11))
		expect(result.current!.jobReview).toMatchObject({ position: 1, total: 2, jobId: job.id }); expect(result.current!.background?.detail?.items).toHaveLength(2)
		act(() => result.current!.jobReview!.next!()); await waitFor(() => expect(result.current!.game?.id).toBe(12))
		expect(result.current!.jobReview?.position).toBe(2)
		await act(async () => { result.current!.close(12) }); expect(result.current!.game).toBeNull(); expect(result.current!.background?.open).toBe(true); expect(result.current!.background?.detail?.items).toHaveLength(2)
		expect(calls.change).not.toHaveBeenCalled()
	})
	it('keeps reopened details across same-URL history rekeys/header reconnects but hides on a real route change', async () => {
		const job = metadataJob(); calls.current.mockResolvedValue(job); calls.get.mockResolvedValue(job)
		const { result, rerender } = renderHook(useGameMetadata, { wrapper: GameMetadataProvider })
		await waitFor(() => expect(result.current!.background?.job?.active).toBe(true))
		await act(async () => { result.current!.observeRoute!('/library'); result.current!.background!.show() })
		expect(result.current!.background?.open).toBe(true)
		await act(async () => { result.current!.background!.hide(); result.current!.background!.show() })
		calls.current.mockResolvedValue({ ...job, state: 'waiting', revision: 2, nextAttemptAt: '2026-11-27T12:30:00Z' })
		await act(async () => { result.current!.background!.refresh(); rerender(); result.current!.observeRoute!('/library') })
		expect(result.current!.background?.open).toBe(true); expect(result.current!.background?.job?.state).toBe('waiting')
		await act(async () => { result.current!.observeRoute!('/admin/platforms') })
		expect(result.current!.background?.open).toBe(false); expect(result.current!.background?.job?.id).toBe(job.id)
		expect(calls.change).not.toHaveBeenCalled(); expect(calls.start).not.toHaveBeenCalled()
	})
})
