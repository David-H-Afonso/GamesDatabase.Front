import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { createGame } from '@/test/factories'
import type { Playlist } from '@/models/api/Playlist'
import i18n from '@/i18n'
import FocusMode from './FocusMode'
import { refreshCurrentPlaylist, setCurrentPlaylist } from '@/store/features/playlists/playlistSlice'
import { fetchPlaylists } from '@/store/features/playlists/thunk'

const calls = vi.hoisted(() => ({ lists: vi.fn(), detail: vi.fn(), sync: vi.fn(), create: vi.fn(), remove: vi.fn() }))
vi.mock('@/services/PlaylistService/PlaylistService', async original => ({ ...await original<typeof import('@/services/PlaylistService/PlaylistService')>(), getPlaylists: calls.lists, getPlaylistById: calls.detail, createPlaylist: calls.create, removePlaylistItem: calls.remove }))
vi.mock('@/services/SteamService/SteamService', () => ({ steamService: { syncGame: calls.sync } }))

const auth = { user: { id: 1, username: 'Focus fixture', role: 'Standard' }, token: 'fixture', refreshToken: null, isAuthenticated: true, loading: false, error: null } as const
const list = (id: number, name: string, title: string, gameId: number, steamAppId?: number): Playlist => ({ id, name, isAutomatic: false, sortOrder: id, maxLength: 4, gameCount: 1, createdAt: '', updatedAt: '', items: [{ id: id * 10, gameId, position: 0, game: createGame({ id: gameId, name: title, steamAppId }) }] })
const focus = list(22, 'Focus', 'Owned Focus game', 201), metro = list(11, 'Metro playlist', 'Metro Exodus — unrelated route', 80)
const deferred = <T,>() => { let resolve!: (value: T) => void; return { promise: new Promise<T>(yes => { resolve = yes }), resolve: (value: T) => resolve(value) } }

describe('Focus with real Redux ownership/request boundaries', () => {
	beforeEach(async () => {
		Object.values(calls).forEach(call => call.mockReset()); await i18n.changeLanguage('en'); localStorage.clear()
		calls.lists.mockResolvedValue([metro, focus]); calls.detail.mockResolvedValue(focus); calls.sync.mockResolvedValue({ success: true })
	})
	it('does not render a route-unrelated currentPlaylist while resolving the named Focus', async () => {
		const request = deferred<Playlist>(); calls.detail.mockReturnValueOnce(request.promise)
		const view = renderWithProviders(<FocusMode />, { preloadedState: { auth, playlists: { playlists: [metro, focus], currentPlaylist: metro, loading: false, error: null, reordering: false } }, route: '/focus' })
		await waitFor(() => expect(calls.detail).toHaveBeenCalledWith(22)); expect(screen.queryByRole('heading', { name: metro.items[0].game.name })).not.toBeInTheDocument()
		await act(async () => { request.resolve(focus) }); expect(await screen.findByRole('heading', { name: 'Owned Focus game' })).toBeInTheDocument()
		expect(view.store.getState().playlists.currentPlaylist?.id).toBe(22); expect(localStorage.getItem('gdb.focus-playlist.1')).toBeNull(); expect(calls.create).not.toHaveBeenCalled(); expect(calls.sync).not.toHaveBeenCalled()
	})
	it('honors an explicit owned manual choice instead of silently replacing the preference by name', async () => {
		localStorage.setItem('gdb.focus-playlist.1', '11'); calls.detail.mockResolvedValue(metro)
		renderWithProviders(<FocusMode />, { preloadedState: { auth } }); expect(await screen.findByRole('heading', { name: metro.items[0].game.name })).toBeInTheDocument()
		expect(calls.detail).toHaveBeenCalledExactlyOnceWith(11); expect(localStorage.getItem('gdb.focus-playlist.1')).toBe('11')
	})
	it('falls back from a stale/foreign saved ID without requesting it or rewriting its preference', async () => {
		localStorage.setItem('gdb.focus-playlist.1', '99'); renderWithProviders(<FocusMode />, { preloadedState: { auth } })
		await screen.findByRole('heading', { name: 'Owned Focus game' }); expect(calls.detail).toHaveBeenCalledExactlyOnceWith(22); expect(localStorage.getItem('gdb.focus-playlist.1')).toBe('99')
	})
	it('cannot replace the new account Focus with an older account detail response', async () => {
		const first = deferred<Playlist>(), second = list(33, 'Focus', 'Second account Focus game', 301)
		calls.lists.mockResolvedValueOnce([focus]).mockResolvedValueOnce([second]); calls.detail.mockImplementation((id: number) => id === 22 ? first.promise : Promise.resolve(second))
		const { store } = renderWithProviders(<FocusMode />, { preloadedState: { auth } }); await waitFor(() => expect(calls.detail).toHaveBeenCalledWith(22))
		act(() => { store.dispatch({ type: 'auth/login/fulfilled', payload: { userId: 2, username: 'Second fixture', role: 'Standard', token: 'other-fixture', refreshToken: null } }) })
		await screen.findByRole('heading', { name: 'Second account Focus game' }); await act(async () => { first.resolve(focus) })
		expect(screen.queryByRole('heading', { name: 'Owned Focus game' })).not.toBeInTheDocument(); expect(store.getState().playlists.currentPlaylist?.id).toBe(33); expect(calls.sync).not.toHaveBeenCalled()
	})
	it('keeps a failed detail read retryable and never presents it as an empty list to create', async () => {
		calls.detail.mockRejectedValueOnce(new Error('Synthetic detail outage')); renderWithProviders(<FocusMode />, { preloadedState: { auth } })
		const retry = await screen.findByRole('button', { name: 'Try again' }); expect(screen.queryByRole('button', { name: 'Create my Focus list' })).not.toBeInTheDocument()
		await userEvent.click(retry); await screen.findByRole('heading', { name: 'Owned Focus game' }); expect(calls.detail).toHaveBeenCalledTimes(2); expect(calls.create).not.toHaveBeenCalled(); expect(localStorage.getItem('gdb.focus-playlist.1')).toBeNull()
	})
	it('waits for the fresh owned detail before syncing, not the matching but stale shared cache', async () => {
		const old = list(22, 'Focus', 'Cached game no longer in Focus', 190, 100), fresh = list(22, 'Focus', 'Fresh linked Focus game', 202, 570), request = deferred<Playlist>()
		calls.lists.mockResolvedValue([fresh]); calls.detail.mockReturnValueOnce(request.promise).mockResolvedValue(fresh)
		renderWithProviders(<FocusMode />, { preloadedState: { auth, playlists: { playlists: [fresh], currentPlaylist: old, loading: false, error: null, reordering: false } } })
		await waitFor(() => expect(calls.detail).toHaveBeenCalledOnce()); expect(calls.sync).not.toHaveBeenCalled(); expect(screen.queryByRole('heading', { name: 'Cached game no longer in Focus' })).not.toBeInTheDocument()
		await act(async () => { request.resolve(fresh) }); await screen.findByRole('heading', { name: 'Fresh linked Focus game' }); await waitFor(() => expect(calls.detail).toHaveBeenCalledTimes(2))
		expect(calls.sync).toHaveBeenCalledExactlyOnceWith(202)
	})
	it('keeps its owned detail when another route replaces the shared current playlist', async () => {
		const { store } = renderWithProviders(<FocusMode />, { preloadedState: { auth } }); await screen.findByRole('heading', { name: 'Owned Focus game' })
		act(() => { store.dispatch(setCurrentPlaylist(metro)) })
		expect(screen.getByRole('heading', { name: 'Owned Focus game' })).toBeInTheDocument(); expect(screen.queryByRole('heading', { name: metro.items[0].game.name })).not.toBeInTheDocument(); expect(calls.sync).not.toHaveBeenCalled()
	})
	it('does not let a same-ID shared-cache refresh inject Metro into the independently loaded Focus', async () => {
		const { store } = renderWithProviders(<FocusMode />, { preloadedState: { auth } }); await screen.findByRole('heading', { name: 'Owned Focus game' })
		act(() => { store.dispatch(refreshCurrentPlaylist({ ...focus, items: metro.items })) })
		expect(screen.getByRole('heading', { name: 'Owned Focus game' })).toBeInTheDocument(); expect(screen.queryByRole('heading', { name: metro.items[0].game.name })).not.toBeInTheDocument(); expect(localStorage.getItem('gdb.focus-playlist.1')).toBeNull()
	})
	it.each(['wrong-list', 'wrong-game', 'automatic'] as const)('rejects %s detail data instead of rendering or syncing an unrelated game', async problem => {
		calls.detail.mockResolvedValueOnce(problem === 'wrong-list' ? metro : problem === 'wrong-game' ? { ...focus, items: [{ ...focus.items[0], game: metro.items[0].game }] } : { ...focus, isAutomatic: true })
		renderWithProviders(<FocusMode />, { preloadedState: { auth } })
		expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t('focus.loadError')); expect(screen.queryByRole('heading', { name: metro.items[0].game.name })).not.toBeInTheDocument(); expect(calls.sync).not.toHaveBeenCalled(); expect(calls.create).not.toHaveBeenCalled()
	})
	it('uses its own summary response even when another route replaces the shared summary cache', async () => {
		const summaries = deferred<Playlist[]>(); calls.lists.mockReturnValueOnce(summaries.promise); calls.detail.mockImplementation((id: number) => Promise.resolve(id === 22 ? focus : metro))
		const { store } = renderWithProviders(<FocusMode />, { preloadedState: { auth } }); await waitFor(() => expect(calls.lists).toHaveBeenCalledOnce())
		act(() => { store.dispatch(fetchPlaylists.pending('other-route', undefined)); store.dispatch(fetchPlaylists.fulfilled([{ ...metro, name: 'Focus' }], 'other-route', undefined)) })
		await act(async () => { summaries.resolve([focus]) }); await screen.findByRole('heading', { name: 'Owned Focus game' })
		expect(calls.detail).toHaveBeenCalledExactlyOnceWith(22); expect(screen.queryByRole('heading', { name: metro.items[0].game.name })).not.toBeInTheDocument()
	})
	it('does not reinsert a removed game from a late Steam refresh of the same playlist', async () => {
		const before = { ...focus, items: [{ ...metro.items[0], game: { ...metro.items[0].game, steamAppId: 570 } }, ...focus.items] }, stale = deferred<Playlist>()
		calls.lists.mockResolvedValue([before]); calls.detail.mockResolvedValueOnce(before).mockReturnValueOnce(stale.promise); calls.remove.mockResolvedValue(focus)
		renderWithProviders(<FocusMode />, { preloadedState: { auth } }); await waitFor(() => expect(calls.detail).toHaveBeenCalledTimes(2))
		await userEvent.click(screen.getByRole('button', { name: 'Manage' })); await userEvent.click(screen.getByRole('button', { name: i18n.t('focus.removeGame', { name: metro.items[0].game.name }) })); await waitFor(() => expect(calls.remove).toHaveBeenCalledWith(22, metro.items[0].id)); await userEvent.click(screen.getByRole('button', { name: 'Done' })); await screen.findByRole('heading', { name: 'Owned Focus game' })
		await act(async () => { stale.resolve(before) })
		expect(screen.getByRole('heading', { name: 'Owned Focus game' })).toBeInTheDocument(); expect(screen.queryByRole('heading', { name: metro.items[0].game.name })).not.toBeInTheDocument(); expect(localStorage.getItem('gdb.focus-playlist.1')).toBeNull()
	})
	it('re-resolves an unavailable Focus ID against fresh owned summaries on retry without rewriting the saved preference', async () => {
		const replacement = list(33, 'Focus', 'Replacement Focus game', 301); localStorage.setItem('gdb.focus-playlist.1', '22')
		calls.lists.mockResolvedValueOnce([focus]).mockResolvedValue([replacement]); calls.detail.mockImplementation((id: number) => id === 22 ? Promise.reject(new Error('Removed list fixture')) : Promise.resolve(replacement))
		renderWithProviders(<FocusMode />, { preloadedState: { auth } }); await userEvent.click(await screen.findByRole('button', { name: 'Try again' })); await screen.findByRole('heading', { name: 'Replacement Focus game' })
		expect(calls.detail).toHaveBeenCalledWith(33); expect(localStorage.getItem('gdb.focus-playlist.1')).toBe('22'); expect(calls.create).not.toHaveBeenCalled()
	})
})
