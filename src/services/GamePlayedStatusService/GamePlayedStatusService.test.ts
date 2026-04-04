import {
	getGamePlayedStatuses,
	getActiveGamePlayedStatuses,
	getGamePlayedStatusById,
	createGamePlayedStatus,
	updateGamePlayedStatus,
	deleteGamePlayedStatus,
	reorderGamePlayedStatuses,
} from './GamePlayedStatusService'
import { customFetch } from '@/utils/customFetch'

vi.mock('@/utils/customFetch', () => ({
	customFetch: vi.fn(),
}))

const mockFetch = vi.mocked(customFetch)

describe('GamePlayedStatusService', () => {
	beforeEach(() => vi.clearAllMocks())

	it('getGamePlayedStatuses calls GET', async () => {
		mockFetch.mockResolvedValue({ data: [], totalCount: 0 })
		await getGamePlayedStatuses()
		expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: 'GET' }))
	})

	it('getActiveGamePlayedStatuses calls GET on active', async () => {
		mockFetch.mockResolvedValue([])
		await getActiveGamePlayedStatuses()
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('active'), expect.objectContaining({ method: 'GET' }))
	})

	it('getGamePlayedStatusById calls GET with id', async () => {
		mockFetch.mockResolvedValue({ id: 1 })
		await getGamePlayedStatusById(1)
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/1'), expect.objectContaining({ method: 'GET' }))
	})

	it('createGamePlayedStatus calls POST', async () => {
		mockFetch.mockResolvedValue({ id: 2 })
		await createGamePlayedStatus({ name: 'Completed' } as any)
		expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: 'POST' }))
	})

	it('updateGamePlayedStatus calls PUT', async () => {
		mockFetch.mockResolvedValue(undefined)
		await updateGamePlayedStatus(1, { name: 'Updated' } as any)
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/1'), expect.objectContaining({ method: 'PUT' }))
	})

	it('deleteGamePlayedStatus calls DELETE', async () => {
		mockFetch.mockResolvedValue(undefined)
		await deleteGamePlayedStatus(1)
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/1'), expect.objectContaining({ method: 'DELETE' }))
	})

	it('reorderGamePlayedStatuses calls POST', async () => {
		mockFetch.mockResolvedValue(undefined)
		await reorderGamePlayedStatuses([1, 2, 3])
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('reorder'), expect.objectContaining({ method: 'POST' }))
	})
})
