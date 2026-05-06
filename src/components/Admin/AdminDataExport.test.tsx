import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/services/DataExportService', () => ({
	exportFullDatabase: vi.fn().mockResolvedValue(new Blob(['csv-data'])),
	downloadBlob: vi.fn(),
	importFullDatabase: vi.fn().mockResolvedValue({ message: 'Import successful', details: { gamesImported: 10 } }),
	syncToNetwork: vi.fn().mockResolvedValue({ message: 'Sync done' }),
	analyzeFolders: vi.fn().mockResolvedValue({ summary: { totalFolders: 5 }, duplicates: [], orphans: [] }),
	analyzeDatabaseDuplicates: vi.fn().mockResolvedValue({ duplicateGroups: [] }),
	updateImageUrls: vi.fn().mockResolvedValue({ updated: 3 }),
	clearImageCache: vi.fn().mockResolvedValue({ message: 'Cache cleared' }),
}))

vi.mock('@/hooks/useGames', () => ({
	useGames: () => ({
		refreshGames: vi.fn(),
		filters: {},
	}),
}))

vi.mock('./AdminDataExport.scss', () => ({}))

async function loadComponent() {
	const mod = await import('./AdminDataExport')
	return mod.AdminDataExport
}

describe('AdminDataExport', () => {
	beforeEach(() => vi.clearAllMocks())

	it('renders main heading', async () => {
		const C = await loadComponent()
		render(<C />)
		expect(screen.getByText('Importar/Exportar Datos')).toBeInTheDocument()
	})

	it('renders export section', async () => {
		const C = await loadComponent()
		render(<C />)
		expect(screen.getByText(/Exportar Base de Datos Completa/)).toBeInTheDocument()
		expect(screen.getByText(/Exportar CSV/)).toBeInTheDocument()
	})

	it('renders import section', async () => {
		const C = await loadComponent()
		render(<C />)
		expect(screen.getByText(/Importar Base de Datos Completa/)).toBeInTheDocument()
	})

	it('renders duplicates section', async () => {
		const C = await loadComponent()
		render(<C />)
		expect(screen.getByText(/Duplicados en Base de Datos/)).toBeInTheDocument()
		expect(screen.getByText(/Buscar Duplicados/)).toBeInTheDocument()
	})

	it('renders instructions section', async () => {
		const C = await loadComponent()
		render(<C />)
		expect(screen.getByText(/Instrucciones y Casos de Uso/)).toBeInTheDocument()
	})

	it('exports CSV when clicking export button', async () => {
		const { exportFullDatabase, downloadBlob } = await import('@/services/DataExportService')
		const C = await loadComponent()
		const user = userEvent.setup()
		render(<C />)
		await user.click(screen.getByText(/Exportar CSV/))
		expect(exportFullDatabase).toHaveBeenCalled()
		await vi.waitFor(() => expect(downloadBlob).toHaveBeenCalled())
	})

	it('searches for duplicates when clicking button', async () => {
		const { analyzeDatabaseDuplicates } = await import('@/services/DataExportService')
		const C = await loadComponent()
		const user = userEvent.setup()
		render(<C />)
		await user.click(screen.getByText(/Buscar Duplicados/))
		expect(analyzeDatabaseDuplicates).toHaveBeenCalled()
	})

	it('shows network sync section on localhost', async () => {
		const originalLocation = globalThis.location
		Object.defineProperty(globalThis, 'location', {
			value: { ...originalLocation, hostname: 'localhost' },
			writable: true,
		})
		const C = await loadComponent()
		render(<C />)
		expect(screen.getByText(/Sincronizar a Red/)).toBeInTheDocument()
		Object.defineProperty(globalThis, 'location', { value: originalLocation, writable: true })
	})
})
