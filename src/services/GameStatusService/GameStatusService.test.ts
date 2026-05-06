import {
	getGameStatuses,
	getSpecialGameStatuses,
	getActiveGameStatuses,
	getGameStatusById,
	createGameStatus,
	updateGameStatus,
	deleteGameStatus,
	reassignSpecialStatuses,
	reorderGameStatuses,
} from './GameStatusService'
import { customFetch } from '@/utils/customFetch'

vi.mock('@/utils/customFetch', () => ({
	customFetch: vi.fn(),
}))

const mockFetch = vi.mocked(customFetch)

describe('GameStatusService', () => {
	beforeEach(() => vi.clearAllMocks())

	it('getGameStatuses calls GET with params', async () => {
		mockFetch.mockResolvedValue({ data: [], totalCount: 0 })
		await getGameStatuses({ page: 1 } as any)
		expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: 'GET' }))
	})

	it('getSpecialGameStatuses calls GET on special endpoint', async () => {
		mockFetch.mockResolvedValue([])
		await getSpecialGameStatuses()
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('special'), expect.objectContaining({ method: 'GET' }))
	})

	it('getActiveGameStatuses calls GET on active endpoint', async () => {
		mockFetch.mockResolvedValue([])
		await getActiveGameStatuses()
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('active'), expect.objectContaining({ method: 'GET' }))
	})

	it('getGameStatusById calls GET with id', async () => {
		mockFetch.mockResolvedValue({ id: 1 })
		await getGameStatusById(1)
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/1'), expect.objectContaining({ method: 'GET' }))
	})

	it('createGameStatus calls POST', async () => {
		mockFetch.mockResolvedValue({ id: 2 })
		await createGameStatus({ name: 'New' } as any)
		expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: 'POST' }))
	})

	it('updateGameStatus calls PUT', async () => {
		mockFetch.mockResolvedValue(undefined)
		await updateGameStatus(1, { name: 'Updated' } as any)
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/1'), expect.objectContaining({ method: 'PUT' }))
	})

	it('deleteGameStatus calls DELETE', async () => {
		mockFetch.mockResolvedValue(undefined)
		await deleteGameStatus(1)
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/1'), expect.objectContaining({ method: 'DELETE' }))
	})

	it('reassignSpecialStatuses calls POST', async () => {
		mockFetch.mockResolvedValue(undefined)
		await reassignSpecialStatuses({ newDefaultStatusId: 5, statusType: 'default' })
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('reassign'), expect.objectContaining({ method: 'POST' }))
	})

	it('reorderGameStatuses calls POST with orderedIds', async () => {
		mockFetch.mockResolvedValue(undefined)
		await reorderGameStatuses([1, 2, 3])
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('reorder'), expect.objectContaining({ method: 'POST' }))
	})
})
