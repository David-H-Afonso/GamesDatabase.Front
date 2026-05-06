import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import type { GameQueryParameters } from '@/models/api/Game'
import type { RootState } from '@/store'

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

		expect(screen.getByPlaceholderText('Buscar juegos…')).toBeInTheDocument()
	})

	it('calls onSearchChange when typing in search input', async () => {
		const onSearchChange = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		renderWithProviders(<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={onSearchChange} onSortChange={vi.fn()} />, {
			preloadedState: defaultState,
		})

		await user.type(screen.getByPlaceholderText('Buscar juegos…'), 'dark')

		expect(onSearchChange).toHaveBeenCalled()
	})

	it('renders sort select with default Nombre option', async () => {
		const GameFiltersChips = await loadGameFiltersChips()
		renderWithProviders(<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={vi.fn()} />, { preloadedState: defaultState })

		const sortSelect = screen.getByLabelText('Ordenar por')
		expect(sortSelect).toBeInTheDocument()
		expect(sortSelect).toHaveValue('name')
	})

	it('calls onSortChange when sort select changes', async () => {
		const onSortChange = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		renderWithProviders(<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={onSortChange} />, {
			preloadedState: defaultState,
		})

		await user.selectOptions(screen.getByLabelText('Ordenar por'), 'grade')

		expect(onSortChange).toHaveBeenCalledWith('grade', false)
	})

	it('toggles sort direction when arrow button is clicked', async () => {
		const onSortChange = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		renderWithProviders(<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={onSortChange} />, {
			preloadedState: defaultState,
		})

		const dirBtn = screen.getByTitle('Ascendente')
		await user.click(dirBtn)

		expect(onSortChange).toHaveBeenCalledWith('name', true)
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

		expect(screen.getByText('3 seleccionado(s)')).toBeInTheDocument()
		expect(screen.getByText('Deseleccionar')).toBeInTheDocument()
		expect(screen.getByText('Editar')).toBeInTheDocument()
		expect(screen.getByText('Eliminar')).toBeInTheDocument()
	})

	it('calls onBulkDelete when Eliminar button is clicked', async () => {
		const onBulkDelete = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		renderWithProviders(
			<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={vi.fn()} selectedCount={2} onBulkDelete={onBulkDelete} />,
			{ preloadedState: defaultState }
		)

		await user.click(screen.getByText('Eliminar'))

		expect(onBulkDelete).toHaveBeenCalledOnce()
	})

	it('renders view mode toggle buttons when onViewModeChange is provided', async () => {
		const onViewModeChange = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		renderWithProviders(
			<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={vi.fn()} viewMode='card' onViewModeChange={onViewModeChange} />,
			{ preloadedState: defaultState }
		)

		const cardBtn = screen.getByText('Tarjetas')
		expect(cardBtn).toBeInTheDocument()
		expect(cardBtn.className).toContain('is-active')

		await user.click(screen.getByText('Fila'))
		expect(onViewModeChange).toHaveBeenCalledWith('row')
	})

	it('toggles advanced filters when button is clicked', async () => {
		const GameFiltersChips = await loadGameFiltersChips()
		renderWithProviders(<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={vi.fn()} />, { preloadedState: defaultState })

		// Advanced filters should not be visible initially
		expect(screen.queryByText('Resetear filtros')).not.toBeInTheDocument()

		// Click the toggle button
		await user.click(screen.getByText('⚙ Filtros avanzados'))

		// Advanced filter chips should now be visible
		expect(screen.getByText(/Plataforma:/)).toBeInTheDocument()
		expect(screen.getByText(/Status:/)).toBeInTheDocument()
		expect(screen.getByText(/Nota:/)).toBeInTheDocument()
	})

	it('renders Exportar button when onBulkExport is provided and items selected', async () => {
		const onBulkExport = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		renderWithProviders(
			<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={vi.fn()} selectedCount={1} onBulkExport={onBulkExport} />,
			{ preloadedState: defaultState }
		)

		await user.click(screen.getByText('Exportar'))
		expect(onBulkExport).toHaveBeenCalledOnce()
	})

	it('renders "Seleccionar todos" button when onSelectAll provided', async () => {
		const onSelectAll = vi.fn()
		const GameFiltersChips = await loadGameFiltersChips()
		renderWithProviders(<GameFiltersChips filters={defaultFilters} onFiltersChange={vi.fn()} onSearchChange={vi.fn()} onSortChange={vi.fn()} onSelectAll={onSelectAll} />, {
			preloadedState: defaultState,
		})

		const btn = screen.getByText('Seleccionar todos')
		await user.click(btn)
		expect(onSelectAll).toHaveBeenCalledOnce()
	})
})
