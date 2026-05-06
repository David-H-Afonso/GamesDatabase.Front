import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'

const mockReplays = [
	{
		id: 1,
		gameId: 1,
		replayTypeId: 1,
		replayTypeName: 'New Game+',
		replayTypeColor: '#ff0',
		started: '2023-06-01',
		finished: '2023-07-01',
		grade: 90,
		notes: 'Even better the second time',
	},
]

const mockGetReplaysByGameId = vi.fn().mockResolvedValue(mockReplays)
const mockCreateGameReplay = vi.fn().mockResolvedValue(undefined)
const mockUpdateGameReplay = vi.fn().mockResolvedValue(undefined)
const mockDeleteGameReplay = vi.fn().mockResolvedValue(undefined)

vi.mock('@/services/GameReplayService', () => ({
	getReplaysByGameId: (...args: any[]) => mockGetReplaysByGameId(...args),
	createGameReplay: (...args: any[]) => mockCreateGameReplay(...args),
	updateGameReplay: (...args: any[]) => mockUpdateGameReplay(...args),
	deleteGameReplay: (...args: any[]) => mockDeleteGameReplay(...args),
}))

vi.mock('@/services/GameReplayTypeService', () => ({
	getActiveGameReplayTypes: vi.fn().mockResolvedValue([{ id: 1, name: 'New Game+' }]),
	getSpecialGameReplayType: vi.fn().mockResolvedValue({ id: 1, name: 'New Game+' }),
}))

vi.mock('@/utils', () => ({
	formatToLocaleDate: (val: string) => val,
	DEFAULT_PAGE_SIZE: 50,
}))

vi.mock('./GameReplaysTab.scss', () => ({}))

describe('GameReplaysTab', () => {
	const user = userEvent.setup()

	beforeEach(() => {
		vi.clearAllMocks()
		mockGetReplaysByGameId.mockResolvedValue(mockReplays)
	})

	it('shows loading state initially', async () => {
		mockGetReplaysByGameId.mockReturnValue(new Promise(() => {}))
		const { GameReplaysTab } = await import('./GameReplaysTab')
		renderWithProviders(<GameReplaysTab gameId={1} />)

		expect(screen.getByText('Cargando rejugadas...')).toBeInTheDocument()
	})

	it('renders replays after loading', async () => {
		const { GameReplaysTab } = await import('./GameReplaysTab')
		renderWithProviders(<GameReplaysTab gameId={1} />)

		await waitFor(() => {
			expect(screen.getByText('1 rejugada')).toBeInTheDocument()
		})

		expect(screen.getByText('New Game+')).toBeInTheDocument()
		expect(screen.getByText('90/100')).toBeInTheDocument()
		expect(screen.getByText('Even better the second time')).toBeInTheDocument()
	})

	it('shows empty state when no replays', async () => {
		mockGetReplaysByGameId.mockResolvedValue([])
		const { GameReplaysTab } = await import('./GameReplaysTab')
		renderWithProviders(<GameReplaysTab gameId={1} />)

		await waitFor(() => {
			expect(screen.getByText('Sin rejugadas registradas.')).toBeInTheDocument()
		})
	})

	it('opens new replay form when + button is clicked', async () => {
		const { GameReplaysTab } = await import('./GameReplaysTab')
		renderWithProviders(<GameReplaysTab gameId={1} />)

		await waitFor(() => {
			expect(screen.getByText('+ Añadir rejugada')).toBeInTheDocument()
		})

		await user.click(screen.getByText('+ Añadir rejugada'))

		expect(screen.getByText('Nueva rejugada')).toBeInTheDocument()
		expect(screen.getByLabelText('Tipo')).toBeInTheDocument()
		expect(screen.getByLabelText('Inicio')).toBeInTheDocument()
		expect(screen.getByLabelText('Fin')).toBeInTheDocument()
		expect(screen.getByLabelText('Nota (0-100)')).toBeInTheDocument()
		expect(screen.getByLabelText('Notas')).toBeInTheDocument()
	})

	it('opens edit form when Editar button is clicked', async () => {
		const { GameReplaysTab } = await import('./GameReplaysTab')
		renderWithProviders(<GameReplaysTab gameId={1} />)

		await waitFor(() => {
			expect(screen.getByText('Editar')).toBeInTheDocument()
		})

		await user.click(screen.getByText('Editar'))

		expect(screen.getByText('Editar rejugada')).toBeInTheDocument()
		expect(screen.getByText('Guardar cambios')).toBeInTheDocument()
	})

	it('deletes a replay after confirmation', async () => {
		vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
		const { GameReplaysTab } = await import('./GameReplaysTab')
		renderWithProviders(<GameReplaysTab gameId={1} />)

		await waitFor(() => {
			expect(screen.getByText('Eliminar')).toBeInTheDocument()
		})

		await user.click(screen.getByText('Eliminar'))

		expect(mockDeleteGameReplay).toHaveBeenCalledWith(1, 1)
		vi.mocked(globalThis.confirm).mockRestore()
	})

	it('closes form when Cancelar is clicked', async () => {
		const { GameReplaysTab } = await import('./GameReplaysTab')
		renderWithProviders(<GameReplaysTab gameId={1} />)

		await waitFor(() => {
			expect(screen.getByText('+ Añadir rejugada')).toBeInTheDocument()
		})

		await user.click(screen.getByText('+ Añadir rejugada'))
		expect(screen.getByText('Nueva rejugada')).toBeInTheDocument()

		await user.click(screen.getByText('Cancelar'))
		expect(screen.queryByText('Nueva rejugada')).not.toBeInTheDocument()
	})

	it('submits new replay form', async () => {
		mockCreateGameReplay.mockResolvedValue(undefined)
		mockGetReplaysByGameId.mockResolvedValue(mockReplays)
		const { GameReplaysTab } = await import('./GameReplaysTab')
		renderWithProviders(<GameReplaysTab gameId={1} />)

		await waitFor(() => {
			expect(screen.getByText('+ Añadir rejugada')).toBeInTheDocument()
		})

		await user.click(screen.getByText('+ Añadir rejugada'))
		await user.click(screen.getByText('Crear'))

		await waitFor(() => {
			expect(mockCreateGameReplay).toHaveBeenCalled()
		})
	})
})
