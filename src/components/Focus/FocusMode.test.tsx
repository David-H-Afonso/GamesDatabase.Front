import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { usePlaylists } from '@/hooks'
import { getGames } from '@/services/GamesService/GamesService'
import type { Game } from '@/models/api/Game'
import type { Playlist, PlaylistItem, PlaylistSummary } from '@/models/api/Playlist'
import FocusMode from './FocusMode'
import { steamService } from '@/services/SteamService/SteamService'
import { getPlaylistById } from '@/services/PlaylistService/PlaylistService'
import playlistsReducer, { refreshCurrentPlaylist } from '@/store/features/playlists/playlistSlice'
import { fetchPlaylistById } from '@/store/features/playlists/thunk'

vi.mock('./GalleryFocus.scss', () => ({}))
vi.mock('@/hooks', () => ({ usePlaylists: vi.fn() }))
vi.mock('@/services/GamesService/GamesService', () => ({ getGames: vi.fn() }))
vi.mock('@/services/SteamService/SteamService', () => ({ steamService: { syncGame: vi.fn().mockResolvedValue({ success: true }) } }))
vi.mock('@/services/PlaylistService/PlaylistService', () => ({ getPlaylistById: vi.fn() }))

const makeGame = (id: number, name: string): Game => ({
	id,
	name,
	statusId: 1,
	playWithIds: [],
	playWithNames: [],
	favorite: false,
	platformName: 'PC',
	completion: 25,
	grade: 88,
})

const makeItem = (id: number, game: Game): PlaylistItem => ({ id, gameId: game.id, position: id - 100, game })

const currentGame = makeGame(1, 'A Short Hike')
const nextGame = makeGame(2, 'Outer Wilds')
const laterGame = makeGame(3, 'Hades')
const items = [makeItem(101, currentGame), makeItem(102, nextGame), makeItem(103, laterGame)]

const makePlaylist = (playlistItems: PlaylistItem[] = items): Playlist => ({
	id: 7,
	name: 'Focus',
	description: 'Short list',
	isAutomatic: false,
	sortOrder: 0,
	gameCount: playlistItems.length,
	updatedAt: '2026-10-09T00:00:00Z',
	createdAt: '2026-10-09T00:00:00Z',
	items: playlistItems,
})

const summary: PlaylistSummary = {
	id: 7,
	name: 'Focus',
	isAutomatic: false,
	sortOrder: 0,
	gameCount: 3,
	updatedAt: '2026-10-09T00:00:00Z',
}

const mockUsePlaylists = vi.mocked(usePlaylists)
const mockGetGames = vi.mocked(getGames)

const makePlaylistHook = (playlist: Playlist | null, playlists: PlaylistSummary[] = playlist ? [summary] : []) => ({
	playlists,
	currentPlaylist: playlist,
	loading: false,
	error: null,
	reordering: false,
	fetchAll: vi.fn().mockResolvedValue(playlists),
	fetchById: vi.fn().mockResolvedValue(playlist),
	create: vi.fn().mockResolvedValue({ ...makePlaylist([]), id: 19 }),
	update: vi.fn().mockResolvedValue(undefined),
	remove: vi.fn().mockResolvedValue(undefined),
	reorder: vi.fn().mockResolvedValue(undefined),
	addItem: vi.fn().mockResolvedValue(playlist),
	removeItem: vi.fn().mockResolvedValue(playlist),
	reorderItems: vi.fn().mockResolvedValue(undefined),
	exportPlaylist: vi.fn().mockResolvedValue(undefined),
	importPlaylist: vi.fn().mockResolvedValue(undefined),
})

describe('FocusMode', () => {
	beforeEach(() => {
		window.localStorage.clear()
		vi.clearAllMocks()
		vi.mocked(getPlaylistById).mockResolvedValue(makePlaylist())
		vi.mocked(steamService.syncGame).mockResolvedValue({ success: true })
		mockGetGames.mockResolvedValue({ data: [], totalCount: 0, page: 1, pageSize: 8, totalPages: 0, hasNextPage: false, hasPreviousPage: false })
	})

	it('creates the Focus playlist only after the user chooses to set it up', async () => {
		const user = userEvent.setup()
		const hooks = makePlaylistHook(null, [])
		mockUsePlaylists.mockReturnValue(hooks as any)

		renderWithProviders(<FocusMode />)

		await user.click(await screen.findByRole('button', { name: 'Crear mi lista Focus' }))

		expect(hooks.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Focus', isAutomatic: false, maxLength: 4 }))
	})

	it('switches spotlight without changing playlist order and hides management by default', async () => {
		const user = userEvent.setup()
		const hooks = makePlaylistHook(makePlaylist())
		mockUsePlaylists.mockReturnValue(hooks as any)

		renderWithProviders(<FocusMode />)

		expect(await screen.findByRole('heading', { name: 'A Short Hike' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Ver detalles de Outer Wilds' })).toBeInTheDocument()
		expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Ver detalles de Outer Wilds' })).toBeInTheDocument()
		await user.click(screen.getByRole('button', { name: 'Destacar Outer Wilds' }))

		expect(screen.getByRole('heading', { name: 'Outer Wilds' })).toBeInTheDocument()
		expect(hooks.reorderItems).not.toHaveBeenCalled()
	})

	it('searches the library and adds a selected game to the Focus playlist', async () => {
		const user = userEvent.setup()
		const hooks = makePlaylistHook(makePlaylist([items[0]]))
		const searchGame = makeGame(44, 'Tunic')
		mockUsePlaylists.mockReturnValue(hooks as any)
		mockGetGames.mockResolvedValue({ data: [searchGame], totalCount: 1, page: 1, pageSize: 8, totalPages: 1, hasNextPage: false, hasPreviousPage: false })

		renderWithProviders(<FocusMode />)

		await user.click(await screen.findByRole('button', { name: 'Gestionar' }))
		await user.type(await screen.findByRole('searchbox', { name: 'Buscar un juego de tu biblioteca…' }), 'Tunic')
		await waitFor(() => expect(mockGetGames).toHaveBeenCalledWith({ search: 'Tunic', page: 1, pageSize: 8 }, expect.any(AbortSignal)))
		const add = await screen.findByRole('button', { name: 'Añadir Tunic a Focus' })
		expect(add.textContent).toBe('')
		expect(add.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument()
		await user.click(add)

		expect(hooks.addItem).toHaveBeenCalledWith(7, 44)
	})

	it('names added and pending icon controls and prevents duplicate Focus additions', async () => {
		const user = userEvent.setup()
		const hooks = makePlaylistHook(makePlaylist([items[0]]))
		let finish!: (value: Playlist) => void
		hooks.addItem.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
		mockUsePlaylists.mockReturnValue(hooks as any)
		mockGetGames.mockResolvedValue({ data: [currentGame, nextGame], totalCount: 2, page: 1, pageSize: 8, totalPages: 1, hasNextPage: false, hasPreviousPage: false })
		renderWithProviders(<FocusMode />)
		await user.click(await screen.findByRole('button', { name: 'Gestionar' }))
		await user.type(screen.getByRole('searchbox'), 'game')
		expect(await screen.findByRole('button', { name: 'A Short Hike ya está en Focus' })).toBeDisabled()
		await user.click(screen.getByRole('button', { name: 'Añadir Outer Wilds a Focus' }))
		const pending = screen.getByRole('button', { name: 'Añadiendo Outer Wilds a Focus' })
		expect(pending).toBeDisabled()
		expect(pending).toHaveAttribute('aria-busy', 'true')
		await user.click(pending)
		expect(hooks.addItem).toHaveBeenCalledExactlyOnceWith(7, 2)
		await act(async () => { finish(makePlaylist([items[0], items[1]])) })
	})

	it('keeps the add control disabled once the four-game limit is reached', async () => {
		const user = userEvent.setup()
		const hooks = makePlaylistHook(makePlaylist([...items, makeItem(104, makeGame(4, 'Tunic'))]))
		mockUsePlaylists.mockReturnValue(hooks as any)

		renderWithProviders(<FocusMode />)

		await user.click(await screen.findByRole('button', { name: 'Gestionar' }))
		expect(await screen.findByText('Los huecos están ocupados. Quita un juego para hacer sitio a otro.')).toBeInTheDocument()
		expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Quitar Outer Wilds de Focus' })).toBeEnabled()
	})

	it('renders estimated story as hours rather than invented progress', async () => {
		const witcher = { ...currentGame, story: 188, completion: 240 }
		mockUsePlaylists.mockReturnValue(makePlaylistHook(makePlaylist([makeItem(101, witcher)])) as any)
		renderWithProviders(<FocusMode />)
		expect(await screen.findByText('188 h')).toBeInTheDocument()
		expect(screen.queryByText('188%')).not.toBeInTheDocument()
	})

	it('reorders only from the management sheet and preserves the explicit spotlight', async () => {
		const user = userEvent.setup()
		const hooks = makePlaylistHook(makePlaylist())
		mockUsePlaylists.mockReturnValue(hooks as any)
		renderWithProviders(<FocusMode />)
		await user.click(await screen.findByRole('button', { name: 'Destacar Hades' }))
		await user.click(screen.getByRole('button', { name: 'Gestionar' }))
		expect(screen.getByRole('dialog', { name: 'Tu Focus' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Subir A Short Hike' })).toBeDisabled()
		await user.click(screen.getByRole('button', { name: 'Subir Outer Wilds' }))
		expect(hooks.reorderItems).toHaveBeenCalledWith(7, [102, 101, 103])
		await user.click(screen.getByRole('button', { name: 'Listo' }))
		expect(screen.getByRole('heading', { name: 'Hades' })).toBeInTheDocument()
		expect(hooks.removeItem).not.toHaveBeenCalled()
	})

	it('returns to automatic Steam time when manual time is zero', async () => {
		mockUsePlaylists.mockReturnValue(makePlaylistHook(makePlaylist([makeItem(101, { ...currentGame, manualPlaytimeMinutes: 0, steamPlaytimeForever: 120 })])) as any)
		renderWithProviders(<FocusMode />)
		expect(await screen.findByText('2 h')).toBeInTheDocument()
		expect(screen.queryByText('0 h')).not.toBeInTheDocument()
	})
	it('does not replace another account Focus choice or keep its prior spotlight after switching users', async () => {
		localStorage.setItem('gdb.focus-playlist.1', '7'); localStorage.setItem('gdb.focus-playlist.2', '19')
		const first = makePlaylistHook(makePlaylist()); mockUsePlaylists.mockReturnValue(first as any)
		const auth = { user: { id: 1, username: 'First fixture', role: 'Standard' }, token: 'fixture', refreshToken: null, isAuthenticated: true, loading: false, error: null } as const
		const { store } = renderWithProviders(<FocusMode />, { preloadedState: { auth } }); await screen.findByRole('heading', { name: 'A Short Hike' })
		const next = { ...makePlaylist([makeItem(121, makeGame(90, 'Second account game'))]), id: 19, name: 'My selected list' }
		const second = makePlaylistHook(next, [{ ...summary, id: 19, name: next.name }]); mockUsePlaylists.mockReturnValue(second as any)
		act(() => store.dispatch({ type: 'auth/login/fulfilled', payload: { userId: 2, username: 'Second fixture', role: 'Standard', token: 'fixture-two', refreshToken: null } }))
		expect(screen.queryByRole('heading', { name: 'A Short Hike' })).not.toBeInTheDocument(); await screen.findByRole('heading', { name: 'Second account game' })
		expect(second.fetchById).toHaveBeenCalledExactlyOnceWith(19); expect(localStorage.getItem('gdb.focus-playlist.2')).toBe('19'); expect(localStorage.getItem('gdb.focus-playlist.1')).toBe('7')
	})

	it('syncs only linked Focus games once and reloads their saved statistics', async () => {
		const steamGame = { ...currentGame, steamAppId: 100, steamAchievementsTotal: 8, steamAchievementsUnlocked: 8 }
		const hooks = makePlaylistHook(makePlaylist([makeItem(101, steamGame), items[1]]))
		vi.mocked(getPlaylistById).mockResolvedValueOnce(makePlaylist([makeItem(101, { ...steamGame, steamPlaytimeForever: 180 }), items[1]]))
		mockUsePlaylists.mockReturnValue(hooks as any)
		renderWithProviders(<FocusMode />)
		await waitFor(() => expect(steamService.syncGame).toHaveBeenCalledTimes(1))
		expect(steamService.syncGame).toHaveBeenCalledWith(1)
		await waitFor(() => expect(getPlaylistById).toHaveBeenCalledWith(7))
		expect(hooks.fetchById).toHaveBeenCalledTimes(1)
		expect(await screen.findAllByText('3 h')).not.toHaveLength(0)
		expect(screen.getAllByLabelText('Completado al 100%')).toHaveLength(2)
	})

	it('does not refresh shared playlist state after leaving Focus while Steam is syncing', async () => {
		let finishSync!: (value: { success: boolean }) => void
		vi.mocked(steamService.syncGame).mockReturnValueOnce(new Promise(resolve => { finishSync = resolve }))
		mockUsePlaylists.mockReturnValue(makePlaylistHook(makePlaylist([makeItem(101, { ...currentGame, steamAppId: 100 })])) as any)
		const { unmount } = renderWithProviders(<FocusMode />)
		await waitFor(() => expect(steamService.syncGame).toHaveBeenCalledTimes(1))
		unmount()
		await act(async () => { finishSync({ success: true }) })
		expect(getPlaylistById).not.toHaveBeenCalled()
	})

	it('ignores a Focus refresh when another playlist is loading or has become current', () => {
		const focus = makePlaylist()
		const other = { ...focus, id: 16, name: 'Backlog' }
		let state = playlistsReducer(undefined, { type: 'init' })
		state = { ...state, currentPlaylist: focus }
		state = playlistsReducer(state, fetchPlaylistById.pending('new-request', 16))
		state = playlistsReducer(state, refreshCurrentPlaylist(focus))
		expect(state.currentPlaylistRequestId).toBe('new-request')
		state = playlistsReducer(state, fetchPlaylistById.fulfilled(other, 'new-request', 16))
		state = playlistsReducer(state, refreshCurrentPlaylist(focus))
		expect(state.currentPlaylist?.id).toBe(16)
	})

	it('keeps the newest playlist detail response when requests finish out of order', () => {
		let state = playlistsReducer(undefined, fetchPlaylistById.pending('focus-request', 7))
		state = playlistsReducer(state, fetchPlaylistById.pending('backlog-request', 16))
		const other = { ...makePlaylist(), id: 16 }
		state = playlistsReducer(state, fetchPlaylistById.fulfilled(other, 'backlog-request', 16))
		state = playlistsReducer(state, fetchPlaylistById.fulfilled(makePlaylist(), 'focus-request', 7))
		expect(state.currentPlaylist?.id).toBe(16)
	})
})
