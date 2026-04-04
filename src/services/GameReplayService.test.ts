import { getReplaysByGameId, createGameReplay, updateGameReplay, deleteGameReplay } from './GameReplayService'
import { customFetch } from '@/utils/customFetch'

vi.mock('@/utils/customFetch', () => ({
	customFetch: vi.fn(),
}))

const mockFetch = vi.mocked(customFetch)

describe('GameReplayService', () => {
	beforeEach(() => vi.clearAllMocks())

	it('getReplaysByGameId calls GET', async () => {
		mockFetch.mockResolvedValue([])
		const result = await getReplaysByGameId(5)
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/5'), expect.objectContaining({ method: 'GET' }))
		expect(result).toEqual([])
	})

	it('createGameReplay calls POST', async () => {
		const created = { id: 1, gameId: 5 }
		mockFetch.mockResolvedValue(created)
		const result = await createGameReplay(5, { replayTypeId: 1 } as any)
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/5'), expect.objectContaining({ method: 'POST' }))
		expect(result).toEqual(created)
	})

	it('updateGameReplay calls PUT', async () => {
		mockFetch.mockResolvedValue(undefined)
		await updateGameReplay(5, 10, { replayTypeId: 2 } as any)
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/5'), expect.objectContaining({ method: 'PUT' }))
	})

	it('deleteGameReplay calls DELETE', async () => {
		mockFetch.mockResolvedValue(undefined)
		await deleteGameReplay(5, 10)
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/5'), expect.objectContaining({ method: 'DELETE' }))
	})
})
