import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import type { GameQueryParameters } from '@/models/api/Game'
import type { RootState } from '@/store'

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		i18n: { language: 'en', resolvedLanguage: 'en' },
		t: (key: string, options?: Record<string, unknown>) => {
			const translations: Record<string, string> = {
				'gallery.bulkToolbar.label': 'Selection actions',
				'gallery.bulkToolbar.autofill': 'Autofill',
				'gallery.bulkToolbar.replaceLabel': 'Replace existing metadata',
				'gallery.bulkToolbar.replaceTitle': 'Allow replacing existing values?',
				'gallery.bulkToolbar.enableReplace': 'Enable Replace',
				'gallery.bulkToolbar.keepExisting': 'Keep existing',
				'gallery.library.filters': 'Filters',
				'gallery.library.applyFilters': 'Apply filters',
				'gallery.library.filterTitle': 'Filter library',
				'gallery.library.resetFilters': 'Reset',
				'gallery.library.viewGames': 'View games',
				'gallery.library.completion': 'Completion',
				'gallery.library.statusLabel': 'Status',
				'gallery.library.moreFilters': 'More filters',
				'gallery.library.onlyFavorites': 'Only my favorites',
				'gallery.library.historyMaximum': 'Estimated story, at most',
				'common.close': 'Close',
				'gallery.library.search': 'Search your library',
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
				'home.filters.fullCompletion': 'Completed',
				'home.filters.allAchievements': '100% total',
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

const loaders = vi.hoisted(() => ({ platforms: vi.fn().mockResolvedValue([{ id: 1, name: 'PC' }]), people: vi.fn().mockResolvedValue([{ id: 1, name: 'Solo' }]), statuses: vi.fn().mockResolvedValue([{ id: 1, name: 'Playing' }]), played: vi.fn().mockResolvedValue([{ id: 1, name: 'Finished' }]) }))
vi.mock('@/hooks', () => ({
	useGamePlatform: () => ({ fetchList: loaders.platforms }),
	useGamePlayWith: () => ({ fetchOptions: loaders.people }),
	useGameStatus: () => ({ fetchActiveStatusList: loaders.statuses }),
	useGamePlayedStatus: () => ({ fetchList: loaders.played }),
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

const renderLoaded = async (...args: Parameters<typeof renderWithProviders>) => {
	const result = renderWithProviders(...args)
	// The real preference thunk and synthetic catalogs must settle before a unit
	// interaction. The hook loader identities remain stable, like the real hooks.
	await waitFor(() => expect(result.store.getState().auth.user?.useScoreColors).toBe(false))
	return result
}

describe('GameFiltersChips', () => {
	const user = userEvent.setup()
	it('puts page size immediately before favorites and completion choices after them, outside More filters', async () => {
		const GameFiltersChips = await loadGameFiltersChips(), onFiltersChange = vi.fn()
		await renderLoaded(<GameFiltersChips filters={{ pageSize: 12, fullCompletion: false }} onFiltersChange={onFiltersChange} onSearchChange={vi.fn()} onSortChange={vi.fn()} />, { preloadedState: defaultState })
		await user.click(screen.getByRole('button', { name: 'Filters' }))
		const page = screen.getByRole('combobox', { name: 'Page size' }), favorite = screen.getByRole('checkbox', { name: 'Only my favorites' }), completion = screen.getByRole('group', { name: 'Completion' })
		expect(page.closest('details')).toBeNull(); expect(completion.closest('details')).toBeNull(); expect(page.closest('label')?.nextElementSibling).toBe(favorite.closest('label')); expect(favorite.closest('label')?.nextElementSibling).toBe(completion)
		expect(page).toHaveValue('12'); expect(screen.getByRole('radio', { name: 'gallery.library.unfinished' })).toBeChecked()
		await user.selectOptions(page, '50'); await user.click(screen.getByRole('radio', { name: '100% total' })); expect(onFiltersChange).not.toHaveBeenCalled()
		await user.click(screen.getByRole('button', { name: 'View games' })); expect(onFiltersChange).toHaveBeenLastCalledWith(expect.objectContaining({ pageSize: 50, page: 1, allAchievements: true, fullCompletion: undefined }))
	})

	it('keeps broad completion and strict 100% as separate mutually exclusive filters', async () => {
		const onFiltersChange = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		const props = { onFiltersChange, onSearchChange: vi.fn(), onSortChange: vi.fn() }
		const { rerender } = await renderLoaded(<GameFiltersChips {...props} filters={{ fullCompletion: true }} />, { preloadedState: defaultState })
		await user.click(screen.getByRole('button', { name: 'Filters' }))
		await user.click(screen.getByRole('radio', { name: '100% total' }))
		expect(onFiltersChange).not.toHaveBeenCalled()
		await user.click(screen.getByRole('button', { name: 'View games' }))
		expect(onFiltersChange).toHaveBeenLastCalledWith(expect.objectContaining({ fullCompletion: undefined, allAchievements: true }))
		rerender(<GameFiltersChips {...props} filters={{ allAchievements: true }} />)
		await user.click(screen.getByRole('button', { name: 'Filters' }))
		await user.click(screen.getByRole('radio', { name: 'Completed' }))
		await user.click(screen.getByRole('button', { name: 'View games' }))
		expect(onFiltersChange).toHaveBeenLastCalledWith(expect.objectContaining({ fullCompletion: true, allAchievements: undefined }))
	})

	it('renders search input', async () => {
		const GameFiltersChips = await loadGameFiltersChips()
		await renderLoaded(<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={vi.fn()} />, { preloadedState: defaultState })

		expect(screen.getByPlaceholderText('Search your library')).toBeInTheDocument()
		const search = screen.getByRole('searchbox', { name: 'Search' })
		expect(search).toHaveAttribute('type', 'search')
		expect(search).toHaveAttribute('autocomplete', 'off')
		expect(search.closest('.game-filters-chips__search-control')).not.toHaveAttribute('title')
		expect(search.closest('.game-filters-chips__search-control')?.querySelector('svg')).toHaveAttribute('stroke-width', '1.7')
		expect(search.closest('.game-filters-chips__search-control')?.querySelector('circle')).toHaveAttribute('r', '6.8')
	})

	it('calls onSearchChange when typing in search input', async () => {
		const onSearchChange = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		await renderLoaded(<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={onSearchChange} onSortChange={vi.fn()} />, {
			preloadedState: defaultState,
		})

		await user.type(screen.getByPlaceholderText('Search your library'), 'dark')

		await waitFor(() => expect(onSearchChange).toHaveBeenCalled())
	})

	it('renders sort select with default Nombre option', async () => {
		const GameFiltersChips = await loadGameFiltersChips()
		await renderLoaded(<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={vi.fn()} />, { preloadedState: defaultState })

		const sortSelect = screen.getByLabelText('Sort by')
		expect(sortSelect).toBeInTheDocument()
		expect(sortSelect).toHaveValue('name')
	})

	it('calls onSortChange when sort select changes', async () => {
		const onSortChange = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		await renderLoaded(<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={onSortChange} />, {
			preloadedState: defaultState,
		})

		await user.selectOptions(screen.getByLabelText('Sort by'), 'grade')

		expect(onSortChange).toHaveBeenCalledWith('grade', false)
	})

	it('orders sort options by the primary collection workflow', async () => {
		const GameFiltersChips = await loadGameFiltersChips()
		await renderLoaded(<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={vi.fn()} />, { preloadedState: defaultState })

		const options = Array.from(screen.getByLabelText('Sort by').querySelectorAll('option')).map((option) => option.value)
		expect(options.slice(0, 8)).toEqual(['status', 'updatedat', 'createdat', 'critic', 'score', 'grade', 'storyDuration', 'completionDuration'])
	})

	it('toggles sort direction when arrow button is clicked', async () => {
		const onSortChange = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		await renderLoaded(<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={onSortChange} />, {
			preloadedState: defaultState,
		})

		const dirBtn = screen.getByTitle('Ascending')
		expect(dirBtn.nextElementSibling).toBe(screen.getByLabelText('Sort by'))
		expect(dirBtn).toHaveAttribute('aria-pressed', 'false')
		expect(dirBtn.querySelector('path')).toHaveAttribute('d', 'M5 5v14 m-3-3 3 3 3-3 M11 6h10 M11 12h7 M11 18h4')
		expect(dirBtn.querySelector('svg')).toHaveAttribute('stroke-width', '1.7')
		await user.click(dirBtn)

		expect(onSortChange).toHaveBeenCalledWith('name', true)
	})

	it('marks the sort direction button as descending when sortDescending is true', async () => {
		const GameFiltersChips = await loadGameFiltersChips()
		const { container } = await renderLoaded(<GameFiltersChips filters={{ sortDescending: true }} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={vi.fn()} />, {
			preloadedState: defaultState,
		})

		const dirBtn = container.querySelector('.game-filters-chips__sort-direction')
		expect(dirBtn).toHaveClass('is-descending')
		expect(dirBtn).toHaveAttribute('aria-pressed', 'true')
		expect(screen.getByTitle('Descending')).toBeInTheDocument()
	})

	it('exposes empty, mixed, and complete page selection with matching icons', async () => {
		const GameFiltersChips = await loadGameFiltersChips()
		const props = { filters: defaultFilters, onFiltersChange: vi.fn(), onSearchChange: vi.fn(), onSortChange: vi.fn(), onSelectAll: vi.fn(), totalCount: 3 }
		const { rerender } = await renderLoaded(<GameFiltersChips {...props} selectedCount={0} />, { preloadedState: defaultState })
		const checkbox = screen.getByRole('checkbox', { name: 'Select all' })
		expect(checkbox).toHaveAttribute('aria-checked', 'false')
		expect(checkbox.querySelectorAll('svg path')).toHaveLength(1)

		rerender(<GameFiltersChips {...props} selectedCount={1} />)
		expect(checkbox).toHaveAttribute('aria-checked', 'mixed')
		expect(checkbox.querySelectorAll('svg path')).toHaveLength(2)
		await user.click(checkbox)
		expect(props.onSelectAll).toHaveBeenCalledOnce()

		rerender(<GameFiltersChips {...props} selectedCount={3} />)
		const selectedCheckbox = screen.getByRole('checkbox', { name: 'Deselect all' })
		expect(selectedCheckbox).toHaveAttribute('aria-checked', 'true')
		expect(selectedCheckbox.querySelectorAll('svg path')).toHaveLength(1)
	})

	it('shows selection controls when selectedCount > 0', async () => {
		const onDeselectAll = vi.fn()
		const onBulkEdit = vi.fn()
		const onBulkDelete = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		await renderLoaded(
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

	it('forwards confirmed Autofill mode and resets it on exact selection changes without changing search or layout controls', async () => {
		const GameFiltersChips = await loadGameFiltersChips(), onBulkAutofill = vi.fn()
		const props = { filters: defaultFilters, onFiltersChange: vi.fn(), onSearchChange: vi.fn(), onSortChange: vi.fn(), onViewModeChange: vi.fn(), viewMode: 'cover' as const, selectedCount: 2, onBulkAutofill }
		const view = await renderLoaded(<GameFiltersChips {...props} selectionKey='owner:1/query:a/11,12' />, { preloadedState: defaultState })
		await user.click(screen.getByRole('button', { name: 'Autofill' }))
		expect(onBulkAutofill).toHaveBeenCalledExactlyOnceWith({ overwrite: false })
		onBulkAutofill.mockClear()
		await user.click(screen.getByRole('checkbox', { name: 'Replace existing metadata' }))
		expect(onBulkAutofill).not.toHaveBeenCalled()
		await user.keyboard('/')
		expect(screen.getByRole('button', { name: 'Keep existing' })).toHaveFocus()
		await user.click(screen.getByRole('button', { name: 'Enable Replace' }))
		expect(onBulkAutofill).not.toHaveBeenCalled()
		await user.click(screen.getByRole('button', { name: 'Autofill' }))
		expect(onBulkAutofill).toHaveBeenCalledExactlyOnceWith({ overwrite: true })
		view.rerender(<GameFiltersChips {...props} selectionKey='owner:1/query:a/21,22' />)
		expect(screen.getByRole('checkbox', { name: 'Replace existing metadata' })).not.toBeChecked()
		expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveAttribute('type', 'search')
		expect(screen.getByRole('button', { name: 'Cards' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Row' })).toBeInTheDocument()
		expect(props.onFiltersChange).not.toHaveBeenCalled(); expect(props.onSearchChange).not.toHaveBeenCalled()
	})

	it('also resets replacement mode on an applied Library query change when the optional selection key is absent', async () => {
		const GameFiltersChips = await loadGameFiltersChips()
		const props = { onFiltersChange: vi.fn(), onSearchChange: vi.fn(), onSortChange: vi.fn(), selectedCount: 2, onBulkAutofill: vi.fn() }
		const view = await renderLoaded(<GameFiltersChips {...props} filters={{ favorite: true }} />, { preloadedState: defaultState })
		await user.click(screen.getByRole('checkbox', { name: 'Replace existing metadata' }))
		await user.click(screen.getByRole('button', { name: 'Enable Replace' }))
		view.rerender(<GameFiltersChips {...props} filters={{ favorite: false }} />)
		expect(screen.getByRole('checkbox', { name: 'Replace existing metadata' })).not.toBeChecked()
		expect(props.onBulkAutofill).not.toHaveBeenCalled()
	})

	it('calls onBulkDelete when Eliminar button is clicked', async () => {
		const onBulkDelete = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		await renderLoaded(
			<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={vi.fn()} selectedCount={2} onBulkDelete={onBulkDelete} />,
			{ preloadedState: defaultState }
		)

		await user.click(screen.getByText('Delete'))

		expect(onBulkDelete).toHaveBeenCalledOnce()
	})

	it('renders view mode toggle buttons when onViewModeChange is provided', async () => {
		const onViewModeChange = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		await renderLoaded(
			<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={vi.fn()} viewMode='card' onViewModeChange={onViewModeChange} />,
			{ preloadedState: defaultState }
		)

		const cardBtn = screen.getByRole('button', { name: 'Cards' })
		expect(cardBtn).toBeInTheDocument()
		expect(cardBtn.className).toContain('is-active')

		await user.click(screen.getByRole('button', { name: 'Row' }))
		expect(onViewModeChange).toHaveBeenCalledWith('row')
	})

	it('toggles advanced filters when button is clicked', async () => {
		const GameFiltersChips = await loadGameFiltersChips()
		await renderLoaded(<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={vi.fn()} />, { preloadedState: defaultState })

		// Advanced filters should not be visible initially
		expect(screen.queryByText('Clear filters')).not.toBeInTheDocument()

		// Click the toggle button
		await user.click(screen.getByRole('button', { name: 'Filters' }))

		expect(screen.getByRole('combobox', { name: 'Platform' })).toBeVisible()
		expect(screen.getByRole('combobox', { name: 'Status' })).toBeVisible()
		expect(screen.getByRole('group', { name: 'Completion' })).toBeVisible()
		await user.click(screen.getByText('More filters'))
		expect(screen.getByText(/Grade:/)).toBeVisible()
	})

	it('keeps primary edits and Reset as a cancellable draft, including manual zero bounds', async () => {
		const onFiltersChange = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		await renderLoaded(<GameFiltersChips filters={{ favorite: true, maxStory: 20 }} onFiltersChange={onFiltersChange} onSearchChange={vi.fn()} onSortChange={vi.fn()} />, { preloadedState: defaultState })
		await user.click(screen.getByRole('button', { name: 'Filters' }))
		await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), '1')
		await user.clear(screen.getByRole('spinbutton', { name: 'Estimated story, at most' }))
		await user.type(screen.getByRole('spinbutton', { name: 'Estimated story, at most' }), '0')
		await user.click(screen.getByRole('button', { name: 'Reset' }))
		expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('')
		expect(onFiltersChange).not.toHaveBeenCalled()
		await user.click(screen.getByRole('button', { name: 'Close' }))
		expect(onFiltersChange).not.toHaveBeenCalled()
		await user.click(screen.getByRole('button', { name: 'Filters' }))
		expect(screen.getByRole('checkbox', { name: 'Only my favorites' })).toBeChecked()
		expect(screen.getByRole('spinbutton', { name: 'Estimated story, at most' })).toHaveValue(20)
		await user.clear(screen.getByRole('spinbutton', { name: 'Estimated story, at most' }))
		await user.type(screen.getByRole('spinbutton', { name: 'Estimated story, at most' }), '0')
		await user.click(screen.getByRole('radio', { name: 'gallery.library.unfinished' }))
		await user.click(screen.getByRole('button', { name: 'View games' }))
		expect(onFiltersChange).toHaveBeenLastCalledWith(expect.objectContaining({ favorite: true, maxStory: 0, fullCompletion: false, allAchievements: undefined }))
	})

	it('closes an advanced filter popover with Escape without closing the draft sheet', async () => {
		const GameFiltersChips = await loadGameFiltersChips()
		await renderLoaded(<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={vi.fn()} />, { preloadedState: defaultState })
		await user.click(screen.getByRole('button', { name: 'Filters' }))
		await user.click(screen.getByText('More filters'))
		const grade = screen.getByRole('button', { name: 'Grade: Any' })
		await user.click(grade)
		expect(screen.getByText('Grade', { selector: 'strong' })).toBeVisible()
		await user.keyboard('{Escape}')
		expect(screen.queryByText('Grade', { selector: 'strong' })).not.toBeInTheDocument()
		expect(screen.getByRole('dialog', { name: 'Filter library' })).toBeVisible()
		expect(grade).toHaveFocus()
	})

	it('renders Exportar button when onBulkExport is provided and items selected', async () => {
		const onBulkExport = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		await renderLoaded(
			<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={vi.fn()} selectedCount={1} onBulkExport={onBulkExport} />,
			{ preloadedState: defaultState }
		)

		await user.click(screen.getByText('Export'))
		expect(onBulkExport).toHaveBeenCalledOnce()
	})

	it('calls onBulkRefreshImages with the selected image field', async () => {
		const onBulkRefreshImages = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		await renderLoaded(
			<GameFiltersChips
				filters={defaultFilters}
				onFiltersChange={vi.fn()}
				onSearchChange={vi.fn()}
				onSortChange={vi.fn()}
				selectedCount={2}
				onBulkRefreshImages={onBulkRefreshImages}
			/>,
			{ preloadedState: defaultState }
		)

		await user.selectOptions(screen.getByLabelText('Image to refresh'), 'hero')
		await user.click(screen.getByText('Refresh image'))

		expect(onBulkRefreshImages).toHaveBeenCalledWith('hero')
	})

	it('renders "Seleccionar todos" button when onSelectAll provided', async () => {
		const onSelectAll = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		await renderLoaded(<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={vi.fn()} onSelectAll={onSelectAll} />, {
			preloadedState: defaultState,
		})

		const btn = screen.getByText('Select all')
		await user.click(btn)
		expect(onSelectAll).toHaveBeenCalledOnce()
	})
})
