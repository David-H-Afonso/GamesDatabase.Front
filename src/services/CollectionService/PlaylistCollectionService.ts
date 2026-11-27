import type { Playlist, PlaylistSummary } from '@/models/api/Playlist'
import { getPlaylists, getPlaylistById } from '@/services/PlaylistService/PlaylistService'
import { resolveFocusPlaylist } from '@/utils/focusPlaylist'

export interface ManualPlaylistShelf {
	playlist: PlaylistSummary
	data: Playlist | null
	state: 'ready' | 'error'
}

export const playlistSummaries = (value: PlaylistSummary[]): PlaylistSummary[] => {
	if (!Array.isArray(value) || value.some(item => !item || !Number.isSafeInteger(item.id) || item.id <= 0 || typeof item.name !== 'string' || typeof item.isAutomatic !== 'boolean')) throw new Error('Invalid playlist summary response')
	return value
}

const ensureActive = (signal?: AbortSignal) => { if (signal?.aborted) throw new DOMException('Request cancelled', 'AbortError') }

export const manualPlaylist = (value: Playlist, expectedId?: number): Playlist => {
	if (!value || !Number.isSafeInteger(value.id) || value.id <= 0 || (expectedId != null && value.id !== expectedId) || value.isAutomatic !== false || !Array.isArray(value.items)
		|| value.items.some(item => !item || !Number.isSafeInteger(item.id) || item.id <= 0 || !item.game || item.game.id !== item.gameId || typeof item.game.name !== 'string')) throw new Error('Invalid manual playlist response')
	return value
}

/** Same selection as the Focus screen, without mounting its player-data sync effect. */
export const getCollectionFocus = async (savedId: number | null, signal?: AbortSignal): Promise<Playlist | null> => {
	ensureActive(signal)
	const selected = resolveFocusPlaylist(playlistSummaries(await getPlaylists(signal)), savedId)
	ensureActive(signal)
	if (!selected) return null
	const result = await getPlaylistById(selected.id, signal)
	ensureActive(signal)
	return manualPlaylist(result, selected.id)
}

/** Real manual playlists, including all items, with bounded reads and per-shelf recovery. */
export const getManualPlaylistShelves = async (signal?: AbortSignal): Promise<ManualPlaylistShelf[]> => {
	ensureActive(signal)
	const manual = playlistSummaries(await getPlaylists(signal)).filter(playlist => !playlist.isAutomatic)
	ensureActive(signal)
	const result = new Array<ManualPlaylistShelf>(manual.length)
	let next = 0
	const worker = async () => {
		while (next < manual.length) {
			const index = next++, playlist = manual[index]
			if (signal?.aborted) throw new DOMException('Request cancelled', 'AbortError')
			try {
				const data = manualPlaylist(await getPlaylistById(playlist.id, signal), playlist.id)
				if (signal?.aborted) throw new DOMException('Request cancelled', 'AbortError')
				result[index] = { playlist: data, data, state: 'ready' }
			} catch (error) {
				if (signal?.aborted) throw error
				result[index] = { playlist, data: null, state: 'error' }
			}
		}
	}
	await Promise.all(Array.from({ length: Math.min(4, manual.length) }, worker))
	return result
}
