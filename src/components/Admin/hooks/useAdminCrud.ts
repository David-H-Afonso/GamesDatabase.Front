import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_PAGE_SIZE } from '@/components/elements/TablePagination/constants'

export interface AdminCrudPagination {
	page: number
	totalPages: number
	totalCount: number
}

export interface AdminCrudController<T, TCreate, TUpdate> {
	items: T[]
	loading: boolean
	error: string | null
	pagination: AdminCrudPagination
	load: (params: { page: number; pageSize: number }) => Promise<unknown>
	create: (dto: TCreate) => Promise<unknown>
	update: (id: number, dto: TUpdate) => Promise<unknown>
	remove: (id: number) => Promise<unknown>
	reorder: (orderedIds: number[]) => Promise<unknown>
}

export interface UseAdminCrudOptions<T> {
	defaultPageSize?: number
	getId?: (item: T) => number
	getSortKey?: (item: T) => number
}

const defaultGetId = <T,>(item: T) => (item as { id: number }).id

export const useAdminCrud = <T, TCreate, TUpdate>(controller: AdminCrudController<T, TCreate, TUpdate>, options: UseAdminCrudOptions<T> = {}) => {
	const { defaultPageSize = DEFAULT_PAGE_SIZE, getId = defaultGetId, getSortKey } = options
	const { items, loading, error, pagination, load, create, update, remove, reorder } = controller

	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(defaultPageSize)
	const [isReordering, setIsReordering] = useState(false)
	const [optimisticItems, setOptimisticItems] = useState<T[] | null>(null)
	const [reorderError, setReorderError] = useState(false)

	useEffect(() => {
		void load({ page, pageSize })
	}, [load, page, pageSize])

	const reload = useCallback(() => load({ page, pageSize }), [load, page, pageSize])

	const sortedItems = useMemo(() => {
		const keyOf = getSortKey ?? ((item: T) => (item as { sortOrder?: number }).sortOrder ?? getId(item))
		return [...items].sort((a, b) => keyOf(a) - keyOf(b))
	}, [items, getSortKey, getId])

	const currentItems = optimisticItems ?? sortedItems

	const handlePageChange = useCallback((next: number) => setPage(next), [])

	const handlePageSizeChange = useCallback((size: number) => {
		setPageSize(size)
		setPage(1)
	}, [])

	const clearReorderError = useCallback(() => setReorderError(false), [])

	const reorderTo = useCallback(
		async (orderedIds: number[]) => {
			if (isReordering) return
			const byId = new Map(currentItems.map((item) => [getId(item), item]))
			const next = orderedIds.map((id) => byId.get(id)).filter((item): item is T => item !== undefined)
			setReorderError(false)
			setOptimisticItems(next)
			setIsReordering(true)
			try {
				await reorder(orderedIds)
				await reload()
				setOptimisticItems(null)
			} catch {
				setOptimisticItems(null)
				setReorderError(true)
			} finally {
				setIsReordering(false)
			}
		},
		[isReordering, currentItems, getId, reorder, reload]
	)

	const move = useCallback(
		async (id: number, direction: 'up' | 'down') => {
			const ordered = [...currentItems]
			const currentIndex = ordered.findIndex((item) => getId(item) === id)
			if (currentIndex === -1) return
			const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
			if (targetIndex < 0 || targetIndex >= ordered.length) return
			const [moved] = ordered.splice(currentIndex, 1)
			ordered.splice(targetIndex, 0, moved)
			await reorderTo(ordered.map(getId))
		},
		[currentItems, getId, reorderTo]
	)

	const createItem = useCallback(
		async (dto: TCreate) => {
			await create(dto)
			await reload()
		},
		[create, reload]
	)

	const updateItem = useCallback(
		async (id: number, dto: TUpdate) => {
			await update(id, dto)
			await reload()
		},
		[update, reload]
	)

	const removeItem = useCallback(
		async (id: number) => {
			await remove(id)
			await reload()
		},
		[remove, reload]
	)

	return {
		items: currentItems,
		loading,
		error,
		pagination,
		page,
		pageSize,
		isReordering,
		reorderError,
		clearReorderError,
		handlePageChange,
		handlePageSizeChange,
		move,
		reorderTo,
		reload,
		createItem,
		updateItem,
		removeItem,
	}
}
