import {
	getGamePlayWithOptions,
	getActiveGamePlayWithOptions,
	getGamePlayWithById,
	createGamePlayWith,
	updateGamePlayWith,
	deleteGamePlayWith,
	reorderGamePlayWith,
} from './GamePlayWithService'
import { customFetch } from '@/utils/customFetch'

vi.mock('@/utils/customFetch', () => ({
	customFetch: vi.fn(),
}))

const mockFetch = vi.mocked(customFetch)

describe('GamePlayWithService', () => {
	beforeEach(() => vi.clearAllMocks())

	it('getGamePlayWithOptions calls GET', async () => {
		mockFetch.mockResolvedValue({ data: [], totalCount: 0 })
		await getGamePlayWithOptions()
		expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: 'GET' }))
	})

	it('getActiveGamePlayWithOptions calls GET on active', async () => {
		mockFetch.mockResolvedValue([])
		await getActiveGamePlayWithOptions()
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('active'), expect.objectContaining({ method: 'GET' }))
	})

	it('getGamePlayWithById calls GET with id', async () => {
		mockFetch.mockResolvedValue({ id: 1 })
		await getGamePlayWithById(1)
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/1'), expect.objectContaining({ method: 'GET' }))
	})

	it('createGamePlayWith calls POST', async () => {
		mockFetch.mockResolvedValue({ id: 2 })
		await createGamePlayWith({ name: 'Co-op' } as any)
		expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: 'POST' }))
	})

	it('updateGamePlayWith calls PUT', async () => {
		mockFetch.mockResolvedValue(undefined)
		await updateGamePlayWith(1, { name: 'Updated' } as any)
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/1'), expect.objectContaining({ method: 'PUT' }))
	})

	it('deleteGamePlayWith calls DELETE', async () => {
		mockFetch.mockResolvedValue(undefined)
		await deleteGamePlayWith(1)
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/1'), expect.objectContaining({ method: 'DELETE' }))
	})

	it('reorderGamePlayWith calls POST', async () => {
		mockFetch.mockResolvedValue(undefined)
		await reorderGamePlayWith([1, 2, 3])
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('reorder'), expect.objectContaining({ method: 'POST' }))
	})
})
