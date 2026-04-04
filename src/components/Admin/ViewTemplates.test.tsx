import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

async function loadComponent() {
	const mod = await import('./ViewTemplates')
	return mod.default
}

describe('ViewTemplates', () => {
	const mockOnCreate = vi.fn().mockResolvedValue(undefined)
	const mockOnClose = vi.fn()

	beforeEach(() => vi.clearAllMocks())

	it('renders template selection heading', async () => {
		const C = await loadComponent()
		render(<C onCreateFromTemplate={mockOnCreate} onClose={mockOnClose} />)
		expect(screen.getByText('Crear desde plantilla')).toBeInTheDocument()
	})

	it('renders 6 template cards', async () => {
		const C = await loadComponent()
		render(<C onCreateFromTemplate={mockOnCreate} onClose={mockOnClose} />)
		expect(screen.getByText('GOTY')).toBeInTheDocument()
		expect(screen.getByText('Jugados en año')).toBeInTheDocument()
		expect(screen.getByText('Mejores por Score')).toBeInTheDocument()
		expect(screen.getByText('Mejores por Nota')).toBeInTheDocument()
		expect(screen.getByText('Lanzados en año')).toBeInTheDocument()
		expect(screen.getByText('Añadidos recientemente')).toBeInTheDocument()
	})

	it('shows config view when clicking a template with params', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		render(<C onCreateFromTemplate={mockOnCreate} onClose={mockOnClose} />)
		await user.click(screen.getByText('GOTY'))
		expect(screen.getByText('Configurar plantilla')).toBeInTheDocument()
		expect(screen.getByText('Año')).toBeInTheDocument()
	})

	it('back button returns to template grid', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		render(<C onCreateFromTemplate={mockOnCreate} onClose={mockOnClose} />)
		await user.click(screen.getByText('GOTY'))
		await user.click(screen.getByText('← Volver'))
		expect(screen.getByText('Crear desde plantilla')).toBeInTheDocument()
	})

	it('calls onClose when close button clicked', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		render(<C onCreateFromTemplate={mockOnCreate} onClose={mockOnClose} />)
		await user.click(screen.getByText('×'))
		expect(mockOnClose).toHaveBeenCalled()
	})

	it('calls onCreateFromTemplate with valid data', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		render(<C onCreateFromTemplate={mockOnCreate} onClose={mockOnClose} />)
		await user.click(screen.getByText('GOTY'))
		await user.click(screen.getByText('Crear Vista'))
		expect(mockOnCreate).toHaveBeenCalledWith(expect.objectContaining({ name: expect.stringContaining('GOTY') }))
	})

	it('shows year input defaulting to current year for GOTY template', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		render(<C onCreateFromTemplate={mockOnCreate} onClose={mockOnClose} />)
		await user.click(screen.getByText('GOTY'))
		const yearInput = screen.getByDisplayValue(new Date().getFullYear().toString())
		expect(yearInput).toBeInTheDocument()
	})
})
