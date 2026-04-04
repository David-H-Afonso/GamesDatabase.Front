import { getGames, getGameById, createGame, updateGame, deleteGame, bulkUpdateGames } from './GamesService'
import { customFetch } from '@/utils/customFetch'

vi.mock('@/utils/customFetch', () => ({
	customFetch: vi.fn(),
}))

const mockFetch = vi.mocked(customFetch)

describe('GamesService', () => {
	beforeEach(() => vi.clearAllMocks())

	it('getGames calls GET with query params', async () => {
		const pagedResult = { items: [], totalCount: 0, page: 1, pageSize: 50 }
		mockFetch.mockResolvedValue(pagedResult)
		const result = await getGames({ page: 2, pageSize: 25 })
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/games'), expect.objectContaining({ method: 'GET' }))
		expect(result).toEqual(pagedResult)
	})

	it('getGameById calls GET with id', async () => {
		const game = { id: 1, name: 'Zelda' }
		mockFetch.mockResolvedValue(game)
		const result = await getGameById(1)
		expect(mockFetch).toHaveBeenCalledWith('/games/1', expect.objectContaining({ method: 'GET' }))
		expect(result).toEqual(game)
	})

	it('createGame calls POST with game data', async () => {
		const created = { id: 2, name: 'Elden Ring' }
		mockFetch.mockResolvedValue(created)
		const result = await createGame({ name: 'Elden Ring' } as any)
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/games'), expect.objectContaining({ method: 'POST', body: { name: 'Elden Ring' } }))
		expect(result).toEqual(created)
	})

	it('updateGame calls PUT with id and data', async () => {
		mockFetch.mockResolvedValue(undefined)
		await updateGame(1, { name: 'Updated' } as any)
		expect(mockFetch).toHaveBeenCalledWith('/games/1', expect.objectContaining({ method: 'PUT' }))
	})

	it('deleteGame calls DELETE with id', async () => {
		mockFetch.mockResolvedValue(undefined)
		await deleteGame(1)
		expect(mockFetch).toHaveBeenCalledWith('/games/1', expect.objectContaining({ method: 'DELETE' }))
	})

	it('bulkUpdateGames calls PATCH on bulk endpoint', async () => {
		const result = { updatedCount: 3, errors: [] }
		mockFetch.mockResolvedValue(result)
		const data = { gameIds: [1, 2, 3], statusId: 5 } as any
		const res = await bulkUpdateGames(data)
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/games/bulk'), expect.objectContaining({ method: 'PATCH', body: data }))
		expect(res).toEqual(result)
	})
})
