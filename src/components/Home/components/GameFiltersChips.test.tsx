import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import type { GameQueryParameters } from '@/models/api/Game'
import type { RootState } from '@/store'

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, options?: Record<string, unknown>) => {
			const translations: Record<string, string> = {
				'common.all': 'All',
				'common.any': 'Any',
				'common.clear': 'Clear',
				'common.default': 'Default',
				'common.max': 'Max',
				'common.min': 'Min',
				'home.chips.bulkDelete': 'Delete',
				'home.chips.bulkEdit': 'Edit',
				'home.chips.bulkExport': 'Export',
				'home.chips.bulkImageField': 'Image to refresh',
				'home.chips.bulkImages': 'Refresh image',
				'home.chips.bulkImagesRefreshing': 'Refreshing...',
				'home.chips.deselect': 'Deselect',
				'home.chips.searchLabel': 'Search',
				'home.chips.selected': '{{count}} selected',
				'home.chips.sortCompletion': 'Completion',
				'home.chips.sortStory': 'Story',
				'home.chips.yearPlaceholder': 'Year',
				'home.deselectAll': 'Deselect all',
				'home.filters.advancedFilters': 'Advanced filters',
				'home.filters.anyYear': 'Any year',
				'home.filters.cheaperByKey': 'Cheaper by key',
				'home.filters.cheaperByStore': 'Cheaper by store',
				'home.filters.clearFilters': 'Clear filters',
				'home.filters.closeFilters': 'Close filters',
				'home.filters.defaultPageSize': '{{size}} per page',
				'home.filters.excludeReplayDatesShort': 'excluding replays',
				'home.filters.exclusions': 'Exclusions',
				'home.filters.exclusionsCount': '{{count}} exclusions',
				'home.filters.fieldCreatedAt': 'Created',
				'home.filters.fieldCritic': 'Critic',
				'home.filters.fieldGrade': 'Grade',
				'home.filters.fieldName': 'Name',
				'home.filters.fieldReleased': 'Release Date',
				'home.filters.fieldScore': 'Score',
				'home.filters.fieldStarted': 'Start Date',
				'home.filters.fieldUpdatedAt': 'Updated',
				'home.filters.finished': 'Finished',
				'home.filters.gamesPerPage': '{{size}} games per page',
				'home.filters.grade': 'Grade',
				'home.filters.gradeFrom': 'From {{value}}',
				'home.filters.gradeTo': 'To {{value}}',
				'home.filters.noExclusions': 'No exclusions',
				'home.filters.noType': 'No type',
				'home.filters.page': 'Page',
				'home.filters.pageSize': 'Page size',
				'home.filters.platform': 'Platform',
				'home.filters.playWith': 'Play with',
				'home.filters.playedStatus': 'Played status',
				'home.filters.price': 'Price',
				'home.filters.provider': 'Provider',
				'home.filters.replay': 'Replay',
				'home.filters.replayFinished': 'Replay finished',
				'home.filters.replayFinishedYear': 'Finished {{year}}',
				'home.filters.replayGrade': 'Replay grade',
				'home.filters.replayStarted': 'Replay started',
				'home.filters.replayStartedYear': 'Started {{year}}',
				'home.filters.replayType': 'Replay type',
				'home.filters.showIncomplete': 'Show incomplete',
				'home.filters.sortBy': 'Sort by',
				'home.filters.status': 'Status',
				'home.filters.withReplays': 'With replays',
				'home.filters.withoutReplays': 'Without replays',
				'home.filters.years': 'Years',
				'home.columns.comment': 'Comment',
				'home.columns.finished': 'Finished',
				'home.imageFields.cover': 'Cover art',
				'home.imageFields.hero': 'Hero',
				'home.imageFields.logo': 'Logo',
				'home.searchPlaceholder': 'Search games…',
				'home.selectAll': 'Select all',
				'home.sorting.ascending': 'Ascending',
				'home.sorting.descending': 'Descending',
				'home.view': 'View',
				'home.viewCard': 'Cards',
				'home.viewDefault': 'Default',
				'home.viewRow': 'Row',
			}

			return (translations[key] ?? key)
				.replace('{{count}}', String(options?.count ?? ''))
				.replace('{{size}}', String(options?.size ?? ''))
				.replace('{{value}}', String(options?.value ?? ''))
				.replace('{{year}}', String(options?.year ?? ''))
		},
	}),
}))

vi.mock('@/hooks', () => ({
	useGamePlatform: () => ({ fetchList: vi.fn().mockResolvedValue([{ id: 1, name: 'PC' }]) }),
	useGamePlayWith: () => ({ fetchOptions: vi.fn().mockResolvedValue([{ id: 1, name: 'Solo' }]) }),
	useGameStatus: () => ({ fetchActiveStatusList: vi.fn().mockResolvedValue([{ id: 1, name: 'Playing' }]) }),
	useGamePlayedStatus: () => ({ fetchList: vi.fn().mockResolvedValue([{ id: 1, name: 'Finished' }]) }),
}))

vi.mock('@/services/GameReplayTypeService', () => ({
	getActiveGameReplayTypes: vi.fn().mockResolvedValue([{ id: 1, name: 'New Game+' }]),
}))

vi.mock('./GameFiltersChips.scss', () => ({}))

const defaultFilters: GameQueryParameters = {}

const defaultState: Partial<RootState> = {
	auth: {
		user: { id: 1, username: 'test' },
		token: 'tok',
			refreshToken: null,
		isLoggedIn: true,
		loading: false,
		error: null,
		preferences: null,
		preferencesLoading: false,
		preferencesError: null,
	} as any,
}

async function loadGameFiltersChips() {
	const mod = await import('./GameFiltersChips')
	return mod.default
}

describe('GameFiltersChips', () => {
	const user = userEvent.setup()

	it('renders search input', async () => {
		const GameFiltersChips = await loadGameFiltersChips()
		renderWithProviders(<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={vi.fn()} />, { preloadedState: defaultState })

		expect(screen.getByPlaceholderText('Search games…')).toBeInTheDocument()
	})

	it('calls onSearchChange when typing in search input', async () => {
		const onSearchChange = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		renderWithProviders(<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={onSearchChange} onSortChange={vi.fn()} />, {
			preloadedState: defaultState,
		})

		await user.type(screen.getByPlaceholderText('Search games…'), 'dark')

		await waitFor(() => expect(onSearchChange).toHaveBeenCalled())
	})

	it('renders sort select with default Nombre option', async () => {
		const GameFiltersChips = await loadGameFiltersChips()
		renderWithProviders(<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={vi.fn()} />, { preloadedState: defaultState })

		const sortSelect = screen.getByLabelText('Sort by')
		expect(sortSelect).toBeInTheDocument()
		expect(sortSelect).toHaveValue('name')
	})

	it('calls onSortChange when sort select changes', async () => {
		const onSortChange = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		renderWithProviders(<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={onSortChange} />, {
			preloadedState: defaultState,
		})

		await user.selectOptions(screen.getByLabelText('Sort by'), 'grade')

		expect(onSortChange).toHaveBeenCalledWith('grade', false)
	})

	it('toggles sort direction when arrow button is clicked', async () => {
		const onSortChange = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		renderWithProviders(<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={onSortChange} />, {
			preloadedState: defaultState,
		})

		const dirBtn = screen.getByTitle('Ascending')
		await user.click(dirBtn)

		expect(onSortChange).toHaveBeenCalledWith('name', true)
	})

	it('marks the sort direction button as descending when sortDescending is true', async () => {
		const GameFiltersChips = await loadGameFiltersChips()
		const { container } = renderWithProviders(<GameFiltersChips filters={{ sortDescending: true }} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={vi.fn()} />, {
			preloadedState: defaultState,
		})

		const dirBtn = container.querySelector('.game-filters-chips__sort-direction')
		expect(dirBtn).toHaveClass('is-descending')
		expect(screen.getByTitle('Descending')).toBeInTheDocument()
	})

	it('shows selection controls when selectedCount > 0', async () => {
		const onDeselectAll = vi.fn()
		const onBulkEdit = vi.fn()
		const onBulkDelete = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		renderWithProviders(
			<GameFiltersChips
				filters={defaultFilters}
				onFiltersChange={vi.fn()}
				onSearchChange={vi.fn()}
				onSortChange={vi.fn()}
				selectedCount={3}
				onDeselectAll={onDeselectAll}
				onBulkEdit={onBulkEdit}
				onBulkDelete={onBulkDelete}
			/>,
			{ preloadedState: defaultState }
		)

		expect(screen.getByText('3 selected')).toBeInTheDocument()
		expect(screen.getByText('Deselect')).toBeInTheDocument()
		expect(screen.getByText('Edit')).toBeInTheDocument()
		expect(screen.getByText('Delete')).toBeInTheDocument()
	})

	it('calls onBulkDelete when Eliminar button is clicked', async () => {
		const onBulkDelete = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		renderWithProviders(
			<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={vi.fn()} selectedCount={2} onBulkDelete={onBulkDelete} />,
			{ preloadedState: defaultState }
		)

		await user.click(screen.getByText('Delete'))

		expect(onBulkDelete).toHaveBeenCalledOnce()
	})

	it('renders view mode toggle buttons when onViewModeChange is provided', async () => {
		const onViewModeChange = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		renderWithProviders(
			<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={vi.fn()} viewMode='card' onViewModeChange={onViewModeChange} />,
			{ preloadedState: defaultState }
		)

		const cardBtn = screen.getByText('Cards')
		expect(cardBtn).toBeInTheDocument()
		expect(cardBtn.className).toContain('is-active')

		await user.click(screen.getByText('Row'))
		expect(onViewModeChange).toHaveBeenCalledWith('row')
	})

	it('toggles advanced filters when button is clicked', async () => {
		const GameFiltersChips = await loadGameFiltersChips()
		renderWithProviders(<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={vi.fn()} />, { preloadedState: defaultState })

		// Advanced filters should not be visible initially
		expect(screen.queryByText('Clear filters')).not.toBeInTheDocument()

		// Click the toggle button
		await user.click(screen.getByText('⚙ Advanced filters'))

		// Advanced filter chips should now be visible
		expect(screen.getByText(/Platform:/)).toBeInTheDocument()
		expect(screen.getByText(/Status:/)).toBeInTheDocument()
		expect(screen.getByText(/Grade:/)).toBeInTheDocument()
	})

	it('renders Exportar button when onBulkExport is provided and items selected', async () => {
		const onBulkExport = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		renderWithProviders(
			<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={vi.fn()} selectedCount={1} onBulkExport={onBulkExport} />,
			{ preloadedState: defaultState }
		)

		await user.click(screen.getByText('Export'))
		expect(onBulkExport).toHaveBeenCalledOnce()
	})

	it('calls onBulkRefreshImages with the selected image field', async () => {
		const onBulkRefreshImages = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		renderWithProviders(
			<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={vi.fn()} selectedCount={2} onBulkRefreshImages={onBulkRefreshImages} />,
			{ preloadedState: defaultState }
		)

		await user.selectOptions(screen.getByLabelText('Image to refresh'), 'hero')
		await user.click(screen.getByText('Refresh image'))

		expect(onBulkRefreshImages).toHaveBeenCalledWith('hero')
	})

	it('renders "Seleccionar todos" button when onSelectAll provided', async () => {
		const onSelectAll = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		renderWithProviders(<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={vi.fn()} onSelectAll={onSelectAll} />, {
			preloadedState: defaultState,
		})

		const btn = screen.getByText('Select all')
		await user.click(btn)
		expect(onSelectAll).toHaveBeenCalledOnce()
	})
})
