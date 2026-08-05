import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { addPlaylistItemThunk, createPlaylistThunk, deletePlaylistThunk, exportPlaylistThunk, fetchPlaylistById, fetchPlaylists, importPlaylistThunk, removePlaylistItemThunk, reorderPlaylistItemsThunk, reorderPlaylistsThunk, selectCurrentPlaylist, selectPlaylists, selectPlaylistsError, selectPlaylistsLoading, updatePlaylistThunk } from '@/store/features/playlists'
import { dispatchAndUnwrapAsync } from '@/utils'
import type { PlaylistCreateDto, PlaylistTransfer, PlaylistUpdateDto } from '@/models/api/Playlist'

export const usePlaylists = () => {
	const dispatch = useAppDispatch()
	const playlists = useAppSelector(selectPlaylists)
	const currentPlaylist = useAppSelector(selectCurrentPlaylist)
	const loading = useAppSelector(selectPlaylistsLoading)
	const error = useAppSelector(selectPlaylistsError)
	return {
		playlists, currentPlaylist, loading, error,
		fetchAll: useCallback(() => dispatchAndUnwrapAsync(dispatch, fetchPlaylists()), [dispatch]),
		fetchById: useCallback((id: number) => dispatchAndUnwrapAsync(dispatch, fetchPlaylistById(id)), [dispatch]),
		create: useCallback((data: PlaylistCreateDto) => dispatchAndUnwrapAsync(dispatch, createPlaylistThunk(data)), [dispatch]),
		update: useCallback((id: number, data: PlaylistUpdateDto) => dispatchAndUnwrapAsync(dispatch, updatePlaylistThunk({ id, data })), [dispatch]),
		remove: useCallback((id: number) => dispatchAndUnwrapAsync(dispatch, deletePlaylistThunk(id)), [dispatch]),
		reorder: useCallback((orderedIds: number[]) => dispatchAndUnwrapAsync(dispatch, reorderPlaylistsThunk(orderedIds)), [dispatch]),
		addItem: useCallback((id: number, gameId: number) => dispatchAndUnwrapAsync(dispatch, addPlaylistItemThunk({ id, gameId })), [dispatch]),
		removeItem: useCallback((id: number, itemId: number) => dispatchAndUnwrapAsync(dispatch, removePlaylistItemThunk({ id, itemId })), [dispatch]),
		reorderItems: useCallback((id: number, orderedIds: number[]) => dispatchAndUnwrapAsync(dispatch, reorderPlaylistItemsThunk({ id, orderedIds })), [dispatch]),
		exportPlaylist: useCallback((id: number, reference: 'id' | 'name') => dispatchAndUnwrapAsync(dispatch, exportPlaylistThunk({ id, reference })), [dispatch]),
		importPlaylist: useCallback((data: PlaylistTransfer) => dispatchAndUnwrapAsync(dispatch, importPlaylistThunk(data)), [dispatch]),
	}
}
