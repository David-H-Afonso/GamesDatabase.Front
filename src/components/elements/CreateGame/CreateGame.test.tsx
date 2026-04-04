import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'

const mockCreateNewGame = vi.fn()
const mockDeleteGameById = vi.fn()

vi.mock('@/hooks/useGames', () => ({
	useGames: () => ({
		createNewGame: mockCreateNewGame,
		deleteGameById: mockDeleteGameById,
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
	GameDetails: () => <div data-testid='game-details' />,
}))

vi.mock('./CreateGame.scss', () => ({}))

async function loadCreateGame() {
	const mod = await import('./CreateGame')
	return mod.default
}

describe('CreateGame', () => {
	const user = userEvent.setup()

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('renders the Add Game button', async () => {
		const CreateGame = await loadCreateGame()
		renderWithProviders(<CreateGame />)

		expect(screen.getByText('Add Game')).toBeInTheDocument()
	})

	it('opens modal when Add Game button is clicked', async () => {
		const CreateGame = await loadCreateGame()
		renderWithProviders(<CreateGame />)

		await user.click(screen.getByText('Add Game'))

		expect(screen.getByTestId('modal')).toBeInTheDocument()
		expect(screen.getByText('Añadir Juegos')).toBeInTheDocument()
	})

	it('renders a game name input and status select in the modal', async () => {
		const CreateGame = await loadCreateGame()
		renderWithProviders(<CreateGame />)

		await user.click(screen.getByText('Add Game'))

		expect(screen.getByPlaceholderText('Título del juego')).toBeInTheDocument()
		expect(screen.getByText('Añadir juego')).toBeInTheDocument()
	})

	it('adds a new row when + button is clicked', async () => {
		const CreateGame = await loadCreateGame()
		renderWithProviders(<CreateGame />)

		await user.click(screen.getByText('Add Game'))

		// Initially 1 name input
		expect(screen.getAllByPlaceholderText('Título del juego')).toHaveLength(1)

		// Click the add row button
		await user.click(screen.getByTitle('Añadir otra fila'))

		expect(screen.getAllByPlaceholderText('Título del juego')).toHaveLength(2)
	})

	it('shows validation error when submitting empty name', async () => {
		const CreateGame = await loadCreateGame()
		renderWithProviders(<CreateGame />)

		await user.click(screen.getByText('Add Game'))
		await user.click(screen.getByText('Añadir juego'))

		await waitFor(() => {
			expect(screen.getByText('Required')).toBeInTheDocument()
		})
	})

	it('calls createNewGame on valid submit', async () => {
		mockCreateNewGame.mockResolvedValue({ id: 99, name: 'Elden Ring' })
		const CreateGame = await loadCreateGame()
		renderWithProviders(<CreateGame />)

		await user.click(screen.getByText('Add Game'))

		const input = screen.getByPlaceholderText('Título del juego')
		await user.type(input, 'Elden Ring')
		await user.click(screen.getByText('Añadir juego'))

		await waitFor(() => {
			expect(mockCreateNewGame).toHaveBeenCalledWith(expect.objectContaining({ name: 'Elden Ring' }))
		})
	})

	it('shows submit button text for multiple games', async () => {
		const CreateGame = await loadCreateGame()
		renderWithProviders(<CreateGame />)

		await user.click(screen.getByText('Add Game'))
		await user.click(screen.getByTitle('Añadir otra fila'))

		expect(screen.getByText('Añadir 2 juegos')).toBeInTheDocument()
	})

	it('disables delete row button when only one row exists', async () => {
		const CreateGame = await loadCreateGame()
		renderWithProviders(<CreateGame />)

		await user.click(screen.getByText('Add Game'))

		const deleteBtn = screen.getByTitle('No se puede eliminar la única fila')
		expect(deleteBtn).toBeDisabled()
	})

	it('toggles extra fields when + toggle is clicked', async () => {
		const CreateGame = await loadCreateGame()
		renderWithProviders(<CreateGame />)

		await user.click(screen.getByText('Add Game'))

		// Click the extra fields toggle (+)
		const toggleBtns = screen.getAllByTitle('Mostrar campos extra')
		await user.click(toggleBtns[0])

		expect(screen.getByText('Más barato por:')).toBeInTheDocument()
	})
})
