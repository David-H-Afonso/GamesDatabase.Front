import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders as render } from '@/test/utils/renderWithProviders'
import i18n from '@/i18n'

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
	default: ({ onChange, headingLabel }: { onChange: (config: { mode: 'customCleared' }) => void; headingLabel?: string }) => <div data-testid='property-config-panel'>{headingLabel && <button type='button' onClick={() => onChange({ mode: 'customCleared' })}>Set fixture override</button>}</div>,
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

	it('associates both filename fields with their visible labels', async () => {
		const C = await loadComponent()
		render(<C isOpen onClose={mockOnClose} />)
		expect(screen.getByRole('textbox', { name: i18n.t('home.exportModal.filePrefix') })).toBeInTheDocument()
		expect(screen.getByRole('textbox', { name: i18n.t('home.exportModal.fileSuffix') })).toBeInTheDocument()
	})

	it('keeps the active override Reset outside the disclosure button and restores local focus without changing export scope', async () => {
		const C = await loadComponent(), user = userEvent.setup()
		render(<C isOpen onClose={mockOnClose} preSelectedGames={[{ id: 101, name: 'Fixture export game' }]} />)
		const disclosure = screen.getByRole('button', { name: /Fixture export game/ })
		await user.click(disclosure)
		await user.click(screen.getByRole('button', { name: 'Set fixture override' }))
		const reset = screen.getByRole('button', { name: i18n.t('home.exportModal.resetOverride') })
		expect(reset.parentElement?.closest('button')).toBeNull()
		await user.click(screen.getByRole('button', { name: /Exportar \(1\)/ }))
		expect(mockSelectiveExport).toHaveBeenLastCalledWith({ gameIds: [101], globalConfig: { mode: 'simple' }, perGameConfig: { 101: { mode: 'customCleared' } } })
		await user.click(reset)
		expect(disclosure).toHaveFocus()
		expect(disclosure).toHaveAttribute('aria-expanded', 'true')
		expect(screen.queryByRole('button', { name: i18n.t('home.exportModal.resetOverride') })).not.toBeInTheDocument()
		await user.click(screen.getByRole('button', { name: /Exportar \(1\)/ }))
		expect(mockSelectiveExport).toHaveBeenLastCalledWith({ gameIds: [101], globalConfig: { mode: 'simple' }, perGameConfig: undefined })
	})
})
