import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import type { RootState } from '@/store'

const mockGames = [
	{ id: 1, name: 'Dark Souls', statusId: 1, platformId: 1 },
	{ id: 2, name: 'Hollow Knight', statusId: 2, platformId: 2 },
	{ id: 3, name: 'Celeste', statusId: 1, platformId: 1 },
]

let currentGames: any[] = mockGames
const mockPagination = { page: 1, pageSize: 50, totalCount: 3, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
let currentPagination = mockPagination
const mockFetchGamesList = vi.fn().mockResolvedValue(undefined)
const mockRefreshGames = vi.fn().mockResolvedValue(undefined)
const mockDeleteGameById = vi.fn().mockResolvedValue(undefined)
const mockBulkUpdateGamesById = vi.fn().mockResolvedValue({ updatedCount: 2, totalRequested: 2 })
const mockLoadPublicGameViews = vi.fn().mockResolvedValue(undefined)

vi.mock('@/hooks', () => ({
	useGames: () => ({
		games: currentGames,
		error: null,
		pagination: currentPagination,
		fetchGamesList: mockFetchGamesList,
		refreshGames: mockRefreshGames,
		deleteGameById: mockDeleteGameById,
		bulkUpdateGamesById: mockBulkUpdateGamesById,
	}),
	useGameViews: () => ({
		publicGameViews: [],
		loadPublicGameViews: mockLoadPublicGameViews,
	}),
	useGameStatus: () => ({ fetchActiveStatusList: vi.fn() }),
	useGamePlatform: () => ({ fetchList: vi.fn(), fetchActiveList: vi.fn() }),
	useGamePlayWith: () => ({ fetchOptions: vi.fn(), fetchActiveOptions: vi.fn() }),
	useGamePlayedStatus: () => ({ fetchList: vi.fn(), fetchActiveList: vi.fn() }),
}))

vi.mock('./GameFiltersChips', () => ({
	default: (props: any) => (
		<div data-testid='game-filters-chips'>
			<button data-testid='search-trigger' onClick={() => props.onSearchChange('test')}>
				Search
			</button>
			<button data-testid='sort-trigger' onClick={() => props.onSortChange('name', false)}>
				Sort
			</button>
			<button data-testid='view-card' onClick={() => props.onViewModeChange('card')}>
				Card
			</button>
			<button data-testid='view-row' onClick={() => props.onViewModeChange('row')}>
				Row
			</button>
			<button data-testid='select-all' onClick={props.onSelectAll}>
				Select All
			</button>
			<button data-testid='deselect-all' onClick={props.onDeselectAll}>
				Deselect
			</button>
			<button data-testid='bulk-delete' onClick={props.onBulkDelete}>
				Bulk Delete
			</button>
			<button data-testid='bulk-edit' onClick={props.onBulkEdit}>
				Bulk Edit
			</button>
			<span data-testid='selected-count'>{props.selectedCount}</span>
		</div>
	),
}))

vi.mock('./SelectiveExportModal', () => ({
	default: () => null,
}))

vi.mock('@/components/elements', () => ({
	Button: ({ title, onPress }: any) => <button onClick={onPress}>{title}</button>,
	GameCard: ({ game, onSelect, isSelected, onDelete }: any) => (
		<div data-testid={`game-card-${game.id}`}>
			<span>{game.name}</span>
			<input type='checkbox' checked={isSelected} onChange={(e) => onSelect(game.id, e.target.checked)} data-testid={`select-${game.id}`} />
			<button onClick={onDelete} data-testid={`delete-${game.id}`}>
				Delete
			</button>
		</div>
	),
}))

const defaultState: Partial<RootState> = {
	theme: {
		currentTheme: 'dark',
		cardStyle: 'row',
		viewMode: 'default',
		availableThemes: [],
	},
	games: {
		games: mockGames as any,
		currentGame: null,
		loading: false,
		error: null,
		pagination: mockPagination,
		filters: { page: 1, pageSize: 50, sortBy: 'name', sortDescending: false },
		lastAppliedFilters: { page: 1, pageSize: 50, sortBy: 'name', sortDescending: false },
		isDataFresh: true,
		needsRefresh: false,
	},
}

describe('HomeComponent', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		currentGames = mockGames
		currentPagination = mockPagination
	})

	// Import dynamically so mocks are applied
	const loadHomeComponent = async () => {
		const mod = await import('./HomeComponent')
		return mod.default
	}

	it('renders the game list with game names', async () => {
		const HomeComponent = await loadHomeComponent()
		renderWithProviders(<HomeComponent />, { preloadedState: defaultState })

		expect(screen.getByText('Dark Souls')).toBeInTheDocument()
		expect(screen.getByText('Hollow Knight')).toBeInTheDocument()
		expect(screen.getByText('Celeste')).toBeInTheDocument()
	})

	it('renders "No games found." when game list is empty', async () => {
		currentGames = []
		currentPagination = { ...mockPagination, totalCount: 0, totalPages: 0 }

		const HomeComponent = await loadHomeComponent()
		renderWithProviders(<HomeComponent />, { preloadedState: defaultState })

		expect(screen.getByText('No games found.')).toBeInTheDocument()
	})

	it('renders pagination controls with page info', async () => {
		const HomeComponent = await loadHomeComponent()
		renderWithProviders(<HomeComponent />, { preloadedState: defaultState })

		expect(screen.getByText(/Página 1 de 1/)).toBeInTheDocument()
		expect(screen.getByText(/3 juegos/)).toBeInTheDocument()
	})

	it('disables prev button on first page', async () => {
		const HomeComponent = await loadHomeComponent()
		renderWithProviders(<HomeComponent />, { preloadedState: defaultState })

		const prevButton = screen.getByText('<')
		expect(prevButton).toBeDisabled()
	})

	it('disables next button on last page', async () => {
		const HomeComponent = await loadHomeComponent()
		renderWithProviders(<HomeComponent />, { preloadedState: defaultState })

		const nextButton = screen.getByText('>')
		expect(nextButton).toBeDisabled()
	})

	it('renders the GameFiltersChips component', async () => {
		const HomeComponent = await loadHomeComponent()
		renderWithProviders(<HomeComponent />, { preloadedState: defaultState })

		expect(screen.getByTestId('game-filters-chips')).toBeInTheDocument()
	})

	it('toggles game selection via checkbox', async () => {
		const user = userEvent.setup()
		const HomeComponent = await loadHomeComponent()
		renderWithProviders(<HomeComponent />, { preloadedState: defaultState })

		const checkbox = screen.getByTestId('select-1')
		await user.click(checkbox)

		expect(screen.getByTestId('selected-count')).toHaveTextContent('1')
	})

	it('dispatches card style change when view mode toggle is clicked', async () => {
		const user = userEvent.setup()
		const HomeComponent = await loadHomeComponent()
		const { store } = renderWithProviders(<HomeComponent />, { preloadedState: defaultState })

		await user.click(screen.getByTestId('view-card'))
		expect(store.getState().theme.cardStyle).toBe('card')
	})

	it('calls deleteGameById with confirm when delete button is clicked', async () => {
		const user = userEvent.setup()
		vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
		const HomeComponent = await loadHomeComponent()
		renderWithProviders(<HomeComponent />, { preloadedState: defaultState })

		await user.click(screen.getByTestId('delete-1'))

		expect(globalThis.confirm).toHaveBeenCalled()
		expect(mockDeleteGameById).toHaveBeenCalledWith(1)
	})

	it('does not delete game when confirm is cancelled', async () => {
		const user = userEvent.setup()
		vi.spyOn(globalThis, 'confirm').mockReturnValue(false)
		const HomeComponent = await loadHomeComponent()
		renderWithProviders(<HomeComponent />, { preloadedState: defaultState })

		await user.click(screen.getByTestId('delete-1'))

		expect(mockDeleteGameById).not.toHaveBeenCalled()
	})

	it('renders row header columns when cardStyle is row', async () => {
		const HomeComponent = await loadHomeComponent()
		renderWithProviders(<HomeComponent />, { preloadedState: defaultState })

		expect(screen.getByText('Status')).toBeInTheDocument()
		expect(screen.getByText('Name')).toBeInTheDocument()
		expect(screen.getByText('Grade')).toBeInTheDocument()
		expect(screen.getByText('Platform')).toBeInTheDocument()
	})
})
