import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders as render } from '@/test/utils/renderWithProviders'

const mockCreateGameView = vi.fn().mockResolvedValue({ id: 1 })
const mockUpdateGameView = vi.fn().mockResolvedValue(undefined)

// IMPORTANT: these loader fns must keep a STABLE identity across renders.
// The component's mount effect lists them as dependencies, so returning a fresh
// vi.fn() on every render would re-run the effect every render, and its async
// setReplayTypes() would schedule another render → infinite loop. That loop
// starves the microtask queue and makes the first awaited interaction hang.
const mockLoadActiveStatuses = vi.fn()
const mockLoadActivePlatforms = vi.fn()
const mockLoadActivePlayedStatus = vi.fn()
const mockLoadActivePlayWith = vi.fn()

vi.mock('@/hooks', () => ({
	useGameViews: () => ({
		createGameView: mockCreateGameView,
		updateGameView: mockUpdateGameView,
	}),
	useGamePlatform: () => ({
		activeItems: [{ id: 1, name: 'PC' }],
		loadActivePlatforms: mockLoadActivePlatforms,
	}),
	useGamePlayedStatus: () => ({
		activeItems: [{ id: 1, name: 'Finished' }],
		fetchActiveList: mockLoadActivePlayedStatus,
	}),
	useGamePlayWith: () => ({
		activeOptions: [{ id: 1, name: 'Solo' }],
		fetchActiveOptions: mockLoadActivePlayWith,
	}),
}))

// The component imports useGameStatus from its concrete module, not from '@/hooks',
// so it must be mocked separately (with a stable loader to avoid the render loop).
vi.mock('@/hooks/useGameStatus/useGameStatus', () => ({
	useGameStatus: () => ({
		activeStatuses: [
			{ id: 1, name: 'Playing' },
			{ id: 2, name: 'Completed' },
		],
		loadActiveStatuses: mockLoadActiveStatuses,
	}),
}))

vi.mock('@/services/GameReplayTypeService', () => ({
	getActiveGameReplayTypes: vi.fn().mockResolvedValue([{ id: 1, name: 'NG+' }]),
}))

vi.mock('./GameViewModal.scss', () => ({}))

async function loadComponent() {
	const mod = await import('./GameViewModal')
	return mod.default
}

describe('GameViewModal', () => {
	const mockOnClose = vi.fn()
	const mockOnSave = vi.fn()

	beforeEach(() => vi.clearAllMocks())

	it('renders new view heading when no gameView prop', async () => {
		const C = await loadComponent()
		render(<C onClose={mockOnClose} onSave={mockOnSave} />)
		expect(screen.getByText('Nueva Vista')).toBeInTheDocument()
	})

	it('renders edit view heading when gameView provided', async () => {
		const C = await loadComponent()
		const view = { id: 1, name: 'Test View', configuration: { filterGroups: [], sorting: [] }, isPublic: true }
		render(<C gameView={view as any} onClose={mockOnClose} onSave={mockOnSave} />)
		expect(screen.getByText('Editar')).toBeInTheDocument()
		expect(screen.getByDisplayValue('Test View')).toBeInTheDocument()
	})

	it('renders name input with placeholder', async () => {
		const C = await loadComponent()
		render(<C onClose={mockOnClose} onSave={mockOnSave} />)
		expect(screen.getByPlaceholderText('Nombre de la vista')).toBeInTheDocument()
	})

	it('renders filter and sorting sections', async () => {
		const C = await loadComponent()
		render(<C onClose={mockOnClose} onSave={mockOnSave} />)
		expect(screen.getByText('Filtros')).toBeInTheDocument()
		expect(screen.getByText('Ordenación')).toBeInTheDocument()
	})

	it('shows empty state for sorting', async () => {
		const C = await loadComponent()
		render(<C onClose={mockOnClose} onSave={mockOnSave} />)
		expect(screen.getByText('Sin ordenaciones configuradas')).toBeInTheDocument()
	})

	it('has add group and add sorting buttons', async () => {
		const C = await loadComponent()
		render(<C onClose={mockOnClose} onSave={mockOnSave} />)
		expect(screen.getByText('Añadir Grupo')).toBeInTheDocument()
		expect(screen.getByText('Añadir Ordenación')).toBeInTheDocument()
	})

	it('calls onClose when close button is clicked', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		render(<C onClose={mockOnClose} onSave={mockOnSave} />)
		await user.click(screen.getByText('×'))
		expect(mockOnClose).toHaveBeenCalled()
	})

	it('disables save when name is empty', async () => {
		const C = await loadComponent()
		render(<C onClose={mockOnClose} onSave={mockOnSave} />)
		const saveBtn = screen.getByText('Guardar')
		expect(saveBtn).toBeDisabled()
	})

	it('saves new view when name is provided', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		render(<C onClose={mockOnClose} onSave={mockOnSave} />)
		await user.type(screen.getByPlaceholderText('Nombre de la vista'), 'My New View')
		await user.click(screen.getByText('Guardar'))
		expect(mockCreateGameView).toHaveBeenCalledWith(expect.objectContaining({ name: 'My New View' }))
	})

	it('adds a filter group', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		render(<C onClose={mockOnClose} onSave={mockOnSave} />)
		const before = screen.getAllByText('Sin filtros en este grupo').length
		await user.click(screen.getByText('Añadir Grupo'))
		expect(screen.getAllByText('Sin filtros en este grupo')).toHaveLength(before + 1)
	})

	it('adds a sorting rule', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		render(<C onClose={mockOnClose} onSave={mockOnSave} />)
		expect(screen.getByText('Sin ordenaciones configuradas')).toBeInTheDocument()
		await user.click(screen.getByText('Añadir Ordenación'))
		expect(screen.queryByText('Sin ordenaciones configuradas')).not.toBeInTheDocument()
	})
})
