import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

const mockSelectiveImport = vi.fn().mockResolvedValue({ imported: 3, updated: 1, errors: [] })
const mockParseCSV = vi.fn().mockResolvedValue(['Elden Ring', 'Zelda', 'Hades'])

vi.mock('@/services', () => ({
	selectiveImportGames: mockSelectiveImport,
	parseCSVGameNames: mockParseCSV,
}))

vi.mock('./shared/PropertyConfigPanel', () => ({
	default: ({ config, onChange, headingLabel }: { config: { mode: string }; onChange: (config: { mode: 'customCleared' }) => void; headingLabel?: string }) => (
		<div data-testid='property-config-panel' data-mode={config.mode}>
			{headingLabel && <button type='button' onClick={() => onChange({ mode: 'customCleared' })}>Set fixture override</button>}
		</div>
	),
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
		expect(screen.getByText('Importar Juegos')).toBeInTheDocument()
	})

	it('renders CSV source section', async () => {
		const C = await loadComponent()
		render(<C isOpen={true} onClose={mockOnClose} />)
		expect(screen.getByText('1. Fuente CSV')).toBeInTheDocument()
	})

	it('shows upload file radio selected by default', async () => {
		const C = await loadComponent()
		render(<C isOpen={true} onClose={mockOnClose} />)
		expect(screen.getByLabelText('Subir Archivo')).toBeChecked()
	})

	it('switches to paste text mode', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		render(<C isOpen={true} onClose={mockOnClose} />)
		await user.click(screen.getByLabelText('Pegar Texto'))
		expect(screen.getByPlaceholderText('Pega el contenido CSV aquí…')).toBeInTheDocument()
	})

	it('retains the native radio-group keyboard interaction for its source choices', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		render(<C isOpen={true} onClose={mockOnClose} />)
		screen.getByRole('radio', { name: 'Subir Archivo' }).focus()
		await user.keyboard('{ArrowRight}')
		expect(screen.getByRole('radio', { name: 'Pegar Texto' })).toBeChecked()
		expect(screen.getByPlaceholderText('Pega el contenido CSV aquí…')).toBeInTheDocument()
	})

	it('shows import button', async () => {
		const C = await loadComponent()
		render(<C isOpen={true} onClose={mockOnClose} />)
		expect(screen.getByText('Importar')).toBeInTheDocument()
	})

	it('shows cancel button', async () => {
		const C = await loadComponent()
		render(<C isOpen={true} onClose={mockOnClose} />)
		expect(screen.getByText('Cancelar')).toBeInTheDocument()
	})

	it.each(['pointer', 'keyboard'] as const)('keeps Reset outside its disclosure and returns local focus after %s activation without changing import scope', async (activation) => {
		const C = await loadComponent()
		const user = userEvent.setup()
		const csv = 'Type,Name\nGame,Amber Trail'
		mockParseCSV.mockResolvedValueOnce(['Amber Trail'])
		render(<C isOpen onClose={mockOnClose} />)
		await user.click(screen.getByRole('radio', { name: i18n.t('home.importModal.pasteText') }))
		await user.click(screen.getByPlaceholderText(i18n.t('home.importModal.textareaPlaceholder')))
		await user.paste(csv)
		const disclosure = await screen.findByRole('button', { name: /Amber Trail/ })
		expect(disclosure).toHaveAttribute('aria-expanded', 'false')
		expect(mockParseCSV).toHaveBeenLastCalledWith(csv)
		await user.click(disclosure)
		await user.click(screen.getByRole('button', { name: 'Set fixture override' }))
		const reset = screen.getByRole('button', { name: i18n.t('home.importModal.resetOverride') })
		expect(reset.parentElement?.closest('button')).toBeNull()
		const region = screen.getByRole('region', { name: /Amber Trail/ })
		expect(region).toHaveAttribute('id', disclosure.getAttribute('aria-controls'))
		const importButton = screen.getByRole('button', { name: i18n.t('home.importModal.importBtn', { count: 1 }) })
		await user.click(importButton)
		expect(mockSelectiveImport).toHaveBeenLastCalledWith(csv, { globalConfig: { mode: 'simple' }, perGameConfig: { 'Amber Trail': { mode: 'customCleared' } } })
		if (activation === 'keyboard') {
			await user.click(screen.getByRole('button', { name: 'Set fixture override' }))
			await user.tab({ shift: true })
			expect(reset).toHaveFocus()
			await user.keyboard('{Enter}')
		} else {
			await user.click(reset)
		}
		expect(disclosure).toHaveFocus()
		expect(disclosure).toHaveAttribute('aria-expanded', 'true')
		expect(screen.queryByRole('button', { name: i18n.t('home.importModal.resetOverride') })).not.toBeInTheDocument()
		expect(within(region).getByTestId('property-config-panel')).toHaveAttribute('data-mode', 'simple')
		await user.click(importButton)
		expect(mockSelectiveImport).toHaveBeenLastCalledWith(csv, { globalConfig: { mode: 'simple' }, perGameConfig: undefined })
		expect(mockSelectiveImport).toHaveBeenCalledTimes(2)
	})

	it('gives the readonly parsed-name preview a named keyboard scrolling stop without importing', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		const names = Array.from({ length: 55 }, (_, index) => `Preview game ${index + 1}`)
		const csv = ['Type,Name', ...names.map(name => `Game,${name}`)].join('\n')
		mockParseCSV.mockResolvedValueOnce(names)
		render(<C isOpen onClose={mockOnClose} />)
		await user.click(screen.getByRole('radio', { name: i18n.t('home.importModal.pasteText') }))
		await user.click(screen.getByPlaceholderText(i18n.t('home.importModal.textareaPlaceholder')))
		await user.paste(csv)
		const preview = await screen.findByRole('region', { name: i18n.t('home.importModal.section2', { count: names.length }) })
		expect(preview).toHaveAttribute('tabindex', '0')
		expect(within(preview).getByText(names[0]!)).toBeInTheDocument()
		expect(within(preview).getByText(names.at(-1)!)).toBeInTheDocument()
		await user.tab()
		expect(preview).toHaveFocus()
		expect(mockParseCSV).toHaveBeenLastCalledWith(csv)
		expect(mockSelectiveImport).not.toHaveBeenCalled()
	})
})
