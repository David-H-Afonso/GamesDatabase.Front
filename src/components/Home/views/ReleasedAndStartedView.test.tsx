import { render, screen } from '@testing-library/react'
import ReleasedAndStartedView from './ReleasedAndStartedView'

const mockRefreshGames = vi.fn().mockResolvedValue([])

vi.mock('@/hooks', () => ({
	useGames: () => ({ refreshGames: mockRefreshGames, filters: {} }),
}))

vi.mock('@/components/elements', () => ({
	GameCard: ({ game }: any) => <div data-testid='game-card'>{game.name}</div>,
}))

describe('ReleasedAndStartedView', () => {
	beforeEach(() => vi.clearAllMocks())

	it('renders heading', () => {
		render(<ReleasedAndStartedView />)
		expect(screen.getByText('Released and Started (2025)')).toBeInTheDocument()
	})

	it('calls refreshGames on mount with year filters', () => {
		render(<ReleasedAndStartedView />)
		expect(mockRefreshGames).toHaveBeenCalledWith(expect.objectContaining({ releasedYear: 2025, startedYear: 2025 }))
	})

	it('renders game cards when data is returned', async () => {
		mockRefreshGames.mockResolvedValue([{ id: 1, name: 'Zelda' }])
		render(<ReleasedAndStartedView />)
		expect(await screen.findByText('Zelda')).toBeInTheDocument()
	})
})
