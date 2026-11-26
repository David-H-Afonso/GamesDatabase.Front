import { describe, expect, it } from 'vitest'
import reducer from './playlistSlice'
import { addPlaylistItemThunk, fetchPlaylistById, fetchPlaylists, importPlaylistThunk, removePlaylistItemThunk, reorderPlaylistItemsThunk } from './thunk'
import type { Playlist } from '@/models/api/Playlist'

const list = (id: number): Playlist => ({ id, name: `List ${id}`, isAutomatic: false, maxLength: null, sortOrder: 0, gameCount: 0, createdAt: '', updatedAt: '', items: [] })

describe('independent playlist responses', () => {
	it.each(['summary', 'detail'] as const)('keeps the rail and detail busy until both reads finish (%s first)', first => {
		let state = reducer(undefined, fetchPlaylists.pending('summary', undefined))
		state = reducer(state, fetchPlaylistById.pending('detail', 1))
		const summary = fetchPlaylists.fulfilled([list(1)], 'summary', undefined), detail = fetchPlaylistById.fulfilled(list(1), 'detail', 1)
		state = reducer(state, first === 'summary' ? summary : detail)
		expect(state.loading).toBe(true)
		state = reducer(state, first === 'summary' ? detail : summary)
		expect(state.loading).toBe(false); expect(state.playlists).toHaveLength(1); expect(state.currentPlaylist?.id).toBe(1)
	})
	it('ignores a stale summary response without ending a newer request', () => {
		let state = reducer(undefined, fetchPlaylists.pending('old', undefined))
		state = reducer(state, fetchPlaylists.pending('new', undefined))
		state = reducer(state, fetchPlaylists.fulfilled([list(1)], 'old', undefined))
		expect(state.loading).toBe(true); expect(state.playlists).toEqual([])
		state = reducer(state, fetchPlaylists.fulfilled([list(2)], 'new', undefined))
		expect(state.loading).toBe(false); expect(state.playlists[0].id).toBe(2)
	})
	it('does not replace a newly selected list with an older detail response', () => {
		let state = reducer(undefined, fetchPlaylistById.pending('old', 1))
		state = reducer(state, fetchPlaylistById.pending('new', 2))
		state = reducer(state, fetchPlaylistById.fulfilled(list(2), 'new', 2))
		state = reducer(state, fetchPlaylistById.fulfilled(list(1), 'old', 1))
		expect(state.currentPlaylist?.id).toBe(2)
	})
	it('does not let add/remove responses overwrite a different open playlist', () => {
		const state = { ...reducer(undefined, { type: '@@test' }), currentPlaylist: list(2) }
		const added = reducer(state, addPlaylistItemThunk.fulfilled(list(1), 'add', { id: 1, gameId: 99 }))
		const removed = reducer(added, removePlaylistItemThunk.fulfilled(list(1), 'remove', { id: 1, itemId: 100 }))
		expect(removed.currentPlaylist?.id).toBe(2)
	})
	it('does not apply an outgoing list reorder to another list or silently select an imported list', () => {
		const state = { ...reducer(undefined, { type: '@@test' }), currentPlaylist: list(2), reordering: true }
		const reordered = reducer(state, reorderPlaylistItemsThunk.fulfilled([3, 4], 'reorder', { id: 1, orderedIds: [3, 4] }))
		expect(reordered.currentPlaylist).toEqual(list(2)); expect(reordered.reordering).toBe(false)
		const imported = reducer(reordered, importPlaylistThunk.fulfilled(list(3), 'import', {} as never))
		expect(imported.currentPlaylist?.id).toBe(2); expect(imported.playlists.map(value => value.id)).toEqual([3])
	})
})
