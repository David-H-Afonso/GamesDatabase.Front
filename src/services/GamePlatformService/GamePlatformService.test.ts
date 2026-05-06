import {
	getGamePlatforms,
	getActiveGamePlatforms,
	getGamePlatformById,
	createGamePlatform,
	updateGamePlatform,
	deleteGamePlatform,
	reorderGamePlatforms,
} from './GamePlatformService'
import { customFetch } from '@/utils/customFetch'

vi.mock('@/utils/customFetch', () => ({
	customFetch: vi.fn(),
}))

const mockFetch = vi.mocked(customFetch)

describe('GamePlatformService', () => {
	beforeEach(() => vi.clearAllMocks())

	it('getGamePlatforms calls GET', async () => {
		mockFetch.mockResolvedValue({ data: [], totalCount: 0 })
		await getGamePlatforms()
		expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: 'GET' }))
	})

	it('getActiveGamePlatforms calls GET on active endpoint', async () => {
		mockFetch.mockResolvedValue([])
		await getActiveGamePlatforms()
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('active'), expect.objectContaining({ method: 'GET' }))
	})

	it('getGamePlatformById calls GET with id', async () => {
		mockFetch.mockResolvedValue({ id: 1 })
		await getGamePlatformById(1)
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/1'), expect.objectContaining({ method: 'GET' }))
	})

	it('createGamePlatform calls POST', async () => {
		mockFetch.mockResolvedValue({ id: 2 })
		await createGamePlatform({ name: 'PS5' } as any)
		expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: 'POST' }))
	})

	it('updateGamePlatform calls PUT', async () => {
		mockFetch.mockResolvedValue(undefined)
		await updateGamePlatform(1, { name: 'Updated' } as any)
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/1'), expect.objectContaining({ method: 'PUT' }))
	})

	it('deleteGamePlatform calls DELETE', async () => {
		mockFetch.mockResolvedValue(undefined)
		await deleteGamePlatform(1)
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/1'), expect.objectContaining({ method: 'DELETE' }))
	})

	it('reorderGamePlatforms calls POST', async () => {
		mockFetch.mockResolvedValue(undefined)
		await reorderGamePlatforms([1, 2, 3])
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('reorder'), expect.objectContaining({ method: 'POST' }))
	})
})
