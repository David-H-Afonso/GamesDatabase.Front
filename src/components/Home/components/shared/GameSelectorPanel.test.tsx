import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import GameSelectorPanel from './GameSelectorPanel'
import { getGames } from '@/services/GamesService'

vi.mock('@/services/GamesService', () => ({
	getGames: vi.fn(),
}))

vi.mock('./GameSelectorPanel.scss', () => ({}))

const mockGetGames = vi.mocked(getGames)

describe('GameSelectorPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.useFakeTimers({ shouldAdvanceTime: true })
	})

	afterEach(() => vi.useRealTimers())

	it('renders search input and panel titles', () => {
		render(<GameSelectorPanel selectedGames={[]} onSelectionChange={vi.fn()} />)
		expect(screen.getByPlaceholderText('Type a game name…')).toBeInTheDocument()
		expect(screen.getByText('Search & Add Games')).toBeInTheDocument()
	})

	it('shows "No games selected yet." when selection is empty', () => {
		render(<GameSelectorPanel selectedGames={[]} onSelectionChange={vi.fn()} />)
		expect(screen.getByText('No games selected yet.')).toBeInTheDocument()
	})

	it('renders selected games with remove buttons', () => {
		const selected = [
			{ id: 1, name: 'Zelda' },
			{ id: 2, name: 'Mario' },
		]
		render(<GameSelectorPanel selectedGames={selected} onSelectionChange={vi.fn()} />)
		expect(screen.getByText('Zelda')).toBeInTheDocument()
		expect(screen.getByText('Mario')).toBeInTheDocument()
		expect(screen.getByLabelText('Remove Zelda')).toBeInTheDocument()
	})

	it('calls onSelectionChange when removing a game', () => {
		const onSelectionChange = vi.fn()
		const selected = [
			{ id: 1, name: 'Zelda' },
			{ id: 2, name: 'Mario' },
		]
		render(<GameSelectorPanel selectedGames={selected} onSelectionChange={onSelectionChange} />)
		fireEvent.click(screen.getByLabelText('Remove Zelda'))
		expect(onSelectionChange).toHaveBeenCalledWith([{ id: 2, name: 'Mario' }])
	})

	it('searches games after debounce', async () => {
		mockGetGames.mockResolvedValue({ data: [{ id: 3, name: 'Halo' }], totalCount: 1 } as any)
		render(<GameSelectorPanel selectedGames={[]} onSelectionChange={vi.fn()} />)

		fireEvent.change(screen.getByPlaceholderText('Type a game name…'), { target: { value: 'Halo' } })

		await act(async () => {
			vi.advanceTimersByTime(300)
		})

		await waitFor(() => {
			expect(mockGetGames).toHaveBeenCalledWith(expect.objectContaining({ search: 'Halo' }))
		})
	})

	it('adds a game from search results', async () => {
		mockGetGames.mockResolvedValue({ data: [{ id: 3, name: 'Halo' }], totalCount: 1 } as any)
		const onSelectionChange = vi.fn()
		render(<GameSelectorPanel selectedGames={[]} onSelectionChange={onSelectionChange} />)

		fireEvent.change(screen.getByPlaceholderText('Type a game name…'), { target: { value: 'Halo' } })

		await act(async () => {
			vi.advanceTimersByTime(300)
		})

		await waitFor(() => {
			expect(screen.getByText('Halo')).toBeInTheDocument()
		})

		fireEvent.click(screen.getByText('Halo'))
		expect(onSelectionChange).toHaveBeenCalledWith([{ id: 3, name: 'Halo' }])
	})

	it('shows selected count', () => {
		const selected = [{ id: 1, name: 'Zelda' }]
		render(<GameSelectorPanel selectedGames={selected} onSelectionChange={vi.fn()} />)
		expect(screen.getByText('1')).toBeInTheDocument()
	})

	it('merges preSelectedGames on mount', () => {
		const onSelectionChange = vi.fn()
		render(<GameSelectorPanel selectedGames={[{ id: 1, name: 'Zelda' }]} onSelectionChange={onSelectionChange} preSelectedGames={[{ id: 2, name: 'Mario' }]} />)
		expect(onSelectionChange).toHaveBeenCalledWith([
			{ id: 1, name: 'Zelda' },
			{ id: 2, name: 'Mario' },
		])
	})

	it('shows "No games found." when search returns empty', async () => {
		mockGetGames.mockResolvedValue({ data: [], totalCount: 0 } as any)
		render(<GameSelectorPanel selectedGames={[]} onSelectionChange={vi.fn()} />)

		fireEvent.change(screen.getByPlaceholderText('Type a game name…'), { target: { value: 'xyz' } })

		await act(async () => {
			vi.advanceTimersByTime(300)
		})

		await waitFor(() => {
			expect(screen.getByText('No games found.')).toBeInTheDocument()
		})
	})
})
