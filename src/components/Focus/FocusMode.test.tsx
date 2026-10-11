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

vi.mock('./FocusMode.scss', () => ({}))
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
	fetchAll: vi.fn().mockResolvedValue(undefined),
	fetchById: vi.fn().mockResolvedValue(playlist),
	create: vi.fn().mockResolvedValue({ id: 19 }),
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
		expect(screen.getByText('Outer Wilds')).toBeInTheDocument()
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

		await user.click(await screen.findByRole('button', { name: 'Gestionar lista' }))
		await user.type(await screen.findByRole('searchbox', { name: 'Buscar un juego de tu biblioteca…' }), 'Tunic')
		await waitFor(() => expect(mockGetGames).toHaveBeenCalledWith({ search: 'Tunic', page: 1, pageSize: 8 }))
		await user.click(await screen.findByRole('button', { name: 'Añadir' }))

		expect(hooks.addItem).toHaveBeenCalledWith(7, 44)
	})

	it('keeps the add control disabled once the four-game limit is reached', async () => {
		const user = userEvent.setup()
		const hooks = makePlaylistHook(makePlaylist([...items, makeItem(104, makeGame(4, 'Tunic'))]))
		mockUsePlaylists.mockReturnValue(hooks as any)

		renderWithProviders(<FocusMode />)

		await user.click(await screen.findByRole('button', { name: 'Gestionar lista' }))
		expect(await screen.findByText('Quita un juego o aumenta el máximo en la configuración de la lista.')).toBeInTheDocument()
		expect(screen.getByRole('searchbox', { name: 'Buscar un juego de tu biblioteca…' })).toBeDisabled()
	})

	it('renders completion as hours rather than invented progress', async () => {
		const witcher = { ...currentGame, completion: 188 }
		mockUsePlaylists.mockReturnValue(makePlaylistHook(makePlaylist([makeItem(101, witcher)])) as any)
		renderWithProviders(<FocusMode />)
		expect(await screen.findByText('188 h')).toBeInTheDocument()
		expect(screen.queryByText('188%')).not.toBeInTheDocument()
	})

	it('syncs only linked Focus games once and reloads their saved statistics', async () => {
		const steamGame = { ...currentGame, steamAppId: 100, steamAchievementsTotal: 8, steamAchievementsUnlocked: 8 }
		const hooks = makePlaylistHook(makePlaylist([makeItem(101, steamGame), items[1]]))
		mockUsePlaylists.mockReturnValue(hooks as any)
		renderWithProviders(<FocusMode />)
		await waitFor(() => expect(steamService.syncGame).toHaveBeenCalledTimes(1))
		expect(steamService.syncGame).toHaveBeenCalledWith(1)
		await waitFor(() => expect(getPlaylistById).toHaveBeenCalledWith(7))
		expect(hooks.fetchById).toHaveBeenCalledTimes(1)
		expect(screen.getByLabelText('Completado al 100%')).toBeInTheDocument()
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
