import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'

const mockCreateNewGame = vi.fn()
const mockDeleteGameById = vi.fn()
const mockFetchGameDetails = vi.fn()
const mockBulkUpdateGamesById = vi.fn()
const mockSteamService = vi.hoisted(() => ({
	getLibrary: vi.fn(),
	searchStore: vi.fn(),
	importGames: vi.fn(),
}))

vi.mock('@/services', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/services')>()),
	steamService: mockSteamService,
}))

vi.mock('@/hooks/useGames', () => ({
	useGames: () => ({
		createNewGame: mockCreateNewGame,
		deleteGameById: mockDeleteGameById,
		fetchGameDetails: mockFetchGameDetails,
		bulkUpdateGamesById: mockBulkUpdateGamesById,
	}),
}))

vi.mock('@/hooks', () => ({
	useGameStatus: () => ({
		fetchActiveStatusList: vi.fn().mockResolvedValue([
			{ id: 1, name: 'Playing' },
			{ id: 8, name: 'Not Fulfilled' },
		]),
		fetchSpecialStatusList: vi.fn().mockResolvedValue([{ id: 8, name: 'Not Fulfilled', statusType: 'NotFulfilled' }]),
	}),
}))

vi.mock('@/components/elements', () => ({
	Modal: ({ isOpen, children, title }: any) =>
		isOpen ? (
			<div data-testid='modal'>
				<h2>{title}</h2>
				{children}
			</div>
		) : null,
	GameDetails: ({ onDelete, game }: any) => (
		<div data-testid='game-details'>
			<button data-testid='game-details-delete' onClick={() => onDelete?.(game)}>
				Delete
			</button>
		</div>
	),
	ConfirmDialog: ({ isOpen, onConfirm, onCancel }: any) =>
		isOpen ? (
			<div role='alertdialog'>
				<button data-testid='confirm-cancel' onClick={onCancel}>
					Cancel
				</button>
				<button data-testid='confirm-ok' onClick={onConfirm}>
					Confirm
				</button>
			</div>
		) : null,
}))

vi.mock('./CreateGame.scss', () => ({}))

async function loadCreateGame() {
	const mod = await import('./CreateGame')
	return mod.default
}

async function openCreateModal(CreateGame: Awaited<ReturnType<typeof loadCreateGame>>, options?: Parameters<typeof renderWithProviders>[1]) {
	const user = userEvent.setup()
	renderWithProviders(<CreateGame />, options)

	await user.click(screen.getByRole('button', { name: 'Añadir Juego' }))
	return { user, modal: screen.getByTestId('modal') }
}

describe('CreateGame', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockCreateNewGame.mockResolvedValue({ id: 99, name: 'Created game' })
		mockFetchGameDetails.mockResolvedValue({ id: 200, name: 'Imported game' })
		mockBulkUpdateGamesById.mockResolvedValue({ updatedCount: 1, totalRequested: 1 })
		mockSteamService.getLibrary.mockResolvedValue([])
		mockSteamService.searchStore.mockResolvedValue([])
		mockSteamService.importGames.mockResolvedValue({
			success: true,
			created: 0,
			linked: 0,
			skipped: 0,
			importedGames: [],
		})
	})

	it('renders the Add Game button', async () => {
		const CreateGame = await loadCreateGame()
		renderWithProviders(<CreateGame />)

		expect(screen.getByRole('button', { name: 'Añadir Juego' })).toBeInTheDocument()
	})

	it('opens modal when Add Game button is clicked', async () => {
		const CreateGame = await loadCreateGame()
		const { modal } = await openCreateModal(CreateGame)

		expect(modal).toBeInTheDocument()
		expect(within(modal).getByText('Añadir Juegos')).toBeInTheDocument()
	})

	it('renders a game name input and status select in the modal', async () => {
		const CreateGame = await loadCreateGame()
		const { modal } = await openCreateModal(CreateGame)

		expect(within(modal).getByPlaceholderText('Título del juego')).toBeInTheDocument()
		expect(within(modal).getByRole('button', { name: 'Añadir Juego' })).toBeInTheDocument()
	})

	it('adds a new row when + button is clicked', async () => {
		const CreateGame = await loadCreateGame()
		const { user, modal } = await openCreateModal(CreateGame)

		expect(within(modal).getAllByPlaceholderText('Título del juego')).toHaveLength(1)

		await user.click(within(modal).getByTitle('Añadir otra fila'))

		expect(within(modal).getAllByPlaceholderText('Título del juego')).toHaveLength(2)
	})

	it('shows validation error when submitting empty name', async () => {
		const CreateGame = await loadCreateGame()
		const { user, modal } = await openCreateModal(CreateGame)
		await user.click(within(modal).getByRole('button', { name: 'Añadir Juego' }))

		await waitFor(() => {
			expect(within(modal).getByText('Required')).toBeInTheDocument()
		})
	})

	it('calls createNewGame on valid submit', async () => {
		mockCreateNewGame.mockResolvedValue({ id: 99, name: 'Elden Ring' })
		const CreateGame = await loadCreateGame()
		const { user, modal } = await openCreateModal(CreateGame)

		const input = within(modal).getByPlaceholderText('Título del juego')
		await user.type(input, 'Elden Ring')
		await user.click(within(modal).getByRole('button', { name: 'Añadir Juego' }))

		await waitFor(() => {
			expect(mockCreateNewGame).toHaveBeenCalledWith(expect.objectContaining({ name: 'Elden Ring' }))
		})
	})

	it('asks for confirmation before deleting the created game and deletes on confirm', async () => {
		mockCreateNewGame.mockResolvedValue({ id: 99, name: 'Elden Ring' })
		const CreateGame = await loadCreateGame()
		const { user, modal } = await openCreateModal(CreateGame)

		await user.type(within(modal).getByPlaceholderText('Título del juego'), 'Elden Ring')
		await user.click(within(modal).getByRole('button', { name: 'Añadir Juego' }))

		await waitFor(() => expect(screen.getByTestId('game-details')).toBeInTheDocument())

		await user.click(screen.getByTestId('game-details-delete'))
		expect(screen.getByRole('alertdialog')).toBeInTheDocument()
		await user.click(screen.getByTestId('confirm-ok'))

		expect(mockDeleteGameById).toHaveBeenCalledWith(99)
	})

	it('does not delete the created game when the confirmation is cancelled', async () => {
		mockCreateNewGame.mockResolvedValue({ id: 99, name: 'Elden Ring' })
		const CreateGame = await loadCreateGame()
		const { user, modal } = await openCreateModal(CreateGame)

		await user.type(within(modal).getByPlaceholderText('Título del juego'), 'Elden Ring')
		await user.click(within(modal).getByRole('button', { name: 'Añadir Juego' }))

		await waitFor(() => expect(screen.getByTestId('game-details')).toBeInTheDocument())

		await user.click(screen.getByTestId('game-details-delete'))
		await user.click(screen.getByTestId('confirm-cancel'))

		expect(mockDeleteGameById).not.toHaveBeenCalled()
	})

	it('shows submit button text for multiple games', async () => {
		const CreateGame = await loadCreateGame()
		const { user, modal } = await openCreateModal(CreateGame)
		await user.click(within(modal).getByTitle('Añadir otra fila'))

		expect(within(modal).getByText('Añadir 2 juegos')).toBeInTheDocument()
	})

	it('disables delete row button when only one row exists', async () => {
		const CreateGame = await loadCreateGame()
		const { modal } = await openCreateModal(CreateGame)

		const deleteBtn = within(modal).getByTitle('No se puede eliminar la única fila')
		expect(deleteBtn).toBeDisabled()
	})

	it('toggles extra fields when + toggle is clicked', async () => {
		const CreateGame = await loadCreateGame()
		const { user, modal } = await openCreateModal(CreateGame)

		const toggleBtns = within(modal).getAllByTitle('Mostrar campos extra')
		await user.click(toggleBtns[0])

		expect(within(modal).getByText('Más barato en:')).toBeInTheDocument()
	})

	it('does not search Steam until the row Steam toggle is enabled', async () => {
		const CreateGame = await loadCreateGame()
		const { user, modal } = await openCreateModal(CreateGame, {
			preloadedState: {
				auth: {
					isAuthenticated: true,
					user: { id: 1, username: 'david', role: 'Admin', steamId: '76561198000000000' },
					token: 'token',
			refreshToken: null,
					loading: false,
					error: null,
				},
			},
		})

		await user.type(within(modal).getByPlaceholderText('Título del juego'), 'test789')
		await new Promise((resolve) => window.setTimeout(resolve, 450))

		expect(mockSteamService.searchStore).not.toHaveBeenCalled()
		expect(within(modal).queryByText('Resultados de Steam')).not.toBeInTheDocument()
	})

	it('does not show required validation when enabling Steam search on an untouched focused row', async () => {
		const CreateGame = await loadCreateGame()
		const { user, modal } = await openCreateModal(CreateGame, {
			preloadedState: {
				auth: {
					isAuthenticated: true,
					user: { id: 1, username: 'david', role: 'Admin', steamId: '76561198000000000' },
					token: 'token',
			refreshToken: null,
					loading: false,
					error: null,
				},
			},
		})

		await user.click(within(modal).getByTitle('Activar búsqueda de Steam para esta fila'))

		expect(within(modal).queryByText('Required')).not.toBeInTheDocument()
	})

	it('mixes Steam imports and manual games while preserving the selected Steam status and cheaper option', async () => {
		mockSteamService.getLibrary.mockResolvedValue([{ appId: 1569580, name: 'Blue Prince', playtimeForever: 180, iconUrl: 'https://cdn.example/icon.jpg' }])
		mockSteamService.searchStore.mockResolvedValue([{ appId: 221, name: 'Blue Prince: Store Result', coverUrl: 'https://cdn.example/cover.jpg', price: '9,99€', metascore: 82 }])
		mockSteamService.importGames.mockResolvedValue({
			success: true,
			created: 1,
			linked: 0,
			skipped: 0,
			importedGames: [{ appId: 1569580, gdbGameId: 200, name: 'Blue Prince', action: 'created' }],
		})

		const CreateGame = await loadCreateGame()
		const { user, modal } = await openCreateModal(CreateGame, {
			preloadedState: {
				auth: {
					isAuthenticated: true,
					user: { id: 1, username: 'david', role: 'Admin', steamId: '76561198000000000' },
					token: 'token',
			refreshToken: null,
					loading: false,
					error: null,
				},
				steam: {
					profile: null,
					library: [{ appId: 1569580, name: 'Blue Prince', playtimeForever: 180, iconUrl: 'https://cdn.example/icon.jpg' }],
					libraryLoading: false,
					profileLoading: false,
					syncLoading: false,
					importLoading: false,
					lastSyncResult: null,
					lastImportResult: null,
					error: null,
				},
			},
		})

		await user.click(within(modal).getByTitle('Activar búsqueda de Steam para esta fila'))
		await user.type(within(modal).getByPlaceholderText('Título del juego'), 'Blue')
		const librarySuggestion = await within(modal).findByText('Blue Prince', {}, { timeout: 3000 })
		await user.click(librarySuggestion.closest('button')!)

		expect(within(modal).getAllByAltText('').some((image) => image.getAttribute('src')?.includes('/steam/apps/1569580/header.jpg'))).toBe(true)
		expect(within(modal).queryByPlaceholderText('Título del juego')).not.toBeInTheDocument()

		const statusSelects = within(modal).getAllByRole('combobox')
		await user.selectOptions(statusSelects[0], '1')
		await user.click(within(modal).getByTitle('Mostrar campos extra'))
		await user.selectOptions(within(modal).getAllByRole('combobox')[1], 'key')
		await user.click(within(modal).getByTitle('Añadir otra fila'))
		await user.type(within(modal).getByPlaceholderText('Título del juego'), 'Manual Game')
		await user.click(within(modal).getByRole('button', { name: 'Añadir 2 juegos' }))

		await waitFor(() => {
			expect(mockSteamService.importGames).toHaveBeenCalledWith({
				games: [
					{
						appId: 1569580,
						logoUrl: 'https://cdn.example/icon.jpg',
						coverUrl: expect.stringContaining('/steam/apps/1569580/header.jpg'),
					},
				],
				createMissing: true,
			})
			expect(mockCreateNewGame).toHaveBeenCalledWith(expect.objectContaining({ name: 'Manual Game', statusId: 8 }))
			expect(mockBulkUpdateGamesById).toHaveBeenCalledWith({ gameIds: [200], statusId: 1, isCheaperByKey: true })
		})
	})
})
