import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'

const mockEntries = [
	{
		id: 1,
		actionType: 'Created',
		description: 'Game created',
		oldValue: null,
		newValue: 'Dark Souls',
		changedAt: '2023-01-01T00:00:00Z',
	},
	{
		id: 2,
		actionType: 'Updated',
		description: 'Status changed',
		oldValue: 'Playing',
		newValue: 'Completed',
		changedAt: '2023-06-01T00:00:00Z',
	},
]

const mockGetHistoryByGameId = vi.fn().mockResolvedValue({ data: mockEntries })
const mockDeleteHistoryEntry = vi.fn().mockResolvedValue(undefined)
const mockClearGameHistory = vi.fn().mockResolvedValue(undefined)

vi.mock('@/services/GameHistoryService', () => ({
	getHistoryByGameId: (...args: any[]) => mockGetHistoryByGameId(...args),
	deleteHistoryEntry: (...args: any[]) => mockDeleteHistoryEntry(...args),
	clearGameHistory: (...args: any[]) => mockClearGameHistory(...args),
}))

vi.mock('./GameHistoryTab.scss', () => ({}))

describe('GameHistoryTab', () => {
	const user = userEvent.setup()

	beforeEach(() => {
		vi.clearAllMocks()
		mockGetHistoryByGameId.mockResolvedValue({ data: mockEntries })
	})

	it('shows loading state initially', async () => {
		// Make the fetch hang
		mockGetHistoryByGameId.mockReturnValue(new Promise(() => {}))
		const { GameHistoryTab } = await import('./GameHistoryTab')
		renderWithProviders(<GameHistoryTab gameId={1} />)

		expect(screen.getByText('Cargando historial...')).toBeInTheDocument()
	})

	it('renders history entries after loading', async () => {
		const { GameHistoryTab } = await import('./GameHistoryTab')
		renderWithProviders(<GameHistoryTab gameId={1} />)

		await waitFor(() => {
			expect(screen.getByText('2 entradas')).toBeInTheDocument()
		})

		expect(screen.getByText('Creado')).toBeInTheDocument()
		expect(screen.getByText('Game created')).toBeInTheDocument()
		expect(screen.getByText('Actualizado')).toBeInTheDocument()
		expect(screen.getByText('Status changed')).toBeInTheDocument()
	})

	it('shows old → new values for updated entries', async () => {
		const { GameHistoryTab } = await import('./GameHistoryTab')
		renderWithProviders(<GameHistoryTab gameId={1} />)

		await waitFor(() => {
			expect(screen.getByText('Playing')).toBeInTheDocument()
		})

		expect(screen.getByText('→')).toBeInTheDocument()
		expect(screen.getByText('Completed')).toBeInTheDocument()
	})

	it('shows empty state when no entries', async () => {
		mockGetHistoryByGameId.mockResolvedValue({ data: [] })
		const { GameHistoryTab } = await import('./GameHistoryTab')
		renderWithProviders(<GameHistoryTab gameId={1} />)

		await waitFor(() => {
			expect(screen.getByText('Sin historial registrado.')).toBeInTheDocument()
		})
	})

	it('deletes a single entry when × button is clicked', async () => {
		const { GameHistoryTab } = await import('./GameHistoryTab')
		renderWithProviders(<GameHistoryTab gameId={1} />)

		await waitFor(() => {
			expect(screen.getByText('2 entradas')).toBeInTheDocument()
		})

		const deleteBtns = screen.getAllByTitle('Borrar entrada')
		await user.click(deleteBtns[0])

		expect(mockDeleteHistoryEntry).toHaveBeenCalledWith(1, 1)
	})

	it('clears all history after confirmation', async () => {
		vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
		const { GameHistoryTab } = await import('./GameHistoryTab')
		renderWithProviders(<GameHistoryTab gameId={1} />)

		await waitFor(() => {
			expect(screen.getByText('Borrar todo')).toBeInTheDocument()
		})

		await user.click(screen.getByText('Borrar todo'))

		expect(mockClearGameHistory).toHaveBeenCalledWith(1)
		vi.mocked(globalThis.confirm).mockRestore()
	})

	it('does not show "Borrar todo" when no entries', async () => {
		mockGetHistoryByGameId.mockResolvedValue({ data: [] })
		const { GameHistoryTab } = await import('./GameHistoryTab')
		renderWithProviders(<GameHistoryTab gameId={1} />)

		await waitFor(() => {
			expect(screen.getByText('Sin historial registrado.')).toBeInTheDocument()
		})

		expect(screen.queryByText('Borrar todo')).not.toBeInTheDocument()
	})
})
