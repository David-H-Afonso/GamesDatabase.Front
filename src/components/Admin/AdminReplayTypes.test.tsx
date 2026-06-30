import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'

const mockReplayTypes = vi.hoisted(() => [
	{ id: 1, name: 'New Game+', isActive: true, color: '#FF0000', sortOrder: 1, isDefault: false, replayType: 'None' },
	{ id: 2, name: 'Speedrun', isActive: false, color: '#00FF00', sortOrder: 2, isDefault: false, replayType: 'None' },
])

vi.mock('@/services/GameReplayTypeService', () => ({
	getGameReplayTypes: vi.fn().mockResolvedValue({
		data: mockReplayTypes,
		page: 1,
		totalPages: 1,
		totalCount: 2,
	}),
	getActiveGameReplayTypes: vi.fn().mockResolvedValue([]),
	getGameReplayTypeById: vi.fn().mockResolvedValue(mockReplayTypes[0]),
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
		renderWithProviders(<C />)
		await vi.waitFor(() => {
			expect(screen.getByText('New Game+')).toBeInTheDocument()
			expect(screen.getByText('Speedrun')).toBeInTheDocument()
		})
	})

	it('shows active/inactive badges', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />)
		await vi.waitFor(() => {
			expect(screen.getByText('Activo')).toBeInTheDocument()
			expect(screen.getByText('Inactivo')).toBeInTheDocument()
		})
	})

	it('opens create modal', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<C />)
		await vi.waitFor(() => expect(screen.getByText('New Game+')).toBeInTheDocument())
		await user.click(screen.getByText('Nuevo Tipo'))
		expect(screen.getByText('Nuevo Tipo', { selector: 'h2' })).toBeInTheDocument()
	})

	it('opens edit modal with prefilled data', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<C />)
		await vi.waitFor(() => expect(screen.getByText('New Game+')).toBeInTheDocument())
		const editButtons = screen.getAllByRole('button', { name: 'Editar' })
		await user.click(editButtons[0])
		expect(screen.getByDisplayValue('New Game+')).toBeInTheDocument()
	})

	it('calls deleteGameReplayType on confirm', async () => {
		const { deleteGameReplayType } = await import('@/services/GameReplayTypeService')
		const C = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<C />)
		await vi.waitFor(() => expect(screen.getByText('New Game+')).toBeInTheDocument())
		const deleteButtons = screen.getAllByRole('button', { name: 'Eliminar' })
		await user.click(deleteButtons[0])
		const dialog = screen.getByRole('alertdialog')
		await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
		expect(deleteGameReplayType).toHaveBeenCalledWith(1)
	})

	it('hides pagination when there is a single page', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />)
		await vi.waitFor(() => expect(screen.getByText('New Game+')).toBeInTheDocument())
		expect(screen.queryByText(/Página/)).not.toBeInTheDocument()
	})

	it('shows the loading skeleton initially', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />)
		expect(document.querySelector('.data-table__skeleton')).not.toBeNull()
	})
})
