import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockCreateGameView = vi.fn().mockResolvedValue({ id: 1 })
const mockUpdateGameView = vi.fn().mockResolvedValue(undefined)

vi.mock('@/hooks', () => ({
	useGameViews: () => ({
		createGameView: mockCreateGameView,
		updateGameView: mockUpdateGameView,
	}),
	useGameStatus: () => ({
		activeStatuses: [
			{ id: 1, name: 'Playing' },
			{ id: 2, name: 'Completed' },
		],
		loadActiveStatuses: vi.fn(),
	}),
	useGamePlatform: () => ({
		activeItems: [{ id: 1, name: 'PC' }],
		loadActivePlatforms: vi.fn(),
	}),
	useGamePlayedStatus: () => ({
		activeItems: [{ id: 1, name: 'Finished' }],
		fetchActiveList: vi.fn(),
	}),
	useGamePlayWith: () => ({
		activeOptions: [{ id: 1, name: 'Solo' }],
		fetchActiveOptions: vi.fn(),
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
		expect(screen.getByText('Editar Vista')).toBeInTheDocument()
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
		expect(screen.getByText('Ordenamiento')).toBeInTheDocument()
	})

	it('shows empty state for sorting', async () => {
		const C = await loadComponent()
		render(<C onClose={mockOnClose} onSave={mockOnSave} />)
		expect(screen.getByText('No hay ordenamientos configurados')).toBeInTheDocument()
	})

	it('has add group and add sorting buttons', async () => {
		const C = await loadComponent()
		render(<C onClose={mockOnClose} onSave={mockOnSave} />)
		expect(screen.getByText('Agregar Grupo')).toBeInTheDocument()
		expect(screen.getByText('Agregar Ordenamiento')).toBeInTheDocument()
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
		await user.click(screen.getByText('Agregar Grupo'))
		expect(screen.queryByText('No hay filtros configurados')).not.toBeInTheDocument()
	})

	it('adds a sorting rule', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		render(<C onClose={mockOnClose} onSave={mockOnSave} />)
		await user.click(screen.getByText('Agregar Ordenamiento'))
		expect(screen.queryByText('No hay ordenamientos configurados')).not.toBeInTheDocument()
	})
})
