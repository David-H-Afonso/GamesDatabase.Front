import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/services/DataExportService', () => ({
	exportFullDatabase: vi.fn().mockResolvedValue(new Blob(['csv-data'])),
	downloadBlob: vi.fn(),
	importFullDatabase: vi.fn().mockResolvedValue({ message: 'Import successful', details: { gamesImported: 10 } }),
	syncToNetwork: vi.fn().mockResolvedValue({ message: 'Sync done' }),
	analyzeFolders: vi.fn().mockResolvedValue({
		totalGamesInDatabase: 5,
		totalFoldersInFilesystem: 5,
		difference: 0,
		potentialDuplicates: [],
		orphanFolders: [],
		missingGameFolders: [],
		databaseDuplicates: { totalGamesInDatabase: 5, duplicateGroups: [] },
	}),
	analyzeDatabaseDuplicates: vi.fn().mockResolvedValue({ totalGamesInDatabase: 5, duplicateGroups: [] }),
	deleteOrphanFolder: vi.fn().mockResolvedValue({ folderName: 'Old Game', deleted: true, message: 'Deleted' }),
	deleteDuplicateGame: vi.fn().mockResolvedValue({ gameId: 1, deleted: true, message: 'Deleted' }),
	dismissDuplicateGames: vi.fn().mockResolvedValue({ dismissed: 1, message: 'Dismissed' }),
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

// Static import so the first test does not pay the ESM transform cost against testTimeout.
import { AdminDataExport } from './AdminDataExport'

describe('AdminDataExport', () => {
	beforeEach(() => vi.clearAllMocks())

	it('renders main heading', () => {
		render(<AdminDataExport />)
		expect(screen.getByText('Importar/Exportar')).toBeInTheDocument()
	})

	it('renders export section', () => {
		render(<AdminDataExport />)
		expect(screen.getByText(/Exportar Base de Datos Completa/)).toBeInTheDocument()
		expect(screen.getByText(/Exportar CSV/)).toBeInTheDocument()
	})

	it('renders import section', () => {
		render(<AdminDataExport />)
		expect(screen.getByText(/Importar Base de Datos Completa/)).toBeInTheDocument()
	})

	it('renders duplicates section', () => {
		render(<AdminDataExport />)
		expect(screen.getByText(/Duplicados en Base de Datos/)).toBeInTheDocument()
		expect(screen.getByText(/Buscar Duplicados/)).toBeInTheDocument()
	})

	it('renders instructions section', () => {
		render(<AdminDataExport />)
		expect(screen.getByText(/Instrucciones y Casos de Uso/)).toBeInTheDocument()
	})

	it('exports CSV when clicking export button', async () => {
		const { exportFullDatabase, downloadBlob } = await import('@/services/DataExportService')
		const user = userEvent.setup()
		render(<AdminDataExport />)
		await user.click(screen.getByText(/Exportar CSV/))
		expect(exportFullDatabase).toHaveBeenCalled()
		await vi.waitFor(() => expect(downloadBlob).toHaveBeenCalled())
	})

	it('searches for duplicates when clicking button', async () => {
		const { analyzeDatabaseDuplicates } = await import('@/services/DataExportService')
		const user = userEvent.setup()
		render(<AdminDataExport />)
		await user.click(screen.getByText(/Buscar Duplicados/))
		expect(analyzeDatabaseDuplicates).toHaveBeenCalled()
	})

	it('shows network sync section on localhost', () => {
		const originalLocation = globalThis.location
		Object.defineProperty(globalThis, 'location', {
			value: { ...originalLocation, hostname: 'localhost' },
			writable: true,
		})
		render(<AdminDataExport />)
		expect(screen.getByText(/Sincronizar con Red/)).toBeInTheDocument()
		Object.defineProperty(globalThis, 'location', { value: originalLocation, writable: true })
	})

	const makeDuplicateGroupResult = () => ({
		totalGamesInDatabase: 2,
		duplicateGroups: [
			{
				normalizedKey: '1|2',
				matchType: 'exact',
				confidence: 100,
				reason: 'Coincidencia exacta: mismo título normalizado o el mismo Steam App ID.',
				games: [
					{
						id: 1,
						name: 'God of War',
						platformName: 'PC',
						folderName: 'God_of_War',
						folderPath: '/share/1/Games/God_of_War',
						folderExists: true,
						filesystemChecked: true,
						isExported: true,
						lastExportedAt: '2026-01-01T00:00:00Z',
						logoDownloaded: true,
						coverDownloaded: true,
						createdAt: '2025-01-01',
						updatedAt: '2025-02-01',
					},
					{
						id: 2,
						name: 'GOD OF WAR',
						platformName: 'PC',
						folderName: 'GOD_OF_WAR',
						folderExists: false,
						filesystemChecked: true,
						isExported: false,
					},
				],
			},
		],
	})

	it('lists orphan folders with reason, size and delete action', async () => {
		const { analyzeFolders } = await import('@/services/DataExportService')
		vi.mocked(analyzeFolders).mockResolvedValueOnce({
			totalGamesInDatabase: 3,
			totalFoldersInFilesystem: 4,
			difference: 1,
			potentialDuplicates: [],
			orphanFolders: [
				{
					folderName: 'Old_Game',
					fullPath: '/share/1/Games/Old_Game',
					reason: 'La carpeta existe en el almacenamiento pero su nombre no coincide con ningún juego de la base de datos.',
					createdAt: '2025-01-01T00:00:00Z',
					modifiedAt: '2025-02-01T00:00:00Z',
					sizeBytes: 10_485_760,
					fileCount: 12,
				},
			],
			missingGameFolders: [],
			databaseDuplicates: { totalGamesInDatabase: 3, duplicateGroups: [] },
		})

		const user = userEvent.setup()
		render(<AdminDataExport />)
		await user.click(screen.getByText(/Analizar Carpetas/))

		expect(await screen.findByText('Old_Game')).toBeInTheDocument()
		expect(screen.getByText(/no coincide con ningún juego/)).toBeInTheDocument()
		expect(screen.getByText(/10 MB/)).toBeInTheDocument()
		expect(screen.getByText(/12 archivo/)).toBeInTheDocument()
		expect(screen.getByText('Borrar')).toBeInTheDocument()
	})

	it('shows duplicate comparison with folder and export status', async () => {
		const { analyzeDatabaseDuplicates } = await import('@/services/DataExportService')
		vi.mocked(analyzeDatabaseDuplicates).mockResolvedValueOnce(makeDuplicateGroupResult())

		const user = userEvent.setup()
		render(<AdminDataExport />)
		await user.click(screen.getByText(/Buscar Duplicados/))

		expect(await screen.findByText('God of War')).toBeInTheDocument()
		expect(screen.getByText('GOD OF WAR')).toBeInTheDocument()
		// Folder association is shown per duplicate record
		expect(screen.getByText(/God_of_War/)).toBeInTheDocument()
		// Export status labels rendered
		expect(screen.getAllByText('Exportado').length).toBeGreaterThan(0)
		expect(screen.getByText('No exportado')).toBeInTheDocument()
		// One delete button per record + dismiss action
		expect(screen.getAllByText('Borrar este')).toHaveLength(2)
		expect(screen.getByText(/Descartar falso positivo/)).toBeInTheDocument()
	})

	it('deletes a duplicate game only after confirmation', async () => {
		const { analyzeDatabaseDuplicates, deleteDuplicateGame } = await import('@/services/DataExportService')
		vi.mocked(analyzeDatabaseDuplicates).mockResolvedValueOnce(makeDuplicateGroupResult())

		const user = userEvent.setup()
		render(<AdminDataExport />)
		await user.click(screen.getByText(/Buscar Duplicados/))
		await screen.findByText('God of War')

		await user.click(screen.getAllByText('Borrar este')[0])

		const dialog = await screen.findByRole('alertdialog')
		await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

		expect(deleteDuplicateGame).toHaveBeenCalledWith(1)
	})

	it('does not delete a duplicate game when confirmation is cancelled', async () => {
		const { analyzeDatabaseDuplicates, deleteDuplicateGame } = await import('@/services/DataExportService')
		vi.mocked(analyzeDatabaseDuplicates).mockResolvedValueOnce(makeDuplicateGroupResult())

		const user = userEvent.setup()
		render(<AdminDataExport />)
		await user.click(screen.getByText(/Buscar Duplicados/))
		await screen.findByText('God of War')

		await user.click(screen.getAllByText('Borrar este')[0])

		const dialog = await screen.findByRole('alertdialog')
		await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

		expect(deleteDuplicateGame).not.toHaveBeenCalled()
	})
})
