import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'

vi.mock('./GameDataActions.scss', () => ({}))

vi.mock('@/components/Home/components/SelectiveExportModal', () => ({
	default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid='export-modal'>Export Modal</div> : null),
}))

vi.mock('@/components/Home/components/SelectiveImportModal', () => ({
	default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid='import-modal'>Import Modal</div> : null),
}))

async function loadComponent() {
	const mod = await import('./GameDataActions')
	return mod.default
}

describe('GameDataActions', () => {
	beforeEach(() => vi.clearAllMocks())

	it('renders export button', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />)
		expect(screen.getByTitle('Export games to CSV')).toBeInTheDocument()
		expect(screen.getByText('Export')).toBeInTheDocument()
	})

	it('renders import button', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />)
		expect(screen.getByTitle('Import games from CSV')).toBeInTheDocument()
		expect(screen.getByText('Import')).toBeInTheDocument()
	})

	it('opens export modal when clicking export', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<C />)
		expect(screen.queryByTestId('export-modal')).not.toBeInTheDocument()
		await user.click(screen.getByTitle('Export games to CSV'))
		expect(screen.getByTestId('export-modal')).toBeInTheDocument()
	})

	it('opens import modal when clicking import', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<C />)
		expect(screen.queryByTestId('import-modal')).not.toBeInTheDocument()
		await user.click(screen.getByTitle('Import games from CSV'))
		expect(screen.getByTestId('import-modal')).toBeInTheDocument()
	})
})
