import { getGameViews, getGameViewById, createGameView, updateGameView, deleteGameView, getPublicGameViews, updateGameViewConfiguration, reorderGameViews, setGameViewPinned } from './GameViewService'
import { customFetch } from '@/utils/customFetch'

vi.mock('@/utils/customFetch', () => ({
	customFetch: vi.fn(),
}))

const mockFetch = vi.mocked(customFetch)

describe('GameViewService', () => {
	beforeEach(() => vi.clearAllMocks())
	it('pins through a dedicated cancellable preference request without resaving filters', async () => {
		const controller = new AbortController(), views = [{ id: 1, pinnedSlot: 2 }, { id: 2, pinnedSlot: null }]
		mockFetch.mockResolvedValue(views)
		expect(await setGameViewPinned(1, true, 2, controller.signal)).toBe(views)
		expect(mockFetch).toHaveBeenCalledExactlyOnceWith('/gameviews/1/pin', { method: 'POST', body: { pinned: true, slot: 2 }, signal: controller.signal })
	})
	it('accepts an explicit unpin and omitted preferred slot', async () => {
		mockFetch.mockResolvedValue([{ id: 1, pinnedSlot: null }])
		await setGameViewPinned(1, false)
		expect(mockFetch).toHaveBeenCalledWith('/gameviews/1/pin', expect.objectContaining({ body: { pinned: false } }))
	})
	it.each([null, {}, [], [null], [{ id: 1 }], [{ id: 2, pinnedSlot: 1 }], [{ id: 1, pinnedSlot: null }], [{ id: 1, pinnedSlot: 3 }], [{ id: 1, pinnedSlot: 1 }, { id: 2, pinnedSlot: 1 }], [{ id: 1, pinnedSlot: 1 }, { id: 1, pinnedSlot: 2 }], [{ id: 1, pinnedSlot: 1 }, { id: 0, pinnedSlot: null }]].map(answer => ({ answer })))('rejects malformed or contradictory authoritative pins %#', async ({ answer }) => {
		mockFetch.mockResolvedValue(answer)
		await expect(setGameViewPinned(1, true)).rejects.toThrow('Invalid pinned views')
	})
	it('validates identifiers and slot bounds before sending a request', async () => {
		await expect(setGameViewPinned(0, true)).rejects.toThrow('Invalid view pin request')
		await expect(setGameViewPinned(1, true, 3)).rejects.toThrow('Invalid view pin request')
		expect(mockFetch).not.toHaveBeenCalled()
	})

	it('getGameViews calls GET', async () => {
		mockFetch.mockResolvedValue([])
		const result = await getGameViews()
		expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: 'GET' }))
		expect(result).toEqual([])
	})

	it('getGameViewById calls GET with id', async () => {
		mockFetch.mockResolvedValue({ id: 1, name: 'View1' })
		const result = await getGameViewById(1)
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/1'), expect.objectContaining({ method: 'GET' }))
		expect(result).toEqual({ id: 1, name: 'View1' })
	})

	it('createGameView with filterGroups sends POST', async () => {
		const created = { id: 10, name: 'New' }
		mockFetch.mockResolvedValue(created)
		await createGameView({
			name: 'New',
			description: 'desc',
			isPublic: true,
			configuration: {
				filterGroups: [{ combineWith: 'And', filters: [{ field: 'Name', operator: 'Contains', value: 'x' }] }],
				groupCombineWith: 'And',
			},
		} as any)
		expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: 'POST', body: expect.objectContaining({ name: 'New' }) }))
	})

	it('createGameView with legacy filters wraps into filterGroups', async () => {
		mockFetch.mockResolvedValue({ id: 11 })
		await createGameView({
			name: 'Legacy',
			description: 'desc',
			configuration: {
				filters: [{ field: 'Name', operator: 'Contains', value: 'y' }],
				groupCombineWith: 'Or',
			},
		} as any)
		const body = mockFetch.mock.calls[0][1]?.body as any
		expect(body.configuration.filterGroups).toHaveLength(1)
		expect(body.configuration.filterGroups[0].combineWith).toBe('Or')
	})

	it('createGameView with sorting includes sorting', async () => {
		mockFetch.mockResolvedValue({ id: 12 })
		await createGameView({
			name: 'Sorted',
			configuration: {
				filterGroups: [{ combineWith: 'And', filters: [] }],
				groupCombineWith: 'And',
				sorting: [{ field: 'Name', direction: 'Ascending', order: 1 }],
			},
		} as any)
		const body = mockFetch.mock.calls[0][1]?.body as any
		expect(body.configuration.sorting).toHaveLength(1)
	})

	it('updateGameView with filterGroups sends PUT', async () => {
		mockFetch.mockResolvedValue(undefined)
		await updateGameView(5, {
			name: 'Updated',
			description: 'desc',
			isPublic: true,
			configuration: {
				filterGroups: [{ combineWith: 'And', filters: [] }],
				groupCombineWith: 'And',
			},
		} as any)
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/5'), expect.objectContaining({ method: 'PUT', body: expect.objectContaining({ id: 5, name: 'Updated' }) }))
	})

	it('updateGameView with legacy filters wraps into filterGroups', async () => {
		mockFetch.mockResolvedValue(undefined)
		await updateGameView(6, {
			name: 'LegacyUpdate',
			configuration: {
				filters: [{ field: 'Score', operator: 'GreaterThan', value: '80' }],
				groupCombineWith: 'And',
				sorting: [{ field: 'Score', direction: 'Descending', order: 1 }],
			},
		} as any)
		const body = mockFetch.mock.calls[0][1]?.body as any
		expect(body.id).toBe(6)
		expect(body.configuration.filterGroups).toHaveLength(1)
		expect(body.configuration.sorting).toHaveLength(1)
	})

	it('deleteGameView calls DELETE', async () => {
		mockFetch.mockResolvedValue(undefined)
		await deleteGameView(3)
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/3'), expect.objectContaining({ method: 'DELETE' }))
	})

	it('getPublicGameViews calls getGameViews with isPublic', async () => {
		mockFetch.mockResolvedValue([{ id: 1, name: 'Public', isPublic: true }, { id: 2, name: 'Private', isPublic: false }])
		const result = await getPublicGameViews()
		expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ params: expect.objectContaining({ isPublic: true }) }))
		expect(result).toHaveLength(1)
		expect(result[0].id).toBe(1)
	})

	it('updateGameViewConfiguration calls PUT on /configuration', async () => {
		mockFetch.mockResolvedValue({ id: 7 })
		await updateGameViewConfiguration(7, { filters: [] })
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/7/configuration'), expect.objectContaining({ method: 'PUT', body: { filters: [] } }))
	})

	it('reorderGameViews calls POST on /reorder', async () => {
		mockFetch.mockResolvedValue(undefined)
		await reorderGameViews([1, 2, 3])
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('reorder'), expect.objectContaining({ method: 'POST', body: { orderedIds: [1, 2, 3] } }))
	})

	it('createGameView with legacy filters defaults groupCombineWith to And', async () => {
		mockFetch.mockResolvedValue({ id: 13 })
		await createGameView({
			name: 'Legacy No Combine',
			description: '',
			configuration: {
				filters: [{ field: 'Name', operator: 'Contains', value: 'z' }],
			},
		} as any)
		const body = mockFetch.mock.calls[0][1]?.body as any
		expect(body.configuration.filterGroups[0].combineWith).toBe('And')
	})

	it('updateGameView with legacy filters defaults groupCombineWith to And', async () => {
		mockFetch.mockResolvedValue(undefined)
		await updateGameView(7, {
			name: 'Legacy No Combine',
			configuration: {
				filters: [{ field: 'Name', operator: 'Contains', value: 'z' }],
			},
		} as any)
		const body = mockFetch.mock.calls[0][1]?.body as any
		expect(body.configuration.filterGroups[0].combineWith).toBe('And')
	})
})
