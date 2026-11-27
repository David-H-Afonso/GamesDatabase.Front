import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Playlist, PlaylistSummary } from '@/models/api/Playlist'
import { getCollectionFocus, getPlaylistShelves } from './PlaylistCollectionService'

const mocks = vi.hoisted(() => ({ lists: vi.fn(), detail: vi.fn() }))
vi.mock('@/services/PlaylistService/PlaylistService', () => ({ getPlaylists: mocks.lists, getPlaylistById: mocks.detail }))
const summary = (id: number, name = `List ${id}`, automatic = false) => ({ id, name, isAutomatic: automatic, gameCount: 0, sortOrder: id }) as PlaylistSummary
const detail = (item: PlaylistSummary): Playlist => ({ ...item, createdAt: '2026-11-25', items: [] })

describe('collection playlist reads', () => {
	beforeEach(() => { vi.clearAllMocks(); mocks.detail.mockImplementation(async id => detail(summary(id))) })
	it('reads the exact selected manual Focus without creating or syncing anything', async () => {
		mocks.lists.mockResolvedValue([summary(1, 'Focus'), summary(2, 'User choice')])
		const signal = new AbortController().signal
		expect((await getCollectionFocus(2, signal))?.id).toBe(2)
		expect(mocks.detail).toHaveBeenCalledExactlyOnceWith(2, signal)
	})
	it('returns all sixteen shelves including resolved automatic lists while Focus remains manual-only', async () => {
		const lists = Array.from({ length: 16 }, (_, index) => summary(index + 1, `List ${index + 1}`, index % 2 === 0)); mocks.lists.mockResolvedValue(lists)
		mocks.detail.mockImplementation(async id => detail(lists.find(list => list.id === id)!))
		const shelves = await getPlaylistShelves(); expect(shelves).toHaveLength(16); expect(shelves.filter(shelf => shelf.playlist.isAutomatic)).toHaveLength(8)
		mocks.lists.mockResolvedValue([summary(1, 'Focus', true)]); expect(await getCollectionFocus(1)).toBeNull()
	})
	it('returns no Focus instead of creating a list or accepting an automatic Focus', async () => {
		mocks.lists.mockResolvedValue([summary(1, 'Focus', true)])
		expect(await getCollectionFocus(null)).toBeNull(); expect(mocks.detail).not.toHaveBeenCalled()
	})
	it('preserves list order and includes empty manual and automatic shelves', async () => {
		const lists = [summary(5), summary(1, 'Automatic', true), summary(2)]
		mocks.lists.mockResolvedValue(lists); mocks.detail.mockImplementation(async id => detail(lists.find(list => list.id === id)!))
		const result = await getPlaylistShelves()
		expect(result.map(item => item.playlist.id)).toEqual([5, 1, 2]); expect(result.every(item => item.state === 'ready' && item.data?.items.length === 0)).toBe(true)
		expect(result[1].playlist.isAutomatic).toBe(true); expect(mocks.detail).toHaveBeenCalledWith(1, undefined)
	})
	it('retains a failed shelf alongside healthy shelves instead of hiding it or failing the entire page', async () => {
		mocks.lists.mockResolvedValue([summary(1), summary(2)])
		mocks.detail.mockImplementation(async id => { if (id === 1) throw new Error('offline'); return detail(summary(id)) })
		expect((await getPlaylistShelves()).map(item => [item.playlist.id, item.state])).toEqual([[1, 'error'], [2, 'ready']])
	})
	it('bounds simultaneous detail reads to four and preserves input order', async () => {
		mocks.lists.mockResolvedValue(Array.from({ length: 9 }, (_, index) => summary(index + 1)))
		let active = 0, maximum = 0
		mocks.detail.mockImplementation(async id => { active++; maximum = Math.max(maximum, active); await Promise.resolve(); active--; return detail(summary(id)) })
		const result = await getPlaylistShelves()
		expect(maximum).toBeLessThanOrEqual(4); expect(result.map(item => item.playlist.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
	})
	it('cancels before dispatching more reads and does not turn cancellation into an empty shelf', async () => {
		const controller = new AbortController(); controller.abort()
		await expect(getPlaylistShelves(controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
		expect(mocks.lists).not.toHaveBeenCalled()
	})
	it('rejects a late Focus response after cancellation even if a mocked provider ignores the signal', async () => {
		const controller = new AbortController(); mocks.lists.mockResolvedValue([summary(1, 'Focus')])
		mocks.detail.mockImplementation(async () => { controller.abort(); return detail(summary(1)) })
		await expect(getCollectionFocus(null, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
	})
	it('does not render a mismatched/automatic detail as the requested manual list', async () => {
		mocks.lists.mockResolvedValue([summary(1)]); mocks.detail.mockResolvedValue(detail(summary(99, 'Wrong list', true)))
		expect((await getPlaylistShelves())[0].state).toBe('error')
	})
})
