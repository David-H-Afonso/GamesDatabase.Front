import { createAsyncThunk } from '@reduxjs/toolkit'
import { addPlaylistItem, createPlaylist, deletePlaylist, exportPlaylist, getPlaylistById, getPlaylists, importPlaylist, removePlaylistItem, reorderPlaylistItems, reorderPlaylists, updatePlaylist } from '@/services'
import type { PlaylistCreateDto, PlaylistTransfer, PlaylistUpdateDto } from '@/models/api/Playlist'

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Playlist request failed')

export const fetchPlaylists = createAsyncThunk('playlists/fetch', async (_, { rejectWithValue }) => {
		try { return await getPlaylists() } catch (error) { return rejectWithValue(errorMessage(error)) }
})
export const fetchPlaylistById = createAsyncThunk('playlists/fetchById', async (id: number, { rejectWithValue }) => {
		try { return await getPlaylistById(id) } catch (error) { return rejectWithValue(errorMessage(error)) }
})
export const createPlaylistThunk = createAsyncThunk('playlists/create', async (data: PlaylistCreateDto, { rejectWithValue }) => {
		try { return await createPlaylist(data) } catch (error) { return rejectWithValue(errorMessage(error)) }
})
export const updatePlaylistThunk = createAsyncThunk('playlists/update', async ({ id, data }: { id: number; data: PlaylistUpdateDto }, { rejectWithValue }) => {
		try { return await updatePlaylist(id, data) } catch (error) { return rejectWithValue(errorMessage(error)) }
})
export const deletePlaylistThunk = createAsyncThunk('playlists/delete', async (id: number, { rejectWithValue }) => {
		try { await deletePlaylist(id); return id } catch (error) { return rejectWithValue(errorMessage(error)) }
})
export const reorderPlaylistsThunk = createAsyncThunk('playlists/reorder', async (orderedIds: number[], { rejectWithValue }) => {
		try { await reorderPlaylists(orderedIds); return orderedIds } catch (error) { return rejectWithValue(errorMessage(error)) }
})
export const addPlaylistItemThunk = createAsyncThunk('playlists/addItem', async ({ id, gameId }: { id: number; gameId: number }, { rejectWithValue }) => {
		try { return await addPlaylistItem(id, gameId) } catch (error) { return rejectWithValue(errorMessage(error)) }
})
export const removePlaylistItemThunk = createAsyncThunk('playlists/removeItem', async ({ id, itemId }: { id: number; itemId: number }, { rejectWithValue }) => {
		try { return await removePlaylistItem(id, itemId) } catch (error) { return rejectWithValue(errorMessage(error)) }
})
export const reorderPlaylistItemsThunk = createAsyncThunk('playlists/reorderItems', async ({ id, orderedIds }: { id: number; orderedIds: number[] }, { rejectWithValue }) => {
		try { await reorderPlaylistItems(id, orderedIds); return orderedIds } catch (error) { return rejectWithValue(errorMessage(error)) }
})
export const exportPlaylistThunk = createAsyncThunk('playlists/export', async ({ id, reference }: { id: number; reference: 'id' | 'name' }, { rejectWithValue }) => {
		try { return await exportPlaylist(id, reference) } catch (error) { return rejectWithValue(errorMessage(error)) }
})
export const importPlaylistThunk = createAsyncThunk('playlists/import', async (data: PlaylistTransfer, { rejectWithValue }) => {
		try { return await importPlaylist(data) } catch (error) { return rejectWithValue(errorMessage(error)) }
})
