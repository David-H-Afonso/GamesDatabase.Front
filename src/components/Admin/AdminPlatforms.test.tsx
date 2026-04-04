import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'

const mockPlatforms = [
	{ id: 1, name: 'PC', isActive: true, color: '#FF0000', sortOrder: 1 },
	{ id: 2, name: 'PS5', isActive: false, color: '#0000FF', sortOrder: 2 },
]

const mockLoadPlatforms = vi.fn()
const mockCreatePlatform = vi.fn().mockResolvedValue(undefined)
const mockUpdatePlatform = vi.fn().mockResolvedValue(undefined)
const mockDeletePlatform = vi.fn().mockResolvedValue(undefined)

vi.mock('@/hooks/useGamePlatform', () => ({
	useGamePlatform: () => ({
		platforms: mockPlatforms,
		loading: false,
		error: null,
		pagination: { page: 1, totalPages: 2, totalCount: 15 },
		loadPlatforms: mockLoadPlatforms,
		createPlatform: mockCreatePlatform,
		updatePlatform: mockUpdatePlatform,
		deletePlatform: mockDeletePlatform,
	}),
}))

vi.mock('@/services/GamePlatformService', () => ({
	reorderGamePlatforms: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./AdminPlatforms.scss', () => ({}))

async function loadComponent() {
	const mod = await import('./AdminPlatforms')
	return mod.AdminPlatforms
}

describe('AdminPlatforms', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('renders table with platform data', async () => {
		const AdminPlatforms = await loadComponent()
		renderWithProviders(<AdminPlatforms />)
		expect(screen.getByText('PC')).toBeInTheDocument()
		expect(screen.getByText('PS5')).toBeInTheDocument()
	})

	it('renders table headers', async () => {
		const AdminPlatforms = await loadComponent()
		renderWithProviders(<AdminPlatforms />)
		expect(screen.getByText('Nombre')).toBeInTheDocument()
		expect(screen.getByText('Color')).toBeInTheDocument()
		expect(screen.getByText('Estado')).toBeInTheDocument()
		expect(screen.getByText('Acciones')).toBeInTheDocument()
	})

	it('shows active/inactive status', async () => {
		const AdminPlatforms = await loadComponent()
		renderWithProviders(<AdminPlatforms />)
		expect(screen.getByText('Activo')).toBeInTheDocument()
		expect(screen.getByText('Inactivo')).toBeInTheDocument()
	})

	it('shows pagination info', async () => {
		const AdminPlatforms = await loadComponent()
		renderWithProviders(<AdminPlatforms />)
		expect(screen.getByText(/Página 1 de 2/)).toBeInTheDocument()
		expect(screen.getByText(/15 elementos/)).toBeInTheDocument()
	})

	it('disables previous button on first page', async () => {
		const AdminPlatforms = await loadComponent()
		renderWithProviders(<AdminPlatforms />)
		expect(screen.getByText('Anterior')).toBeDisabled()
	})

	it('enables next button when more pages exist', async () => {
		const AdminPlatforms = await loadComponent()
		renderWithProviders(<AdminPlatforms />)
		expect(screen.getByText('Siguiente')).not.toBeDisabled()
	})

	it('opens create modal on button click', async () => {
		const AdminPlatforms = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<AdminPlatforms />)
		await user.click(screen.getByText('Nueva Opción'))
		expect(screen.getByText('Nueva Opción', { selector: 'h2' })).toBeInTheDocument()
	})

	it('opens edit modal when clicking Editar', async () => {
		const AdminPlatforms = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<AdminPlatforms />)
		const editButtons = screen.getAllByText('Editar')
		await user.click(editButtons[0])
		expect(screen.getByText('Editar Opción')).toBeInTheDocument()
		expect(screen.getByDisplayValue('PC')).toBeInTheDocument()
	})

	it('closes modal on close button click', async () => {
		const AdminPlatforms = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<AdminPlatforms />)
		await user.click(screen.getByText('Nueva Opción'))
		await user.click(screen.getByText('×'))
		expect(screen.queryByText('Nueva Opción', { selector: 'h2' })).not.toBeInTheDocument()
	})

	it('calls deletePlatform on confirm', async () => {
		const AdminPlatforms = await loadComponent()
		const user = userEvent.setup()
		vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
		renderWithProviders(<AdminPlatforms />)
		const deleteButtons = screen.getAllByText('Eliminar')
		await user.click(deleteButtons[0])
		expect(mockDeletePlatform).toHaveBeenCalledWith(1)
		vi.restoreAllMocks()
	})

	it('does not delete when confirm is cancelled', async () => {
		const AdminPlatforms = await loadComponent()
		const user = userEvent.setup()
		vi.spyOn(globalThis, 'confirm').mockReturnValue(false)
		renderWithProviders(<AdminPlatforms />)
		const deleteButtons = screen.getAllByText('Eliminar')
		await user.click(deleteButtons[0])
		expect(mockDeletePlatform).not.toHaveBeenCalled()
		vi.restoreAllMocks()
	})

	it('submits create form with new data', async () => {
		const AdminPlatforms = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<AdminPlatforms />)
		await user.click(screen.getByText('Nueva Opción'))
		await user.type(screen.getByLabelText('Nombre'), 'Xbox')
		await user.click(screen.getByText('Crear'))
		expect(mockCreatePlatform).toHaveBeenCalledWith(expect.objectContaining({ name: 'Xbox', isActive: true }))
	})

	it('submits update form with edited data', async () => {
		const AdminPlatforms = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<AdminPlatforms />)
		const editButtons = screen.getAllByText('Editar')
		await user.click(editButtons[0])
		const nameInput = screen.getByLabelText('Nombre')
		await user.clear(nameInput)
		await user.type(nameInput, 'PC Gaming')
		await user.click(screen.getByText('Actualizar'))
		expect(mockUpdatePlatform).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'PC Gaming', id: 1 }))
	})

	it('loads platforms on mount', async () => {
		const AdminPlatforms = await loadComponent()
		renderWithProviders(<AdminPlatforms />)
		expect(mockLoadPlatforms).toHaveBeenCalled()
	})

	it('has page size selector', async () => {
		const AdminPlatforms = await loadComponent()
		renderWithProviders(<AdminPlatforms />)
		expect(screen.getByText('Elementos por página:')).toBeInTheDocument()
	})
})
