import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'

const mockPlayWiths = [
	{ id: 1, name: 'Solo', isActive: true, color: '#FF0000', sortOrder: 1 },
	{ id: 2, name: 'Online', isActive: false, color: '#00FF00', sortOrder: 2 },
]

const mockLoadPlayWiths = vi.fn()
const mockCreatePlayWith = vi.fn().mockResolvedValue(undefined)
const mockUpdatePlayWith = vi.fn().mockResolvedValue(undefined)
const mockDeletePlayWith = vi.fn().mockResolvedValue(undefined)

vi.mock('@/hooks/useGamePlayWith', () => ({
	useGamePlayWith: () => ({
		playWiths: mockPlayWiths,
		loading: false,
		error: null,
		pagination: { page: 1, totalPages: 1, totalCount: 2 },
		loadPlayWiths: mockLoadPlayWiths,
		createPlayWith: mockCreatePlayWith,
		updatePlayWith: mockUpdatePlayWith,
		deletePlayWith: mockDeletePlayWith,
	}),
}))

vi.mock('@/services/GamePlayWithService', () => ({
	reorderGamePlayWith: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./AdminPlayWith.scss', () => ({}))

async function loadComponent() {
	const mod = await import('./AdminPlayWith')
	return mod.AdminPlayWith
}

describe('AdminPlayWith', () => {
	beforeEach(() => vi.clearAllMocks())

	it('renders table with play-with data', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />)
		expect(screen.getByText('Solo')).toBeInTheDocument()
		expect(screen.getByText('Online')).toBeInTheDocument()
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
		await user.click(screen.getByText('Nueva Opción'))
		expect(screen.getByText('Nueva Opción', { selector: 'h2' })).toBeInTheDocument()
	})

	it('opens edit modal with prefilled data', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<C />)
		const editButtons = screen.getAllByText('Editar')
		await user.click(editButtons[0])
		expect(screen.getByDisplayValue('Solo')).toBeInTheDocument()
	})

	it('calls deletePlayWith on confirm', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
		renderWithProviders(<C />)
		const deleteButtons = screen.getAllByText('Eliminar')
		await user.click(deleteButtons[0])
		expect(mockDeletePlayWith).toHaveBeenCalledWith(1)
		vi.restoreAllMocks()
	})

	it('submits create form', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<C />)
		await user.click(screen.getByText('Nueva Opción'))
		await user.type(screen.getByLabelText('Nombre'), 'Co-op')
		await user.click(screen.getByText('Crear'))
		expect(mockCreatePlayWith).toHaveBeenCalledWith(expect.objectContaining({ name: 'Co-op' }))
	})

	it('loads data on mount', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />)
		expect(mockLoadPlayWiths).toHaveBeenCalled()
	})
})
