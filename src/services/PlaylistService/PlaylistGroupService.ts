import { customFetch } from '@/utils/customFetch'
import { environment } from '@/environments'
import type { PlaylistGroup } from '@/models/api/Playlist'

const base = () => environment.apiRoutes.playlists.base
const options = { baseURL: environment.baseUrl }
export const getPlaylistGroups = () => customFetch<PlaylistGroup[]>(`${base()}/groups`, { ...options, method: 'GET' })
export const savePlaylistGroup = (name: string, id?: number) => customFetch<PlaylistGroup>(`${base()}/groups${id ? `/${id}` : ''}`, { ...options, method: id ? 'PUT' : 'POST', body: { name } })
export const deletePlaylistGroup = (id: number) => customFetch<void>(`${base()}/groups/${id}`, { ...options, method: 'DELETE' })
export const movePlaylistToGroup = (id: number, groupId: number | null, orderedIds: number[] = []) => customFetch<void>(`${base()}/${id}/move`, { ...options, method: 'POST', body: { groupId, orderedIds } })
