import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders as render } from '@/test/utils/renderWithProviders'

vi.mock('@/components/elements', () => ({
	Modal: ({ isOpen, title, children, footer }: { isOpen: boolean; title: string; children: React.ReactNode; footer?: React.ReactNode }) =>
		isOpen ? (
			<div data-testid='modal'>
				<h2>{title}</h2>
				<div>{children}</div>
				<div>{footer}</div>
			</div>
		) : null,
}))

const { mockSelectiveExport, mockDownloadBlob } = vi.hoisted(() => ({
	mockSelectiveExport: vi.fn().mockResolvedValue(new Blob(['csv-data'])),
	mockDownloadBlob: vi.fn(),
}))

vi.mock('@/services', () => ({
	selectiveExportGames: mockSelectiveExport,
	downloadBlob: mockDownloadBlob,
	buildExportFileName: vi.fn(() => 'games-export.json'),
}))

vi.mock('./shared/GameSelectorPanel', () => ({
	default: ({ onSelectionChange }: { onSelectionChange: (games: Array<{ id: number; name: string }>) => void }) => (
		<div data-testid='game-selector'>
			<button
				onClick={() =>
					onSelectionChange([
						{ id: 1, name: 'Elden Ring' },
						{ id: 2, name: 'Zelda' },
					])
				}>
				Select Games
			</button>
		</div>
	),
}))

vi.mock('./shared/PropertyConfigPanel', () => ({
	default: () => <div data-testid='property-config-panel' />,
}))

vi.mock('./SelectiveExportModal.scss', () => ({}))

async function loadComponent() {
	const mod = await import('./SelectiveExportModal')
	return mod.default
}

describe('SelectiveExportModal', () => {
	const mockOnClose = vi.fn()

	beforeEach(() => vi.clearAllMocks())

	it('returns null when not open', async () => {
		const C = await loadComponent()
		const { container } = render(<C isOpen={false} onClose={mockOnClose} />)
		expect(container.innerHTML).toBe('')
	})

	it('renders modal with title when open', async () => {
		const C = await loadComponent()
		render(<C isOpen={true} onClose={mockOnClose} />)
		expect(screen.getByText('Exportar Juegos')).toBeInTheDocument()
	})

	it('renders section headings', async () => {
		const C = await loadComponent()
		render(<C isOpen={true} onClose={mockOnClose} />)
		expect(screen.getByText('1. Seleccionar Juegos')).toBeInTheDocument()
		expect(screen.getByText('2. Opciones de Exportación Globales')).toBeInTheDocument()
	})

	it('shows game selector panel', async () => {
		const C = await loadComponent()
		render(<C isOpen={true} onClose={mockOnClose} />)
		expect(screen.getByTestId('game-selector')).toBeInTheDocument()
	})

	it('updates export button count after selecting games', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		render(<C isOpen={true} onClose={mockOnClose} />)
		await user.click(screen.getByText('Select Games'))
		expect(screen.getByText(/Exportar \(2\)/)).toBeInTheDocument()
	})

	it('shows per-game overrides section after selecting games', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		render(<C isOpen={true} onClose={mockOnClose} />)
		await user.click(screen.getByText('Select Games'))
		expect(screen.getByText(/Anulaciones por Juego/)).toBeInTheDocument()
	})

	it('exports successfully', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		render(<C isOpen={true} onClose={mockOnClose} />)
		await user.click(screen.getByText('Select Games'))
		await user.click(screen.getByText(/Exportar \(2\)/))
		await vi.waitFor(() => {
			expect(mockSelectiveExport).toHaveBeenCalled()
			expect(mockDownloadBlob).toHaveBeenCalled()
		})
	})

	it('renders with preSelectedGames', async () => {
		const C = await loadComponent()
		render(<C isOpen={true} onClose={mockOnClose} preSelectedGames={[{ id: 1, name: 'Zelda' }]} />)
		expect(screen.getByText(/Exportar \(1\)/)).toBeInTheDocument()
	})
})
