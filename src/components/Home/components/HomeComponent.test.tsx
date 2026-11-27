import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import type { RootState } from '@/store'
import { invalidateCollection } from '@/services/CollectionService/collectionEvents'

vi.mock('react-i18next', () => {
	const translation = {
		t: (key: string, options?: Record<string, unknown>) => {
			const translations: Record<string, string> = {
				'home.bulkUpdateSuccess': '{{updated}} of {{total}} games updated',
				'home.columns.comment': 'Comment',
				'home.columns.completion': 'Completion',
				'home.columns.critic': 'Critic',
				'home.columns.finished': 'Finished',
				'home.columns.grade': 'Grade',
				'home.columns.name': 'Name',
				'home.columns.platform': 'Platform',
				'home.columns.playStatus': 'Play status',
				'home.columns.playWith': 'Play with',
				'home.columns.released': 'Released',
				'home.columns.score': 'Score',
				'home.columns.started': 'Started',
				'home.columns.status': 'Status',
				'home.columns.story': 'Story',
				'home.filters.sortBy': 'Sort by',
				'home.confirmDeleteGame': 'Delete game?',
				'home.confirmDeleteSelected': 'Delete selected games?',
				'home.bulkDeleteError': 'Some selected games could not be deleted.',
				'home.noGames': 'No games found.',
				'home.pagination': 'Página {{page}} de {{total}} · {{count}} juegos',
			}

			return (translations[key] ?? key)
				.replace('{{updated}}', String(options?.updated ?? ''))
				.replace('{{total}}', String(options?.total ?? ''))
				.replace('{{page}}', String(options?.page ?? ''))
				.replace('{{count}}', String(options?.count ?? ''))
		},
	}
	return { useTranslation: () => translation }
})

const mockGames = [
	{ id: 1, name: 'Dark Souls', statusId: 1, platformId: 1 },
	{ id: 2, name: 'Hollow Knight', statusId: 2, platformId: 2 },
	{ id: 3, name: 'Celeste', statusId: 1, platformId: 1 },
]

let currentGames: any[] = mockGames
let currentError: string | null = null
const mockPagination = { page: 1, pageSize: 50, totalCount: 3, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
let currentPagination = mockPagination
const mockFetchGamesList = vi.fn().mockResolvedValue(undefined)
const mockRefreshGames = vi.fn().mockResolvedValue(undefined)
const mockDeleteGameById = vi.fn().mockResolvedValue(undefined)
const mockBulkUpdateGamesById = vi.fn().mockResolvedValue({ updatedCount: 2, totalRequested: 2 })
const mockUpdateGameById = vi.fn().mockResolvedValue(undefined)
const mockFetchGameDetails = vi.fn()
const mockLoadPublicGameViews = vi.fn().mockResolvedValue(undefined)
const mockMetadata = vi.hoisted(() => ({ start: vi.fn(), artwork: vi.fn() }))
let metadataBatch: { busy: boolean; artworkField?: 'cover' } | null = null
vi.mock('@/components/Collection/gameMetadataContext', () => ({ useGameMetadata: () => ({ batch: metadataBatch, openBatch: mockMetadata.start, openArtworkBatch: mockMetadata.artwork }) }))
const mockSteamService = vi.hoisted(() => ({
	syncGame: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/services', () => ({
	steamService: mockSteamService,
}))

vi.mock('@/hooks', () => ({
	useGames: () => ({
		games: currentGames,
		error: currentError,
		pagination: currentPagination,
		fetchGamesList: mockFetchGamesList,
		refreshGames: mockRefreshGames,
		fetchGameDetails: mockFetchGameDetails,
		deleteGameById: mockDeleteGameById,
		bulkUpdateGamesById: mockBulkUpdateGamesById,
		updateGameById: mockUpdateGameById,
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
			<button data-testid='bulk-refresh-cover' onClick={() => props.onBulkRefreshImages?.('cover')} disabled={props.bulkImagesDisabled}>
				Bulk Refresh Cover
			</button>
			<button data-testid='bulk-autofill' onClick={() => props.onBulkAutofill?.({ overwrite: false })} disabled={props.bulkAutofillBusy}>Autofill empty</button>
			<button data-testid='bulk-replace' onClick={() => props.onBulkAutofill?.({ overwrite: true })} disabled={props.bulkAutofillBusy}>Autofill replace</button>
			<span data-testid='selected-count'>{props.selectedCount}</span>
			<span data-testid='selection-key'>{props.selectionKey}</span>
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
	ConfirmDialog: ({ isOpen, message, onConfirm, onCancel }: any) =>
		isOpen ? (
			<div role='alertdialog'>
				<p>{message}</p>
				<button data-testid='confirm-cancel' onClick={onCancel}>
					Cancel
				</button>
				<button data-testid='confirm-ok' onClick={onConfirm}>
					Confirm
				</button>
			</div>
		) : null,
	Toast: ({ isOpen, message }: any) => (isOpen ? <div role='status'>{message}</div> : null),
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
		currentError = null
		currentPagination = mockPagination
		metadataBatch = null; mockMetadata.start.mockReturnValue(true); mockMetadata.artwork.mockReturnValue(true)
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
	it('keeps a failed read distinct from empty results, hides raw server errors and retries the current query', async () => {
		currentError = 'INTERNAL fixture detail must not be shown'; currentGames = []
		const HomeComponent = await loadHomeComponent(), user = userEvent.setup()
		renderWithProviders(<HomeComponent />, { preloadedState: { ...defaultState, auth: { user: { id: 1, username: 'Error fixture', role: 'Standard' }, token: 'fixture', refreshToken: null, isAuthenticated: true, loading: false, error: null } } })
		expect(screen.getByRole('alert')).toHaveTextContent('gallery.common.loadError'); expect(screen.queryByText('No games found.')).not.toBeInTheDocument(); expect(screen.queryByText(/INTERNAL fixture/)).not.toBeInTheDocument()
		await waitFor(() => expect(mockRefreshGames).toHaveBeenCalledOnce()); await user.click(screen.getByRole('button', { name: 'gallery.common.retry' })); await waitFor(() => expect(mockRefreshGames).toHaveBeenCalledTimes(2))
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

	it('refreshes Library membership after a successful collection mutation outside its local handlers', async () => {
		const HomeComponent = await loadHomeComponent()
		renderWithProviders(<HomeComponent />, { preloadedState: { ...defaultState, auth: { user: { id: 1, username: 'test', role: 'Admin' }, token: 'test', refreshToken: null, isAuthenticated: true, loading: false, error: null } } })
		await waitFor(() => expect(mockRefreshGames).toHaveBeenCalledOnce())
		act(invalidateCollection)
		await waitFor(() => expect(mockRefreshGames).toHaveBeenCalledTimes(2))
	})

	it('toggles game selection via checkbox', async () => {
		const user = userEvent.setup()
		const HomeComponent = await loadHomeComponent()
		renderWithProviders(<HomeComponent />, { preloadedState: defaultState })

		const checkbox = screen.getByTestId('select-1')
		await user.click(checkbox)

		expect(screen.getByTestId('selected-count')).toHaveTextContent('1')
	})

	it('prunes IDs no longer displayed before a bulk action instead of retaining hidden selections', async () => {
		const user = userEvent.setup(), HomeComponent = await loadHomeComponent(), view = renderWithProviders(<HomeComponent />, { preloadedState: defaultState })
		await user.click(screen.getByTestId('select-1')); await user.click(screen.getByTestId('select-2')); expect(screen.getByTestId('selected-count')).toHaveTextContent('2')
		currentGames = mockGames.slice(1); view.rerender(<HomeComponent />); expect(screen.getByTestId('selected-count')).toHaveTextContent('1'); expect(screen.getByTestId('select-2')).toBeChecked()
		await user.click(screen.getByTestId('bulk-delete')); await user.click(screen.getByTestId('confirm-ok')); expect(mockDeleteGameById).toHaveBeenCalledExactlyOnceWith(2)
	})

	it('clears selection on a page/query transition rather than operating on the preceding page', async () => {
		const user = userEvent.setup(), HomeComponent = await loadHomeComponent(), { store } = renderWithProviders(<HomeComponent />, { preloadedState: defaultState })
		await user.click(screen.getByTestId('select-1')); expect(screen.getByTestId('selected-count')).toHaveTextContent('1')
		act(() => { store.dispatch({ type: 'games/setFilters', payload: { ...defaultState.games!.filters, page: 2 } }) }); expect(screen.getByTestId('selected-count')).toHaveTextContent('0'); expect(screen.getByTestId('select-1')).not.toBeChecked()
	})

	it('keeps selection through a silent token refresh for the same owner and dataset', async () => {
		const user = userEvent.setup(), HomeComponent = await loadHomeComponent(), { store } = renderWithProviders(<HomeComponent />, { preloadedState: { ...defaultState, auth: { user: { id: 1, username: 'Selection fixture', role: 'Standard' }, token: 'fixture', refreshToken: null, isAuthenticated: true, loading: false, error: null } } })
		await user.click(screen.getByTestId('select-1')); act(() => { store.dispatch({ type: 'auth/setRefreshedTokens', payload: { token: 'new-fixture-token', refreshToken: 'new-fixture-refresh' } }) }); expect(screen.getByTestId('selected-count')).toHaveTextContent('1'); expect(screen.getByTestId('select-1')).toBeChecked()
	})

	it('dispatches card style change when view mode toggle is clicked', async () => {
		const user = userEvent.setup()
		const HomeComponent = await loadHomeComponent()
		const { store } = renderWithProviders(<HomeComponent />, { preloadedState: defaultState })

		await user.click(screen.getByTestId('view-card'))
		expect(store.getState().theme.cardStyle).toBe('card')
	})

	it('refreshes the active game view when a replay mutation requests refresh', async () => {
		const HomeComponent = await loadHomeComponent()
		renderWithProviders(<HomeComponent />, {
			preloadedState: {
				...defaultState,
				theme: { ...defaultState.theme!, viewMode: 'goty2025' },
				games: {
					...defaultState.games!,
					needsRefresh: true,
					filters: { page: 1, pageSize: 50, sortBy: 'name', sortDescending: false, releasedYear: 2026 } as any,
				},
			},
		})

		await waitFor(() => {
			expect(mockRefreshGames).toHaveBeenCalledWith({ page: 1, pageSize: 50, viewName: 'goty2025' })
		})
	})

	it('deletes a game after confirming in the dialog', async () => {
		const user = userEvent.setup()
		const HomeComponent = await loadHomeComponent()
		renderWithProviders(<HomeComponent />, { preloadedState: defaultState })

		await user.click(screen.getByTestId('delete-1'))
		expect(screen.getByRole('alertdialog')).toBeInTheDocument()

		await user.click(screen.getByTestId('confirm-ok'))

		expect(mockDeleteGameById).toHaveBeenCalledWith(1)
	})

	it('does not delete a game when the confirmation is cancelled', async () => {
		const user = userEvent.setup()
		const HomeComponent = await loadHomeComponent()
		renderWithProviders(<HomeComponent />, { preloadedState: defaultState })

		await user.click(screen.getByTestId('delete-1'))
		await user.click(screen.getByTestId('confirm-cancel'))

		expect(mockDeleteGameById).not.toHaveBeenCalled()
		expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
	})

	it('bulk deletes the selected games after confirming in the dialog', async () => {
		const user = userEvent.setup()
		const HomeComponent = await loadHomeComponent()
		renderWithProviders(<HomeComponent />, { preloadedState: defaultState })

		await user.click(screen.getByTestId('select-1'))
		await user.click(screen.getByTestId('select-2'))
		await user.click(screen.getByTestId('bulk-delete'))
		expect(screen.getByRole('alertdialog')).toBeInTheDocument()

		await user.click(screen.getByTestId('confirm-ok'))

		expect(mockDeleteGameById).toHaveBeenCalledWith(1)
		expect(mockDeleteGameById).toHaveBeenCalledWith(2)
		expect(mockDeleteGameById).toHaveBeenCalledTimes(2)
	})

	it('deletes selected games sequentially and continues after one failure', async () => {
		const user = userEvent.setup()
		const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		const deleteOrder: number[] = []
		mockDeleteGameById.mockImplementation(async (id: number) => {
			deleteOrder.push(id)
			if (id === 1) throw new Error('database is busy')
		})
		const HomeComponent = await loadHomeComponent()
		renderWithProviders(<HomeComponent />, { preloadedState: defaultState })

		await user.click(screen.getByTestId('select-1'))
		await user.click(screen.getByTestId('select-2'))
		await user.click(screen.getByTestId('bulk-delete'))
		await user.click(screen.getByTestId('confirm-ok'))

		await waitFor(() => expect(deleteOrder).toEqual([1, 2]))
		expect(mockRefreshGames).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }))
		expect(screen.getByRole('status')).toHaveTextContent('Some selected games could not be deleted.')
		try { expect(log).toHaveBeenCalledExactlyOnceWith('Error deleting game 1', expect.objectContaining({ message: 'database is busy' })) } finally { log.mockRestore() }
	})

	it('hands only the exact selected linked IDs to safe role-only artwork review, never clear-then-sync', async () => {
		const user = userEvent.setup()
		currentGames = [
			{ id: 1, name: 'Dark Souls', statusId: 1, platformId: 1, steamAppId: 570 },
			{ id: 2, name: 'Offline Game', statusId: 2, platformId: 2 },
		]
		const HomeComponent = await loadHomeComponent()
		renderWithProviders(<HomeComponent />, { preloadedState: defaultState })

		await user.click(screen.getByTestId('select-1'))
		await user.click(screen.getByTestId('select-2'))
		await user.click(screen.getByTestId('bulk-refresh-cover'))

		expect(mockMetadata.artwork).toHaveBeenCalledExactlyOnceWith([{ id: 1, name: 'Dark Souls' }], 'cover')
		expect(mockUpdateGameById).not.toHaveBeenCalled(); expect(mockSteamService.syncGame).not.toHaveBeenCalled(); expect(mockFetchGameDetails).not.toHaveBeenCalled()
		expect(screen.getByTestId('selected-count')).toHaveTextContent('2')
	})

	it('keeps selection and all saved URLs if the shared artwork batch cannot start', async () => {
		const user = userEvent.setup()
		currentGames = [{ id: 1, name: 'Artwork retention fixture', statusId: 1, cover: 'https://artwork.invalid/kept-cover.jpg', steamAppId: 100 }]
		mockMetadata.artwork.mockReturnValue(false)
		const HomeComponent = await loadHomeComponent()
		renderWithProviders(<HomeComponent />, { preloadedState: defaultState })

		await user.click(screen.getByTestId('select-1'))
		await user.click(screen.getByTestId('bulk-refresh-cover'))

		expect(screen.getByRole('status')).toHaveTextContent('metadata.batch.startFailed'); expect(screen.getByTestId('selected-count')).toHaveTextContent('1')
		expect(currentGames[0].cover).toBe('https://artwork.invalid/kept-cover.jpg'); expect(mockUpdateGameById).not.toHaveBeenCalled(); expect(mockSteamService.syncGame).not.toHaveBeenCalled()
	})

	it('freezes metadata scope for selected displayed games, including unlinked games, in either explicit mode', async () => {
		const HomeComponent = await loadHomeComponent(), user = userEvent.setup()
		renderWithProviders(<HomeComponent />, { preloadedState: defaultState })
		await user.click(screen.getByTestId('select-1')); await user.click(screen.getByTestId('select-3')); await user.click(screen.getByTestId('bulk-autofill'))
		const expected = [{ id: 1, name: 'Dark Souls' }, { id: 3, name: 'Celeste' }]
		expect(mockMetadata.start).toHaveBeenCalledExactlyOnceWith(expected, { overwrite: false }); expect(mockMetadata.artwork).not.toHaveBeenCalled()
		await user.click(screen.getByTestId('bulk-replace')); expect(mockMetadata.start).toHaveBeenLastCalledWith(expected, { overwrite: true })
		expect(mockUpdateGameById).not.toHaveBeenCalled(); expect(mockSteamService.syncGame).not.toHaveBeenCalled()
	})

	it('binds Replace authorization to owner, query and exact IDs rather than only selection count', async () => {
		const HomeComponent = await loadHomeComponent(), user = userEvent.setup()
		const { store } = renderWithProviders(<HomeComponent />, { preloadedState: { ...defaultState, auth: { user: { id: 1, username: 'Selection fixture', role: 'Standard' }, token: 'fixture', refreshToken: null, isAuthenticated: true, loading: false, error: null } } })
		await user.click(screen.getByTestId('select-1')); const first = screen.getByTestId('selection-key').textContent
		expect(first).toMatch(/^1:/); expect(first).toMatch(/:1$/)
		await user.click(screen.getByTestId('select-1')); await user.click(screen.getByTestId('select-2')); expect(screen.getByTestId('selection-key').textContent).not.toBe(first); expect(screen.getByTestId('selection-key').textContent).toMatch(/:2$/)
		act(() => { store.dispatch({ type: 'games/setFilters', payload: { ...defaultState.games!.filters, page: 2 } }) }); expect(screen.getByTestId('selected-count')).toHaveTextContent('0'); expect(screen.getByTestId('selection-key').textContent).not.toBe(first)
	})
	it('does not start a second information or artwork operation while the shared batch is busy', async () => {
		const HomeComponent = await loadHomeComponent(), user = userEvent.setup(), view = renderWithProviders(<HomeComponent />, { preloadedState: defaultState })
		await user.click(screen.getByTestId('select-1')); metadataBatch = { busy: true }; view.rerender(<HomeComponent />)
		expect(screen.getByTestId('bulk-autofill')).toBeDisabled(); await user.click(screen.getByTestId('bulk-refresh-cover')); expect(mockMetadata.start).not.toHaveBeenCalled(); expect(mockMetadata.artwork).not.toHaveBeenCalled()
	})

	it('retains the extended sortable row columns behind More columns', async () => {
		const HomeComponent = await loadHomeComponent()
		renderWithProviders(<HomeComponent />, { preloadedState: defaultState })
		await userEvent.click(screen.getByRole('button', { name: 'gallery.library.advancedColumns' }))

		expect(screen.getByText('Status')).toBeInTheDocument()
		expect(screen.getByText('Name')).toBeInTheDocument()
		expect(screen.getByText('Grade')).toBeInTheDocument()
		expect(screen.getByText('Platform')).toBeInTheDocument()
	})

	it('sorts descending when clicking the active row header column', async () => {
		const user = userEvent.setup()
		const HomeComponent = await loadHomeComponent()
		const { store } = renderWithProviders(<HomeComponent />, { preloadedState: defaultState })
		await user.click(screen.getByRole('button', { name: 'gallery.library.advancedColumns' }))

		await user.click(screen.getByRole('button', { name: 'Sort by: Name' }))

		expect(store.getState().games.filters).toEqual(expect.objectContaining({ page: 1, sortBy: 'name', sortDescending: true }))
	})

	it('sorts ascending by a different row header column', async () => {
		const user = userEvent.setup()
		const HomeComponent = await loadHomeComponent()
		const { store } = renderWithProviders(<HomeComponent />, {
			preloadedState: {
				...defaultState,
				games: {
					...defaultState.games!,
					filters: { page: 3, pageSize: 50, sortBy: 'name', sortDescending: true },
				},
			},
		})

		await user.click(screen.getByRole('button', { name: 'gallery.library.advancedColumns' }))
		await user.click(screen.getByRole('button', { name: 'Sort by: Grade' }))

		expect(store.getState().games.filters).toEqual(expect.objectContaining({ page: 1, sortBy: 'grade', sortDescending: false }))
	})
})
