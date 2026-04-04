import {
	downloadBlob,
	parseCSVGameNames,
	exportGamesCSV,
	importGamesCSV,
	exportFullDatabase,
	importFullDatabase,
	exportToZip,
	syncToNetwork,
	analyzeFolders,
	analyzeDatabaseDuplicates,
	updateImageUrls,
	clearImageCache,
	selectiveExportGames,
	selectiveImportGames,
} from './DataExportService'
import { customFetch } from '@/utils/customFetch'

vi.mock('@/utils/customFetch', () => ({
	customFetch: vi.fn(),
}))

const mockFetch = vi.mocked(customFetch)

describe('DataExportService', () => {
	beforeEach(() => vi.clearAllMocks())
	describe('downloadBlob', () => {
		it('creates a download link, clicks it, and cleans up', () => {
			const mockClick = vi.fn()
			const fakeAnchor = { href: '', download: '', click: mockClick } as unknown as HTMLAnchorElement
			const mockCreateElement = vi.spyOn(document, 'createElement').mockReturnValue(fakeAnchor)
			const mockAppendChild = vi.spyOn(document.body, 'appendChild').mockReturnValue(fakeAnchor)
			const mockRemoveChild = vi.spyOn(document.body, 'removeChild').mockReturnValue(fakeAnchor)
			const mockCreateObjectURL = vi.fn().mockReturnValue('blob:test')
			const mockRevokeObjectURL = vi.fn()
			globalThis.URL.createObjectURL = mockCreateObjectURL
			globalThis.URL.revokeObjectURL = mockRevokeObjectURL

			const blob = new Blob(['test-data'], { type: 'text/csv' })
			downloadBlob(blob, 'export.csv')

			expect(mockCreateObjectURL).toHaveBeenCalledWith(blob)
			expect(mockAppendChild).toHaveBeenCalledWith(fakeAnchor)
			expect(mockClick).toHaveBeenCalled()
			expect(mockRemoveChild).toHaveBeenCalledWith(fakeAnchor)
			expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test')

			mockCreateElement.mockRestore()
			mockAppendChild.mockRestore()
			mockRemoveChild.mockRestore()
		})

		it('throws when blob is empty', () => {
			const blob = new Blob([], { type: 'text/csv' })
			expect(() => downloadBlob(blob, 'export.csv')).toThrow('File is empty')
		})
	})

	describe('parseCSVGameNames', () => {
		it('parses game names from CSV string', async () => {
			const csv = 'Type,Name,Status\nGame,Elden Ring,Playing\nGame,Zelda,Completed'
			const result = await parseCSVGameNames(csv)
			expect(result).toContain('Elden Ring')
			expect(result).toContain('Zelda')
		})

		it('handles quoted CSV values', async () => {
			const csv = 'Type,Name,Status\nGame,"The Legend of Zelda",Playing'
			const result = await parseCSVGameNames(csv)
			expect(result).toContain('The Legend of Zelda')
		})

		it('returns empty array for empty input', async () => {
			const result = await parseCSVGameNames('')
			expect(result).toEqual([])
		})

		it('skips non-Game rows', async () => {
			const csv = 'Type,Name,Status\nPlatform,PC,Active\nGame,Zelda,Done'
			const result = await parseCSVGameNames(csv)
			expect(result).toEqual(['Zelda'])
		})

		it('returns empty when Type or Name column is missing', async () => {
			const csv = 'Foo,Bar\nGame,Test'
			const result = await parseCSVGameNames(csv)
			expect(result).toEqual([])
		})

		it('reads from a File object', async () => {
			const file = new File(['Type,Name\nGame,Test Game'], 'test.csv', { type: 'text/csv' })
			const result = await parseCSVGameNames(file)
			expect(result).toEqual(['Test Game'])
		})

		it('handles escaped quotes in CSV', async () => {
			const csv = 'Type,Name\nGame,"Game with ""quotes"""\nGame,Normal'
			const result = await parseCSVGameNames(csv)
			expect(result).toEqual(['Game with "quotes"', 'Normal'])
		})
	})

	describe('API service functions', () => {
		it('exportGamesCSV returns a Blob', async () => {
			mockFetch.mockResolvedValue('csv,data\nrow1,row2')
			const blob = await exportGamesCSV()
			expect(blob).toBeInstanceOf(Blob)
			expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: 'GET' }))
		})

		it('importGamesCSV sends FormData', async () => {
			mockFetch.mockResolvedValue({ success: true })
			const file = new File(['csv'], 'test.csv')
			await importGamesCSV(file)
			expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: 'POST', body: expect.any(FormData) }))
		})

		it('exportFullDatabase returns a Blob', async () => {
			mockFetch.mockResolvedValue('full,data')
			const blob = await exportFullDatabase()
			expect(blob).toBeInstanceOf(Blob)
		})

		it('importFullDatabase sends FormData', async () => {
			mockFetch.mockResolvedValue({ message: 'OK', catalogs: {}, games: {} })
			const file = new File(['csv'], 'full.csv')
			const result = await importFullDatabase(file)
			expect(result.message).toBe('OK')
		})

		it('exportToZip returns a Blob', async () => {
			mockFetch.mockResolvedValue(new ArrayBuffer(8))
			const blob = await exportToZip()
			expect(blob).toBeInstanceOf(Blob)
		})

		it('exportToZip passes fullExport param', async () => {
			mockFetch.mockResolvedValue(new ArrayBuffer(8))
			await exportToZip(false)
			expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('false'), expect.any(Object))
		})

		it('syncToNetwork calls POST', async () => {
			mockFetch.mockResolvedValue({ message: 'Synced' })
			const result = await syncToNetwork(true)
			expect(result.message).toBe('Synced')
			expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: 'POST' }))
		})

		it('analyzeFolders calls GET', async () => {
			mockFetch.mockResolvedValue({ totalGamesInDatabase: 100, totalFoldersInFilesystem: 95 })
			const result = await analyzeFolders()
			expect(result.totalGamesInDatabase).toBe(100)
		})

		it('analyzeDatabaseDuplicates calls GET', async () => {
			mockFetch.mockResolvedValue({ totalGamesInDatabase: 50, duplicateGroups: [] })
			const result = await analyzeDatabaseDuplicates()
			expect(result.duplicateGroups).toEqual([])
		})

		it('updateImageUrls calls POST', async () => {
			mockFetch.mockResolvedValue({ totalGames: 10, updatedGames: 3 })
			const result = await updateImageUrls()
			expect(result.updatedGames).toBe(3)
		})

		it('clearImageCache calls POST', async () => {
			mockFetch.mockResolvedValue({ deletedFiles: 42, message: 'Cleared' })
			const result = await clearImageCache()
			expect(result.deletedFiles).toBe(42)
		})

		it('selectiveExportGames returns a Blob', async () => {
			mockFetch.mockResolvedValue('selective,csv')
			const blob = await selectiveExportGames({ gameIds: [1, 2], globalConfig: {} } as any)
			expect(blob).toBeInstanceOf(Blob)
			expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: 'POST' }))
		})

		it('selectiveImportGames with File sends FormData', async () => {
			mockFetch.mockResolvedValue({ imported: 5 })
			const file = new File(['csv'], 'import.csv')
			await selectiveImportGames(file, { globalConfig: {} } as any)
			const body = mockFetch.mock.calls[0][1]?.body
			expect(body).toBeInstanceOf(FormData)
		})

		it('selectiveImportGames with string sends csvText in FormData', async () => {
			mockFetch.mockResolvedValue({ imported: 3 })
			await selectiveImportGames('Type,Name\nGame,Test', { globalConfig: {} } as any)
			const body = mockFetch.mock.calls[0][1]?.body as FormData
			expect(body.get('csvText')).toBe('Type,Name\nGame,Test')
		})
	})
})
