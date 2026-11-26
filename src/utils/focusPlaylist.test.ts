import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PlaylistSummary } from '@/models/api/Playlist'
import { getFocusStorageKey, readFocusPlaylistId, resolveFocusPlaylist } from './focusPlaylist'

const lists = [{ id: 1, name: 'Other list', isAutomatic: false }, { id: 2, name: ' Focus ', isAutomatic: false }, { id: 3, name: 'Focus', isAutomatic: true }] as PlaylistSummary[]
describe('shared Focus selection', () => {
	beforeEach(() => localStorage.clear())
	it('preserves an existing user-selected manual playlist rather than guessing by its name', () => expect(resolveFocusPlaylist(lists, 1)?.id).toBe(1))
	it('falls back to the named manual Focus when the selected ID is missing or automatic', () => {
		expect(resolveFocusPlaylist(lists, 99)?.id).toBe(2)
		expect(resolveFocusPlaylist(lists, 3)?.id).toBe(2)
	})
	it('does not choose an automatic list or invent one when no manual Focus exists', () => expect(resolveFocusPlaylist([lists[2]], null)).toBeNull())
	it('reads only the current user namespace and does not write a new preference', () => {
		localStorage.setItem(getFocusStorageKey(1), '1')
		const set = vi.spyOn(Storage.prototype, 'setItem')
		expect(readFocusPlaylistId(1)).toBe(1); expect(readFocusPlaylistId(2)).toBeNull(); expect(set).not.toHaveBeenCalled()
		set.mockRestore()
	})
	it.each(['0', '-1', 'NaN', '1.5'])('rejects invalid stored ID %s', value => { localStorage.setItem(getFocusStorageKey(1), value); expect(readFocusPlaylistId(1)).toBeNull() })
})
