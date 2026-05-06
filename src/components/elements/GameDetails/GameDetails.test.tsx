import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import type { Game } from '@/models/api/Game'
import type { RootState } from '@/store'

const mockUpdateGameById = vi.fn().mockResolvedValue(undefined)

vi.mock('@/hooks', () => ({
	useGames: () => ({
		updateGameById: mockUpdateGameById,
	}),
}))

vi.mock('@/components/elements', () => ({
	EditableField: ({ value, placeholder }: any) => <span data-testid='editable-field'>{value || placeholder}</span>,
	OptimizedImage: ({ alt }: any) => <img alt={alt} />,
}))

vi.mock('../EditableSelect/EditableSelect', () => ({
	EditableSelect: ({ displayValue, placeholder }: any) => <span data-testid='editable-select'>{displayValue || placeholder}</span>,
}))

vi.mock('../EditableMultiSelect/EditableMultiSelect', () => ({
	EditableMultiSelect: ({ displayValues, placeholder }: any) => (
		<span data-testid='editable-multi-select'>{displayValues?.length > 0 ? displayValues.join(', ') : placeholder}</span>
	),
}))

vi.mock('./GameReplaysTab', () => ({
	GameReplaysTab: () => <div data-testid='replays-tab'>Replays content</div>,
}))

vi.mock('./GameHistoryTab', () => ({
	GameHistoryTab: () => <div data-testid='history-tab'>History content</div>,
}))

vi.mock('@/assets/svgs/trashbin.svg?react', () => ({
	default: (props: any) => <svg data-testid='delete-icon' {...props} />,
}))

vi.mock('./GameDetails.scss', () => ({}))

vi.mock('@/utils', () => ({
	formatToLocaleDate: (val: string) => val,
	useClickOutside: () => ({ current: null }),
	DEFAULT_PAGE_SIZE: 50,
}))

vi.mock('@/helpers/criticScoreHelper', () => ({
	getCriticScoreUrl: vi.fn(),
	getCriticProviderIdFromName: vi.fn(),
	getCriticProviderNameFromId: vi.fn(),
	resolveEffectiveProvider: vi.fn(),
}))

const mockGame: Game = {
	id: 1,
	name: 'Dark Souls',
	statusId: 1,
	statusName: 'Playing',
	platformId: 1,
	platformName: 'PC',
	playedStatusId: 1,
	playedStatusName: 'Finished',
	playWithIds: [1],
	playWithNames: ['Solo'],
	released: '2011-09-22',
	started: '2023-01-01',
	finished: '2023-03-01',
	critic: 89,
	grade: 95,
	story: 40,
	completion: 80,
	score: 92,
	logo: 'https://example.com/logo.png',
	cover: 'https://example.com/cover.png',
	comment: 'Excellent game',
	isCheaperByKey: true,
	keyStoreUrl: 'https://example.com/key',
} as any

const defaultState: Partial<RootState> = {
	gameStatus: { activeStatuses: [{ id: 1, name: 'Playing', color: '#00f' }] } as any,
	gamePlatform: { platforms: [{ id: 1, name: 'PC' }] } as any,
	gamePlayedStatus: { playedStatuses: [{ id: 1, name: 'Finished' }] } as any,
	gamePlayWith: { playWithOptions: [{ id: 1, name: 'Solo' }] } as any,
	auth: { user: { scoreProvider: 'Metacritic' } } as any,
}

describe('GameDetails', () => {
	const user = userEvent.setup()

	beforeEach(() => {
		vi.clearAllMocks()
		vi.useFakeTimers({ shouldAdvanceTime: true })
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('renders the game name', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		expect(screen.getByText('Game details: Dark Souls')).toBeInTheDocument()
	})

	it('renders info tab by default with section headers', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		expect(screen.getByText('Status')).toBeInTheDocument()
		expect(screen.getByText('Released')).toBeInTheDocument()
		expect(screen.getByText('Critic Score')).toBeInTheDocument()
		expect(screen.getByText('Platform')).toBeInTheDocument()
		expect(screen.getByText('Grade')).toBeInTheDocument()
		expect(screen.getByText('Comment')).toBeInTheDocument()
	})

	it('switches to replays tab when clicked', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		await user.click(screen.getByText('Rejugadas'))

		expect(screen.getByTestId('replays-tab')).toBeInTheDocument()
		expect(screen.queryByText('Status')).not.toBeInTheDocument()
	})

	it('switches to history tab when clicked', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		await user.click(screen.getByText('Historial'))

		expect(screen.getByTestId('history-tab')).toBeInTheDocument()
	})

	it('calls onDelete when delete button is clicked', async () => {
		const onDelete = vi.fn()
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} onDelete={onDelete} />, { preloadedState: defaultState })

		await user.click(screen.getByLabelText('Delete game'))

		expect(onDelete).toHaveBeenCalledWith(mockGame)
	})

	it('calls closeDetails after animation when close button is clicked', async () => {
		const closeDetails = vi.fn()
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={closeDetails} />, { preloadedState: defaultState })

		await user.click(screen.getByLabelText('Close details'))

		expect(closeDetails).not.toHaveBeenCalled()

		vi.advanceTimersByTime(300)

		expect(closeDetails).toHaveBeenCalledOnce()
	})

	it('renders cover and logo images when provided', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		expect(screen.getByAltText('Dark Souls logo')).toBeInTheDocument()
		expect(screen.getByAltText('Dark Souls cover')).toBeInTheDocument()
	})

	it('renders Key URL field when isCheaperByKey is set', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		expect(screen.getByText('Key URL')).toBeInTheDocument()
	})

	it('shows tab navigation buttons', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		expect(screen.getByText('Info')).toBeInTheDocument()
		expect(screen.getByText('Rejugadas')).toBeInTheDocument()
		expect(screen.getByText('Historial')).toBeInTheDocument()
	})

	it('does not render logo when game.logo is empty', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={{ ...mockGame, logo: '' }} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		expect(screen.queryByAltText('Dark Souls logo')).not.toBeInTheDocument()
	})

	it('does not render cover when game.cover is empty', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={{ ...mockGame, cover: '' }} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		expect(screen.queryByAltText('Dark Souls cover')).not.toBeInTheDocument()
	})

	it('renders editable fields for the game', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		const editableFields = screen.getAllByTestId('editable-field')
		expect(editableFields.length).toBeGreaterThanOrEqual(5)
	})

	it('renders editable selects for status, platform, played status', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		const editableSelects = screen.getAllByTestId('editable-select')
		expect(editableSelects.length).toBeGreaterThanOrEqual(3)
	})

	it('renders multi-select for play with options', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		expect(screen.getByTestId('editable-multi-select')).toBeInTheDocument()
	})

	it('does not call onDelete when onDelete is not provided', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		// Should not throw when clicking delete without onDelete
		await user.click(screen.getByLabelText('Delete game'))
	})

	it('adds closing class when close button clicked', async () => {
		const { GameDetails } = await import('./GameDetails')
		const { container } = renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		await user.click(screen.getByLabelText('Close details'))

		const panel = container.querySelector('.game-details')
		expect(panel?.classList.contains('closing')).toBe(true)
	})
})
