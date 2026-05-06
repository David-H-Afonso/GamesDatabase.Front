import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockGameViews = vi.hoisted(() => [
	{
		id: 1,
		name: 'My View',
		configuration: { filterGroups: [], sorting: [] },
		isPublic: true,
		sortOrder: 1,
		createdAt: '2025-01-10T10:00:00Z',
	},
	{
		id: 2,
		name: 'Another View',
		configuration: { filterGroups: [{ combineWith: 'AND', filters: [{ field: 'name', operator: 'contains', value: 'test' }] }], sorting: [] },
		isPublic: false,
		sortOrder: 2,
		createdAt: '2025-01-11T10:00:00Z',
	},
])

const mockLoadGameViews = vi.fn()
const mockLoadGameViewById = vi.fn().mockResolvedValue(mockGameViews[0])
const mockDeleteGameView = vi.fn().mockResolvedValue(undefined)
const mockCreateGameView = vi.fn().mockResolvedValue({ id: 3 })

vi.mock('@/hooks/useGameViews', () => ({
	useGameViews: () => ({
		gameViews: mockGameViews,
		loading: false,
		error: null,
		loadGameViews: mockLoadGameViews,
		loadGameViewById: mockLoadGameViewById,
		deleteGameView: mockDeleteGameView,
		createGameView: mockCreateGameView,
	}),
}))

vi.mock('@/services/GameViewService', () => ({
	reorderGameViews: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./GameViewModal', () => ({
	default: ({ onClose, onSave }: { onClose: () => void; onSave: () => void }) => (
		<div data-testid='game-view-modal'>
			<button onClick={onClose}>MockClose</button>
			<button onClick={onSave}>MockSave</button>
		</div>
	),
}))

vi.mock('./ViewTemplates', () => ({
	default: ({ onClose }: { onClose: () => void }) => (
		<div data-testid='view-templates'>
			<button onClick={onClose}>MockTemplateClose</button>
		</div>
	),
}))

vi.mock('@/components/elements/ReorderButtons/ReorderButtons', () => ({
	ReorderButtons: () => <div data-testid='reorder-buttons' />,
}))

vi.mock('./AdminGameViews.scss', () => ({}))

async function loadComponent() {
	const mod = await import('./AdminGameViews')
	return mod.AdminGameViews
}

describe('AdminGameViews', () => {
	beforeEach(() => vi.clearAllMocks())

	it('renders heading', async () => {
		const C = await loadComponent()
		render(<C />)
		expect(screen.getByText('Gestión de Vistas de Juegos')).toBeInTheDocument()
	})

	it('renders game views in table', async () => {
		const C = await loadComponent()
		render(<C />)
		expect(screen.getByText('My View')).toBeInTheDocument()
		expect(screen.getByText('Another View')).toBeInTheDocument()
	})

	it('renders table headers', async () => {
		const C = await loadComponent()
		render(<C />)
		expect(screen.getByText('Nombre')).toBeInTheDocument()
		expect(screen.getByText('Acciones')).toBeInTheDocument()
	})

	it('has search input', async () => {
		const C = await loadComponent()
		render(<C />)
		expect(screen.getByPlaceholderText('Buscar vistas...')).toBeInTheDocument()
	})

	it('opens modal when clicking Nueva Vista', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		render(<C />)
		await user.click(screen.getByText('Nueva Vista'))
		expect(screen.getByTestId('game-view-modal')).toBeInTheDocument()
	})

	it('opens templates panel on button click', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		render(<C />)
		await user.click(screen.getByText(/Plantillas/))
		expect(screen.getByTestId('view-templates')).toBeInTheDocument()
	})

	it('calls deleteGameView on confirm', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
		render(<C />)
		const deleteButtons = screen.getAllByText('Eliminar')
		await user.click(deleteButtons[0])
		expect(mockDeleteGameView).toHaveBeenCalledWith(1)
		vi.restoreAllMocks()
	})

	it('does not delete when confirm is cancelled', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		vi.spyOn(globalThis, 'confirm').mockReturnValue(false)
		render(<C />)
		const deleteButtons = screen.getAllByText('Eliminar')
		await user.click(deleteButtons[0])
		expect(mockDeleteGameView).not.toHaveBeenCalled()
		vi.restoreAllMocks()
	})

	it('loads game views on mount', async () => {
		const C = await loadComponent()
		render(<C />)
		expect(mockLoadGameViews).toHaveBeenCalled()
	})

	it('shows import panel on toggle', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		render(<C />)
		await user.click(screen.getByText(/Importar Vista/))
		expect(screen.getByPlaceholderText(/name.*Mi Vista/)).toBeInTheDocument()
	})

	it('renders reorder buttons for each view', async () => {
		const C = await loadComponent()
		render(<C />)
		expect(screen.getAllByTestId('reorder-buttons')).toHaveLength(2)
	})
})
