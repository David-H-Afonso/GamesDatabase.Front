import type { PlaylistSummary } from '@/models/api/Playlist'

export const FOCUS_PLAYLIST_NAME = 'Focus'
export const FOCUS_GAME_LIMIT = 4
export const getFocusStorageKey = (userId?: number) => `gdb.focus-playlist.${userId ?? 'guest'}`

/** Read only the signed-in user's existing Focus choice; never change a preference on read. */
export const readFocusPlaylistId = (userId?: number): number | null => {
	try {
		const id = Number(window.localStorage.getItem(getFocusStorageKey(userId)))
		return Number.isInteger(id) && id > 0 ? id : null
	} catch { return null }
}

export const resolveFocusPlaylist = (playlists: PlaylistSummary[], savedId: number | null) => {
	const manual = playlists.filter(playlist => !playlist.isAutomatic)
	return manual.find(playlist => playlist.id === savedId)
		?? manual.find(playlist => playlist.name.trim().toLocaleLowerCase() === FOCUS_PLAYLIST_NAME.toLocaleLowerCase())
		?? null
}
