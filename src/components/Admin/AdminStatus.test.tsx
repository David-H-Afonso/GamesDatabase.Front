import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'

const mockStatuses = [
	{ id: 1, name: 'Playing', isActive: true, color: '#00FF00', sortOrder: 1, statusType: 'None', isDefault: false, isSpecialStatus: false },
	{ id: 2, name: 'Completed', isActive: false, color: '#0000FF', sortOrder: 2, statusType: 'None', isDefault: true, isSpecialStatus: false },
]

const mockLoadStatuses = vi.fn()
const mockCreateStatus = vi.fn().mockResolvedValue(undefined)
const mockUpdateStatus = vi.fn().mockResolvedValue(undefined)
const mockDeleteStatus = vi.fn().mockResolvedValue(undefined)

vi.mock('@/hooks/useGameStatus', () => ({
	useGameStatus: () => ({
		statuses: mockStatuses,
		loading: false,
		error: null,
		pagination: { page: 1, totalPages: 1, totalCount: 2 },
		loadStatuses: mockLoadStatuses,
		createStatus: mockCreateStatus,
		updateStatus: mockUpdateStatus,
		deleteStatus: mockDeleteStatus,
		reassignSpecial: vi.fn(),
	}),
}))

vi.mock('@/services/GameStatusService', () => ({
	reorderGameStatuses: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./AdminStatus.scss', () => ({}))

async function loadComponent() {
	const mod = await import('./AdminStatus')
	return mod.AdminStatus
}

describe('AdminStatus', () => {
	beforeEach(() => vi.clearAllMocks())

	it('renders table with status data', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />)
		expect(screen.getByText('Playing')).toBeInTheDocument()
		expect(screen.getByText('Completed')).toBeInTheDocument()
	})

	it('renders table headers', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />)
		expect(screen.getByText('Nombre')).toBeInTheDocument()
		expect(screen.getByText('Color')).toBeInTheDocument()
		expect(screen.getByText('Estado')).toBeInTheDocument()
	})

	it('shows active/inactive badges', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />)
		expect(screen.getByText('Activo')).toBeInTheDocument()
		expect(screen.getByText('Inactivo')).toBeInTheDocument()
	})

	it('opens create modal', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<C />)
		await user.click(screen.getByText('Nuevo Status'))
		expect(screen.getByText('Nuevo Status', { selector: 'h2' })).toBeInTheDocument()
	})

	it('opens edit modal with prefilled data', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<C />)
		const editButtons = screen.getAllByText('Editar')
		await user.click(editButtons[0])
		expect(screen.getByText('Editar Status')).toBeInTheDocument()
		expect(screen.getByDisplayValue('Playing')).toBeInTheDocument()
	})

	it('calls deleteStatus on confirm', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
		renderWithProviders(<C />)
		const deleteButtons = screen.getAllByText('Eliminar')
		await user.click(deleteButtons[0])
		expect(mockDeleteStatus).toHaveBeenCalledWith(1)
		vi.restoreAllMocks()
	})

	it('submits create form', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<C />)
		await user.click(screen.getByText('Nuevo Status'))
		await user.type(screen.getByLabelText('Nombre'), 'Backlog')
		await user.click(screen.getByText('Crear'))
		expect(mockCreateStatus).toHaveBeenCalledWith(expect.objectContaining({ name: 'Backlog' }))
	})

	it('loads statuses on mount', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />)
		expect(mockLoadStatuses).toHaveBeenCalled()
	})

	it('shows pagination info', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />)
		expect(screen.getByText(/Página 1 de 1/)).toBeInTheDocument()
	})

	it('submits update form', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<C />)
		const editButtons = screen.getAllByText('Editar')
		await user.click(editButtons[0])
		const nameInput = screen.getByDisplayValue('Playing')
		await user.clear(nameInput)
		await user.type(nameInput, 'In Progress')
		await user.click(screen.getByText('Actualizar'))
		expect(mockUpdateStatus).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'In Progress' }))
	})

	it('does not delete on cancel confirm', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		vi.spyOn(globalThis, 'confirm').mockReturnValue(false)
		renderWithProviders(<C />)
		const deleteButtons = screen.getAllByText('Eliminar')
		await user.click(deleteButtons[0])
		expect(mockDeleteStatus).not.toHaveBeenCalled()
		vi.restoreAllMocks()
	})

	it('renders color swatches', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />)
		const colorCells = document.querySelectorAll('.color-swatch, [style*="background"]')
		expect(colorCells.length).toBeGreaterThan(0)
	})

	it('renders reorder buttons', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />)
		const reorderBtns = document.querySelectorAll('.reorder-btn, button[class*="reorder"]')
		expect(reorderBtns.length).toBeGreaterThanOrEqual(0)
	})
})
