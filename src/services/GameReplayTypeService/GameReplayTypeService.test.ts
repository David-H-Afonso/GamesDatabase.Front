import {
	getGameReplayTypes,
	getActiveGameReplayTypes,
	getSpecialGameReplayType,
	getGameReplayTypeById,
	createGameReplayType,
	updateGameReplayType,
	deleteGameReplayType,
	reorderGameReplayTypes,
} from './GameReplayTypeService'
import { customFetch } from '@/utils/customFetch'

vi.mock('@/utils/customFetch', () => ({
	customFetch: vi.fn(),
}))

const mockFetch = vi.mocked(customFetch)

describe('GameReplayTypeService', () => {
	beforeEach(() => vi.clearAllMocks())

	it('getGameReplayTypes calls GET with params', async () => {
		mockFetch.mockResolvedValue({ data: [], totalCount: 0 })
		await getGameReplayTypes({ page: 1 } as any)
		expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: 'GET' }))
	})

	it('getActiveGameReplayTypes calls GET on active endpoint', async () => {
		mockFetch.mockResolvedValue([])
		await getActiveGameReplayTypes()
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('active'), expect.objectContaining({ method: 'GET' }))
	})

	it('getSpecialGameReplayType calls GET on special endpoint', async () => {
		mockFetch.mockResolvedValue({ id: 1 })
		await getSpecialGameReplayType()
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('special'), expect.objectContaining({ method: 'GET' }))
	})

	it('getGameReplayTypeById calls GET with id', async () => {
		mockFetch.mockResolvedValue({ id: 5 })
		await getGameReplayTypeById(5)
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/5'), expect.objectContaining({ method: 'GET' }))
	})

	it('createGameReplayType calls POST', async () => {
		mockFetch.mockResolvedValue({ id: 6 })
		await createGameReplayType({ name: 'NG+' } as any)
		expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: 'POST' }))
	})

	it('updateGameReplayType calls PUT', async () => {
		mockFetch.mockResolvedValue(undefined)
		await updateGameReplayType(5, { name: 'Updated' } as any)
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/5'), expect.objectContaining({ method: 'PUT' }))
	})

	it('deleteGameReplayType calls DELETE', async () => {
		mockFetch.mockResolvedValue(undefined)
		await deleteGameReplayType(5)
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/5'), expect.objectContaining({ method: 'DELETE' }))
	})

	it('reorderGameReplayTypes calls POST with orderedIds', async () => {
		mockFetch.mockResolvedValue(undefined)
		await reorderGameReplayTypes([1, 2, 3])
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('reorder'), expect.objectContaining({ method: 'POST', body: [1, 2, 3] }))
	})
})
