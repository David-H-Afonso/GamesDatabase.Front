import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'

const mockPlayedStatuses = [
	{ id: 1, name: 'Finished', isActive: true, color: '#00FF00', sortOrder: 1 },
	{ id: 2, name: 'Dropped', isActive: false, color: '#FF0000', sortOrder: 2 },
]

const mockLoadPlayedStatuses = vi.fn()
const mockCreatePlayedStatus = vi.fn().mockResolvedValue(undefined)
const mockUpdatePlayedStatus = vi.fn().mockResolvedValue(undefined)
const mockDeletePlayedStatus = vi.fn().mockResolvedValue(undefined)

vi.mock('@/hooks/useGamePlayedStatus', () => ({
	useGamePlayedStatus: () => ({
		playedStatuses: mockPlayedStatuses,
		loading: false,
		error: null,
		pagination: { page: 1, totalPages: 1, totalCount: 2 },
		loadPlayedStatuses: mockLoadPlayedStatuses,
		createPlayedStatus: mockCreatePlayedStatus,
		updatePlayedStatus: mockUpdatePlayedStatus,
		deletePlayedStatus: mockDeletePlayedStatus,
	}),
}))

vi.mock('@/services/GamePlayedStatusService', () => ({
	reorderGamePlayedStatuses: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./AdminPlayedStatus.scss', () => ({}))
async function loadComponent() {
	const mod = await import('./AdminPlayedStatus')
	return mod.AdminPlayedStatus
}

describe('AdminPlayedStatus', () => {
	beforeEach(() => vi.clearAllMocks())

	it('renders table with played status data', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />)
		expect(screen.getByText('Finished')).toBeInTheDocument()
		expect(screen.getByText('Dropped')).toBeInTheDocument()
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
		await user.click(screen.getByText('Nuevo Estado'))
		expect(screen.getByText('Nuevo Estado', { selector: 'h2' })).toBeInTheDocument()
	})

	it('opens edit modal with prefilled data', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<C />)
		const editButtons = screen.getAllByText('Editar')
		await user.click(editButtons[0])
		expect(screen.getByDisplayValue('Finished')).toBeInTheDocument()
	})

	it('calls deletePlayedStatus on confirm', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
		renderWithProviders(<C />)
		const deleteButtons = screen.getAllByText('Eliminar')
		await user.click(deleteButtons[0])
		expect(mockDeletePlayedStatus).toHaveBeenCalledWith(1)
		vi.restoreAllMocks()
	})

	it('submits create form', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<C />)
		await user.click(screen.getByText('Nuevo Estado'))
		await user.type(screen.getByLabelText('Nombre'), 'On Hold')
		await user.click(screen.getByText('Crear'))
		expect(mockCreatePlayedStatus).toHaveBeenCalledWith(expect.objectContaining({ name: 'On Hold' }))
	})

	it('loads data on mount', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />)
		expect(mockLoadPlayedStatuses).toHaveBeenCalled()
	})
})
