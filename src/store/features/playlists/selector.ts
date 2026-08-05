import type { RootState } from '@/store'
export const selectPlaylists = (state: RootState) => state.playlists.playlists
export const selectCurrentPlaylist = (state: RootState) => state.playlists.currentPlaylist
export const selectPlaylistsLoading = (state: RootState) => state.playlists.loading
export const selectPlaylistsError = (state: RootState) => state.playlists.error
