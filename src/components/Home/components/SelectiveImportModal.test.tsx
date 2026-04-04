import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

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

const mockSelectiveImport = vi.fn().mockResolvedValue({ imported: 3, updated: 1, errors: [] })
const mockParseCSV = vi.fn().mockResolvedValue(['Elden Ring', 'Zelda', 'Hades'])

vi.mock('@/services', () => ({
	selectiveImportGames: mockSelectiveImport,
	parseCSVGameNames: mockParseCSV,
}))

vi.mock('./shared/PropertyConfigPanel', () => ({
	default: () => <div data-testid='property-config-panel' />,
}))

vi.mock('./SelectiveImportModal.scss', () => ({}))

async function loadComponent() {
	const mod = await import('./SelectiveImportModal')
	return mod.default
}

describe('SelectiveImportModal', () => {
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
		expect(screen.getByText('Import Games')).toBeInTheDocument()
	})

	it('renders CSV source section', async () => {
		const C = await loadComponent()
		render(<C isOpen={true} onClose={mockOnClose} />)
		expect(screen.getByText('1. CSV Source')).toBeInTheDocument()
	})

	it('shows upload file radio selected by default', async () => {
		const C = await loadComponent()
		render(<C isOpen={true} onClose={mockOnClose} />)
		expect(screen.getByLabelText('Upload File')).toBeChecked()
	})

	it('switches to paste text mode', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		render(<C isOpen={true} onClose={mockOnClose} />)
		await user.click(screen.getByLabelText('Paste Text'))
		expect(screen.getByPlaceholderText('Paste CSV content here…')).toBeInTheDocument()
	})

	it('shows import button', async () => {
		const C = await loadComponent()
		render(<C isOpen={true} onClose={mockOnClose} />)
		expect(screen.getByText('Import')).toBeInTheDocument()
	})

	it('shows cancel button', async () => {
		const C = await loadComponent()
		render(<C isOpen={true} onClose={mockOnClose} />)
		expect(screen.getByText('Cancel')).toBeInTheDocument()
	})
})
