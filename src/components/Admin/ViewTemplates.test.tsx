import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterField, SortField } from '@/models/api/GameView'

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
		expect(screen.getByText('Jugados en Año')).toBeInTheDocument()
		expect(screen.getByText('Mejores por Score')).toBeInTheDocument()
		expect(screen.getByText('Mejores por Nota')).toBeInTheDocument()
		expect(screen.getByText('Lanzados en Año')).toBeInTheDocument()
		expect(screen.getByText('Añadidos Recientemente')).toBeInTheDocument()
	})

	it('shows config view when clicking a template with params', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		render(<C onCreateFromTemplate={mockOnCreate} onClose={mockOnClose} />)
		await user.click(screen.getByText('GOTY'))
		expect(screen.getByText('Configurar plantilla')).toBeInTheDocument()
		expect(screen.getByText('Año')).toBeInTheDocument()
	})

	it('lets played-year sort by relevant grade', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		render(<C onCreateFromTemplate={mockOnCreate} onClose={mockOnClose} />)
		await user.click(screen.getByText('Jugados en Año'))
		await user.selectOptions(screen.getByDisplayValue('Fecha relevante'), 'grade')
		await user.click(screen.getByText('Crear Vista'))
		expect(mockOnCreate).toHaveBeenLastCalledWith(
			expect.objectContaining({
				name: expect.stringContaining('(nota)'),
				configuration: expect.objectContaining({
					sorting: expect.arrayContaining([
						expect.objectContaining({ field: SortField.EffectiveGrade, order: 1 }),
						expect.objectContaining({ field: SortField.EffectiveFinished, order: 2 }),
						expect.objectContaining({ field: SortField.EffectiveStarted, order: 3 }),
					]),
				}),
			})
		)
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

	it('generates replay-aware sorting for year templates', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		render(<C onCreateFromTemplate={mockOnCreate} onClose={mockOnClose} />)

		await user.click(screen.getByText('GOTY'))
		await user.click(screen.getByText('Crear Vista'))
		expect(mockOnCreate).toHaveBeenLastCalledWith(
			expect.objectContaining({
				configuration: expect.objectContaining({
					filterGroups: expect.arrayContaining([
						expect.objectContaining({
							filters: expect.arrayContaining([expect.objectContaining({ field: FilterField.ReplayReleased })]),
						}),
					]),
					sorting: expect.arrayContaining([expect.objectContaining({ field: SortField.EffectiveGrade })]),
				}),
			})
		)

		mockOnCreate.mockClear()
		await user.click(screen.getByText('← Volver'))
		await user.click(screen.getByText('Jugados en Año'))
		await user.click(screen.getByText('Crear Vista'))
		expect(mockOnCreate).toHaveBeenLastCalledWith(
			expect.objectContaining({
				configuration: expect.objectContaining({
					filterGroups: expect.arrayContaining([
						expect.objectContaining({
							filters: expect.arrayContaining([expect.objectContaining({ field: FilterField.ReplayStarted }), expect.objectContaining({ field: FilterField.ReplayFinished })]),
						}),
					]),
					sorting: expect.arrayContaining([expect.objectContaining({ field: SortField.EffectiveFinished }), expect.objectContaining({ field: SortField.EffectiveStarted })]),
				}),
			})
		)

		mockOnCreate.mockClear()
		await user.click(screen.getByText('← Volver'))
		await user.click(screen.getByText('Lanzados en Año'))
		await user.click(screen.getByText('Crear Vista'))
		expect(mockOnCreate).toHaveBeenLastCalledWith(
			expect.objectContaining({
				configuration: expect.objectContaining({
					filterGroups: expect.arrayContaining([
						expect.objectContaining({
							filters: expect.arrayContaining([expect.objectContaining({ field: FilterField.ReplayReleased })]),
						}),
					]),
					sorting: expect.arrayContaining([expect.objectContaining({ field: SortField.EffectiveReleased })]),
				}),
			})
		)
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
