import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createGame } from '@/test/factories'
import { gameEditorDraft } from '@/utils/gameEditor'
import { useSteamArtworkDraft } from './useSteamArtworkDraft'
import type { SteamArtwork } from '@/models/api/SteamArtwork'

const mocks = vi.hoisted(() => ({ assets: vi.fn(), preload: vi.fn() }))
vi.mock('@/services/SteamService/SteamService', () => ({ steamService: { getAppArtwork: mocks.assets } }))
vi.mock('@/utils/artworkImage', async importOriginal => ({ ...await importOriginal<typeof import('@/utils/artworkImage')>(), preloadArtwork: mocks.preload }))
const draft = gameEditorDraft(createGame({ steamAppId: 100, hero: 'https://cdn.test/old.jpg' }))
const candidate: SteamArtwork = { heroUrl: 'https://cdn.test/content-hash/header.jpg' }
const deferred = <T,>() => {
	let resolve!: (value: T) => void
	const promise = new Promise<T>(done => { resolve = done })
	return { promise, resolve }
}

describe('Steam artwork draft request lifetime', () => {
	beforeEach(() => { vi.clearAllMocks(); mocks.assets.mockResolvedValue(candidate); mocks.preload.mockResolvedValue(true) })
	it('aborts on App ID change, ignores the old response, and allows a new lookup', async () => {
		const old = deferred<SteamArtwork>(), fresh = deferred<SteamArtwork>(), apply = vi.fn()
		mocks.assets.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise)
		const { result, rerender } = renderHook(value => useSteamArtworkDraft(value, apply), { initialProps: draft })
		act(() => { void result.current.refresh('hero') })
		const oldSignal = mocks.assets.mock.calls[0][1] as AbortSignal
		rerender({ ...draft, steamAppId: '200' })
		expect(oldSignal.aborted).toBe(true); expect(result.current.loading).toBeNull()
		act(() => { void result.current.refresh('hero') })
		expect(mocks.assets).toHaveBeenLastCalledWith(200, expect.any(AbortSignal))
		await act(async () => old.resolve({ heroUrl: 'https://cdn.test/stale.jpg' }))
		expect(result.current.loading).toBe('hero'); expect(apply).not.toHaveBeenCalled(); expect(mocks.preload).not.toHaveBeenCalled()
		await act(async () => fresh.resolve(candidate))
		await waitFor(() => expect(apply).toHaveBeenCalledWith('hero', candidate.heroUrl))
		expect(result.current.loading).toBeNull()
	})
	it('ignores a candidate if a newer manual draft value appeared while the request was pending', async () => {
		const response = deferred<SteamArtwork>(), apply = vi.fn()
		mocks.assets.mockReturnValue(response.promise)
		const { result, rerender } = renderHook(value => useSteamArtworkDraft(value, apply), { initialProps: draft })
		act(() => { void result.current.refresh('hero') })
		rerender({ ...draft, hero: 'https://cdn.test/manual-newer.jpg' })
		await act(async () => response.resolve(candidate))
		expect(apply).not.toHaveBeenCalled(); expect(mocks.preload).not.toHaveBeenCalled()
		expect(result.current.loading).toBeNull()
	})
	it('also protects the draft if it changes during image decoding', async () => {
		const validation = deferred<boolean>(), apply = vi.fn()
		mocks.preload.mockReturnValue(validation.promise)
		const { result, rerender } = renderHook(value => useSteamArtworkDraft(value, apply), { initialProps: draft })
		act(() => { void result.current.refresh('hero') })
		await waitFor(() => expect(mocks.preload).toHaveBeenCalledOnce())
		rerender({ ...draft, steamAppId: '200' })
		expect((mocks.preload.mock.calls[0][1] as AbortSignal).aborted).toBe(true)
		await act(async () => validation.resolve(true))
		expect(apply).not.toHaveBeenCalled()
	})
	it('guards against same-tick duplicate or different-role requests before React rerenders', async () => {
		const response = deferred<SteamArtwork>()
		mocks.assets.mockReturnValue(response.promise)
		const { result } = renderHook(() => useSteamArtworkDraft(draft, vi.fn()))
		act(() => { void result.current.refresh('hero'); void result.current.refresh('hero'); void result.current.refresh('cover') })
		expect(mocks.assets).toHaveBeenCalledOnce()
		await act(async () => response.resolve(candidate))
	})
	it('allows explicit recovery after a failed lookup and clears its previous error', async () => {
		mocks.assets.mockRejectedValueOnce(new Error('offline'))
		const apply = vi.fn(), { result } = renderHook(() => useSteamArtworkDraft(draft, apply))
		await act(async () => result.current.refresh('hero'))
		expect(result.current.failed).toBe('hero')
		await act(async () => result.current.refresh('hero'))
		expect(result.current.failed).toBeNull(); expect(apply).toHaveBeenCalledWith('hero', candidate.heroUrl)
	})
	it('aborts on unmount and never applies a late candidate to a closed editor', async () => {
		const response = deferred<SteamArtwork>(), apply = vi.fn()
		mocks.assets.mockReturnValue(response.promise)
		const { result, unmount } = renderHook(() => useSteamArtworkDraft(draft, apply))
		act(() => { void result.current.refresh('hero') })
		const signal = mocks.assets.mock.calls[0][1] as AbortSignal
		unmount(); expect(signal.aborted).toBe(true)
		await act(async () => response.resolve(candidate))
		expect(apply).not.toHaveBeenCalled(); expect(mocks.preload).not.toHaveBeenCalled()
	})
})
