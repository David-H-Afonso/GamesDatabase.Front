import { getHistoryByGameId, deleteHistoryEntry, clearGameHistory, getGlobalHistory, getAdminHistory } from './GameHistoryService'
import { customFetch } from '@/utils/customFetch'

vi.mock('@/utils/customFetch', () => ({
	customFetch: vi.fn(),
}))

const mockFetch = vi.mocked(customFetch)

describe('GameHistoryService', () => {
	beforeEach(() => vi.clearAllMocks())

	it('getHistoryByGameId calls GET with gameId, page and pageSize', async () => {
		const pagedResult = { items: [], totalCount: 0, page: 1, pageSize: 50 }
		mockFetch.mockResolvedValue(pagedResult)
		const result = await getHistoryByGameId(42, 2, 25)
		expect(mockFetch).toHaveBeenCalledWith('/games/42/history', expect.objectContaining({ method: 'GET', params: { page: 2, pageSize: 25 } }))
		expect(result).toEqual(pagedResult)
	})

	it('getHistoryByGameId uses default page and pageSize', async () => {
		mockFetch.mockResolvedValue({ items: [] })
		await getHistoryByGameId(1)
		expect(mockFetch).toHaveBeenCalledWith('/games/1/history', expect.objectContaining({ params: { page: 1, pageSize: 50 } }))
	})

	it('deleteHistoryEntry calls DELETE with gameId and entryId', async () => {
		mockFetch.mockResolvedValue(undefined)
		await deleteHistoryEntry(10, 5)
		expect(mockFetch).toHaveBeenCalledWith('/games/10/history/5', expect.objectContaining({ method: 'DELETE' }))
	})

	it('clearGameHistory calls DELETE on game history', async () => {
		mockFetch.mockResolvedValue(undefined)
		await clearGameHistory(10)
		expect(mockFetch).toHaveBeenCalledWith('/games/10/history', expect.objectContaining({ method: 'DELETE' }))
	})

	it('getGlobalHistory calls GET with params', async () => {
		mockFetch.mockResolvedValue({ items: [] })
		await getGlobalHistory({ page: 1, pageSize: 10 })
		expect(mockFetch).toHaveBeenCalledWith('/games/history', expect.objectContaining({ method: 'GET' }))
	})

	it('getAdminHistory calls GET on admin endpoint', async () => {
		mockFetch.mockResolvedValue({ items: [] })
		await getAdminHistory()
		expect(mockFetch).toHaveBeenCalledWith('/admin/history', expect.objectContaining({ method: 'GET' }))
	})
})
