import { customFetch } from '@/utils/customFetch'
import { environment } from '@/environments'
import type { Playlist, PlaylistCreateDto, PlaylistSummary, PlaylistUpdateDto } from '@/models/api/Playlist'

const BASE = environment.apiRoutes.playlists

export const getPlaylists = () => customFetch<PlaylistSummary[]>(BASE.base, { method: 'GET', baseURL: environment.baseUrl })
export const getPlaylistById = (id: number) => customFetch<Playlist>(BASE.byId(id), { method: 'GET', baseURL: environment.baseUrl })
export const createPlaylist = (data: PlaylistCreateDto) => customFetch<Playlist>(BASE.create, { method: 'POST', body: data, baseURL: environment.baseUrl })
export const updatePlaylist = (id: number, data: PlaylistUpdateDto) => customFetch<Playlist>(BASE.update(id), { method: 'PUT', body: data, baseURL: environment.baseUrl })
export const deletePlaylist = (id: number) => customFetch<void>(BASE.delete(id), { method: 'DELETE', baseURL: environment.baseUrl })
export const reorderPlaylists = (orderedIds: number[]) => customFetch<void>(BASE.reorder, { method: 'POST', body: { orderedIds }, baseURL: environment.baseUrl })
export const addPlaylistItem = (id: number, gameId: number) => customFetch<Playlist>(BASE.items(id), { method: 'POST', body: { gameId }, baseURL: environment.baseUrl })
export const removePlaylistItem = (id: number, itemId: number) => customFetch<Playlist>(BASE.removeItem(id, itemId), { method: 'DELETE', baseURL: environment.baseUrl })
export const reorderPlaylistItems = (id: number, orderedIds: number[]) => customFetch<void>(BASE.reorderItems(id), { method: 'POST', body: { orderedIds }, baseURL: environment.baseUrl })
