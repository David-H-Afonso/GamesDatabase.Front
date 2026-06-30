import { describe, it, expect, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useAdminCrud, type AdminCrudController } from './useAdminCrud'

interface Item {
	id: number
	sortOrder: number
	name: string
}

const itemsInOrder = (order: number[]): Item[] => order.map((id, index) => ({ id, sortOrder: index + 1, name: `Item ${id}` }))

const makeController = (overrides: Partial<AdminCrudController<Item, unknown, unknown>> = {}): AdminCrudController<Item, unknown, unknown> => ({
	items: itemsInOrder([1, 2, 3]),
	loading: false,
	error: null,
	pagination: { page: 1, totalPages: 1, totalCount: 3 },
	load: vi.fn().mockResolvedValue(undefined),
	create: vi.fn().mockResolvedValue(undefined),
	update: vi.fn().mockResolvedValue(undefined),
	remove: vi.fn().mockResolvedValue(undefined),
	reorder: vi.fn().mockResolvedValue(undefined),
	...overrides,
})

describe('useAdminCrud', () => {
	it('sorts items by sortOrder and loads on mount', async () => {
		const controller = makeController({ items: itemsInOrder([3, 1, 2]) })
		const { result } = renderHook(() => useAdminCrud(controller))
		await waitFor(() => expect(controller.load).toHaveBeenCalledWith({ page: 1, pageSize: expect.any(Number) }))
		expect(result.current.items.map((item) => item.id)).toEqual([3, 1, 2])
	})

	it('reorders optimistically before the backend resolves', async () => {
		let resolveReorder: () => void = () => {}
		const reorder = vi.fn().mockImplementation(() => new Promise<void>((resolve) => (resolveReorder = resolve)))
		const controller = makeController({ reorder })
		const { result } = renderHook(() => useAdminCrud(controller))
		await waitFor(() => expect(controller.load).toHaveBeenCalled())

		let pending: Promise<void>
		await act(async () => {
			pending = result.current.reorderTo([3, 2, 1])
		})

		expect(result.current.items.map((item) => item.id)).toEqual([3, 2, 1])
		expect(result.current.isReordering).toBe(true)
		expect(reorder).toHaveBeenCalledWith([3, 2, 1])

		await act(async () => {
			resolveReorder()
			await pending
		})
		expect(result.current.isReordering).toBe(false)
		expect(result.current.reorderError).toBe(false)
	})

	it('rolls back and flags reorderError when the backend rejects', async () => {
		const reorder = vi.fn().mockRejectedValue(new Error('nope'))
		const controller = makeController({ reorder })
		const { result } = renderHook(() => useAdminCrud(controller))
		await waitFor(() => expect(controller.load).toHaveBeenCalled())

		await act(async () => {
			await result.current.reorderTo([3, 2, 1])
		})

		expect(result.current.reorderError).toBe(true)
		expect(result.current.items.map((item) => item.id)).toEqual([1, 2, 3])

		act(() => result.current.clearReorderError())
		expect(result.current.reorderError).toBe(false)
	})

	it('move computes the new order and delegates to reorder', async () => {
		const reorder = vi.fn().mockResolvedValue(undefined)
		const controller = makeController({ reorder })
		const { result } = renderHook(() => useAdminCrud(controller))
		await waitFor(() => expect(controller.load).toHaveBeenCalled())

		await act(async () => {
			await result.current.move(1, 'down')
		})
		expect(reorder).toHaveBeenCalledWith([2, 1, 3])
	})
})
