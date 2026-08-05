import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Playlist } from '@/models/api/Playlist'
import type { PlaylistState } from '@/models/store/PlaylistState'
import { addPlaylistItemThunk, createPlaylistThunk, deletePlaylistThunk, fetchPlaylistById, fetchPlaylists, importPlaylistThunk, removePlaylistItemThunk, reorderPlaylistItemsThunk, reorderPlaylistsThunk, updatePlaylistThunk } from './thunk'

const initialState: PlaylistState = { playlists: [], currentPlaylist: null, loading: false, error: null }

const playlistSlice = createSlice({
	name: 'playlists',
	initialState,
	reducers: {
		setCurrentPlaylist: (state, action: PayloadAction<Playlist | null>) => { state.currentPlaylist = action.payload },
		setPlaylists: (state, action: PayloadAction<PlaylistState['playlists']>) => { state.playlists = action.payload },
		resetState: () => initialState,
	},
	extraReducers: (builder) => {
		builder.addCase(fetchPlaylists.pending, (state) => { state.loading = true; state.error = null })
			.addCase(fetchPlaylists.fulfilled, (state, action) => { state.loading = false; state.playlists = action.payload })
			.addCase(fetchPlaylists.rejected, (state, action) => { state.loading = false; state.error = action.payload as string })
			.addCase(fetchPlaylistById.pending, (state) => { state.loading = true; state.error = null })
			.addCase(fetchPlaylistById.fulfilled, (state, action) => { state.loading = false; state.currentPlaylist = action.payload })
			.addCase(fetchPlaylistById.rejected, (state, action) => { state.loading = false; state.error = action.payload as string })
			.addCase(createPlaylistThunk.fulfilled, (state, action) => { state.playlists.push(action.payload) })
			.addCase(updatePlaylistThunk.fulfilled, (state, action) => {
				const item = action.payload
				const index = state.playlists.findIndex(playlist => playlist.id === item.id)
				if (index !== -1) state.playlists[index] = item
				if (state.currentPlaylist?.id === item.id) state.currentPlaylist = { ...state.currentPlaylist, ...item }
			})
			.addCase(deletePlaylistThunk.fulfilled, (state, action) => { state.playlists = state.playlists.filter(item => item.id !== action.payload); if (state.currentPlaylist?.id === action.payload) state.currentPlaylist = null })
			.addCase(reorderPlaylistsThunk.fulfilled, (state, action) => { state.playlists = action.payload.map(id => state.playlists.find(item => item.id === id)!).filter(Boolean) })
			.addCase(addPlaylistItemThunk.fulfilled, (state, action) => { state.currentPlaylist = action.payload })
			.addCase(removePlaylistItemThunk.fulfilled, (state, action) => { state.currentPlaylist = action.payload })
			.addCase(reorderPlaylistItemsThunk.fulfilled, (state, action) => {
				if (!state.currentPlaylist) return
				state.currentPlaylist.items = action.payload.map(id => state.currentPlaylist!.items.find(item => item.id === id)!).filter(Boolean)
			})
			.addCase(importPlaylistThunk.fulfilled, (state, action) => { state.playlists.push(action.payload); state.currentPlaylist = action.payload })
			.addMatcher(action => action.type.startsWith('playlists/') && action.type.endsWith('/rejected'), (state, action: any) => { state.loading = false; state.error = action.payload as string })
	},
})

export const { setCurrentPlaylist, setPlaylists, resetState } = playlistSlice.actions
export default playlistSlice.reducer
