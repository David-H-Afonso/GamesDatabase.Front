import { act, render, screen } from '@testing-library/react'
import StartedOrStatusView from './StartedOrStatusView'

const mockRefreshGames = vi.fn().mockResolvedValue([])
const filters = {}

vi.mock('@/hooks', () => ({
	useGames: () => ({ refreshGames: mockRefreshGames, filters }),
}))

vi.mock('@/components/elements', () => ({
	GameCard: ({ game }: any) => <div data-testid='game-card'>{game.name}</div>,
}))

describe('StartedOrStatusView', () => {
	beforeEach(() => vi.clearAllMocks())

	it('renders heading', async () => {
		await act(async () => { render(<StartedOrStatusView />); await mockRefreshGames.mock.results.at(-1)?.value })
		expect(screen.getByText("Started in 2025 or Status 'Games 2025'")).toBeInTheDocument()
	})

	it('calls refreshGames on mount with year filter', async () => {
		await act(async () => { render(<StartedOrStatusView />); await mockRefreshGames.mock.results.at(-1)?.value })
		expect(mockRefreshGames).toHaveBeenCalledWith(expect.objectContaining({ startedYear: 2025 }))
	})

	it('renders game cards when data is returned', async () => {
		mockRefreshGames.mockResolvedValue([{ id: 1, name: 'Mario' }])
		render(<StartedOrStatusView />)
		expect(await screen.findByText('Mario')).toBeInTheDocument()
	})
})
