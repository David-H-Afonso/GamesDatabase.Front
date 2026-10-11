import type { Playlist, PlaylistSummary } from '@/models/api/Playlist'

export interface PlaylistState {
	playlists: PlaylistSummary[]
	currentPlaylist: Playlist | null
	currentPlaylistRequestId?: string
	loading: boolean
	error: string | null
	reordering: boolean
}
