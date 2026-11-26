import { customFetch } from '@/utils/customFetch'
import { environment } from '@/environments'
import type { Playlist, PlaylistCreateDto, PlaylistSummary, PlaylistUpdateDto, PlaylistTransfer, PlaylistRules, PlaylistPreview } from '@/models/api/Playlist'
import { collectionChanged } from '@/services/CollectionService/collectionEvents'

const BASE = environment.apiRoutes.playlists

export const getPlaylists = (signal?: AbortSignal) => customFetch<PlaylistSummary[]>(BASE.base, { method: 'GET', baseURL: environment.baseUrl, ...(signal ? { signal } : {}) })
export const getPlaylistById = (id: number, signal?: AbortSignal) => customFetch<Playlist>(BASE.byId(id), { method: 'GET', baseURL: environment.baseUrl, ...(signal ? { signal } : {}) })
export const createPlaylist = (data: PlaylistCreateDto) => customFetch<Playlist>(BASE.create, { method: 'POST', body: data, baseURL: environment.baseUrl }).then(collectionChanged)
export const updatePlaylist = (id: number, data: PlaylistUpdateDto) => customFetch<Playlist>(BASE.update(id), { method: 'PUT', body: data, baseURL: environment.baseUrl }).then(collectionChanged)
export const deletePlaylist = (id: number) => customFetch<void>(BASE.delete(id), { method: 'DELETE', baseURL: environment.baseUrl }).then(collectionChanged)
export const reorderPlaylists = (orderedIds: number[]) => customFetch<void>(BASE.reorder, { method: 'POST', body: { orderedIds }, baseURL: environment.baseUrl }).then(collectionChanged)
export const addPlaylistItem = (id: number, gameId: number, statusId?: number) => customFetch<Playlist>(BASE.items(id), { method: 'POST', body: { gameId, ...(statusId !== undefined ? { statusId } : {}) }, baseURL: environment.baseUrl }).then(collectionChanged)
export const removePlaylistItem = (id: number, itemId: number) => customFetch<Playlist>(BASE.removeItem(id, itemId), { method: 'DELETE', baseURL: environment.baseUrl }).then(collectionChanged)
export const reorderPlaylistItems = (id: number, orderedIds: number[]) => customFetch<void>(BASE.reorderItems(id), { method: 'POST', body: { orderedIds }, baseURL: environment.baseUrl }).then(collectionChanged)
export const exportPlaylist = (id: number, reference: 'id' | 'name') => customFetch<PlaylistTransfer>(BASE.export(id, reference), { method: 'GET', baseURL: environment.baseUrl })
export const importPlaylist = (data: PlaylistTransfer) => customFetch<Playlist>(BASE.import, { method: 'POST', body: data, baseURL: environment.baseUrl }).then(collectionChanged)
export const previewPlaylist = (rules: PlaylistRules, maxLength: number | null = null, previewCount = 5, signal?: AbortSignal) => customFetch<PlaylistPreview>(BASE.preview, { method: 'POST', body: { rules, maxLength, previewCount }, baseURL: environment.baseUrl, signal })
