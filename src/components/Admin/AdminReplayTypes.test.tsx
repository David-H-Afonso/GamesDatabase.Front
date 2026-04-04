import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockReplayTypes = [
	{ id: 1, name: 'New Game+', isActive: true, color: '#FF0000', sortOrder: 1, isDefault: false, replayType: 'None' },
	{ id: 2, name: 'Speedrun', isActive: false, color: '#00FF00', sortOrder: 2, isDefault: false, replayType: 'None' },
]

vi.mock('@/services/GameReplayTypeService', () => ({
	getGameReplayTypes: vi.fn().mockResolvedValue({
		data: mockReplayTypes,
		page: 1,
		totalPages: 1,
		totalCount: 2,
	}),
	createGameReplayType: vi.fn().mockResolvedValue({ id: 3, name: 'DLC' }),
	updateGameReplayType: vi.fn().mockResolvedValue(undefined),
	deleteGameReplayType: vi.fn().mockResolvedValue(undefined),
	reorderGameReplayTypes: vi.fn().mockResolvedValue(undefined),
	getSpecialGameReplayType: vi.fn().mockResolvedValue(null),
}))

vi.mock('./AdminReplayTypes.scss', () => ({}))

async function loadComponent() {
	const mod = await import('./AdminReplayTypes')
	return mod.AdminReplayTypes
}

describe('AdminReplayTypes', () => {
	beforeEach(() => vi.clearAllMocks())

	it('renders table with replay type data', async () => {
		const C = await loadComponent()
		render(<C />)
		await vi.waitFor(() => {
			expect(screen.getByText('New Game+')).toBeInTheDocument()
			expect(screen.getByText('Speedrun')).toBeInTheDocument()
		})
	})

	it('shows active/inactive badges', async () => {
		const C = await loadComponent()
		render(<C />)
		await vi.waitFor(() => {
			expect(screen.getByText('Activo')).toBeInTheDocument()
			expect(screen.getByText('Inactivo')).toBeInTheDocument()
		})
	})

	it('opens create modal', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		render(<C />)
		await vi.waitFor(() => expect(screen.getByText('New Game+')).toBeInTheDocument())
		await user.click(screen.getByText('Nuevo Tipo'))
		expect(screen.getByText('Nuevo Tipo de Rejugada', { selector: 'h2' })).toBeInTheDocument()
	})

	it('opens edit modal with prefilled data', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		render(<C />)
		await vi.waitFor(() => expect(screen.getByText('New Game+')).toBeInTheDocument())
		const editButtons = screen.getAllByText('Editar')
		await user.click(editButtons[0])
		expect(screen.getByDisplayValue('New Game+')).toBeInTheDocument()
	})

	it('calls deleteGameReplayType on confirm', async () => {
		const { deleteGameReplayType } = await import('@/services/GameReplayTypeService')
		const C = await loadComponent()
		const user = userEvent.setup()
		vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
		render(<C />)
		await vi.waitFor(() => expect(screen.getByText('New Game+')).toBeInTheDocument())
		const deleteButtons = screen.getAllByText('Eliminar')
		await user.click(deleteButtons[0])
		expect(deleteGameReplayType).toHaveBeenCalledWith(1)
		vi.restoreAllMocks()
	})

	it('shows pagination info', async () => {
		const C = await loadComponent()
		render(<C />)
		await vi.waitFor(() => expect(screen.getByText(/Página 1 de 1/)).toBeInTheDocument())
	})

	it('shows loading state initially', async () => {
		const C = await loadComponent()
		render(<C />)
		// The loading state appears briefly before the async data loads
		expect(screen.getByText('Cargando...')).toBeInTheDocument()
	})
})
