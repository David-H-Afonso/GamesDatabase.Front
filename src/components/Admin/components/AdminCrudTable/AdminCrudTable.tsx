import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable, ColorSwatch, DragHandle, StatusPill, type DataTableColumn } from '@/components/elements/DataTable/DataTable'
import { TablePagination } from '@/components/elements/TablePagination/TablePagination'
import { ReorderButtons } from '@/components/elements/ReorderButtons/ReorderButtons'
import { IconButton } from '@/components/elements/IconButton/IconButton'
import { ConfirmDialog } from '@/components/elements'
import EditIcon from '@/assets/svgs/edit.svg?react'
import DeleteIcon from '@/assets/svgs/trashbin.svg?react'
import './AdminCrudTable.scss'

export interface AdminCrudTableProps<T> {
	items: T[]
	loading?: boolean
	getRowId?: (item: T) => number
	getColor: (item: T) => string | null | undefined
	getActive: (item: T) => boolean
	renderName?: (item: T) => ReactNode
	statusMeta?: (item: T) => ReactNode
	leadingColumns?: DataTableColumn<T>[]
	onEdit: (item: T) => void
	onDelete: (item: T) => void
	deleteDisabled?: (item: T) => boolean
	deleteTitle?: (item: T) => string
	deleteConfirmTitle: string
	deleteConfirmMessage: ReactNode
	isReordering?: boolean
	onReorder: (orderedIds: number[]) => void
	onMoveUp: (item: T) => void
	onMoveDown: (item: T) => void
	emptyMessage?: ReactNode
	pagination: { page: number; totalPages: number; totalCount: number }
	pageSize: number
	onPageChange: (page: number) => void
	onPageSizeChange: (pageSize: number) => void
}

export function AdminCrudTable<T>({
	items,
	loading,
	getRowId = (item) => (item as { id: number }).id,
	getColor,
	getActive,
	renderName,
	statusMeta,
	leadingColumns = [],
	onEdit,
	onDelete,
	deleteDisabled,
	deleteTitle,
	deleteConfirmTitle,
	deleteConfirmMessage,
	isReordering,
	onReorder,
	onMoveUp,
	onMoveDown,
	emptyMessage,
	pagination,
	pageSize,
	onPageChange,
	onPageSizeChange,
}: AdminCrudTableProps<T>) {
	const { t } = useTranslation()
	const [pendingDelete, setPendingDelete] = useState<T | null>(null)

	const columns: DataTableColumn<T>[] = [
		{
			key: '__order',
			header: t('common.order'),
			width: '108px',
			render: (item, index) => (
				<div className='admin-crud-table__order'>
					<DragHandle label={t('common.dragToReorder')} />
					<ReorderButtons
						canMoveUp={index > 0}
						canMoveDown={index < items.length - 1}
						onMoveUp={() => onMoveUp(item)}
						onMoveDown={() => onMoveDown(item)}
						isProcessing={isReordering}
						size='small'
					/>
				</div>
			),
		},
		...leadingColumns,
		{
			key: 'name',
			header: t('common.name'),
			render: (item) => (renderName ? renderName(item) : (item as { name: string }).name),
		},
		{
			key: 'color',
			header: t('common.color'),
			render: (item) => <ColorSwatch color={getColor(item) ?? null} emptyLabel={t('common.noColor')} />,
		},
		{
			key: 'status',
			header: t('common.status'),
			render: (item) => (
				<span className='admin-crud-table__status'>
					<StatusPill active={getActive(item)} activeLabel={t('common.active')} inactiveLabel={t('common.inactive')} />
					{statusMeta?.(item)}
				</span>
			),
		},
		{
			key: 'actions',
			header: t('common.actions'),
			align: 'right',
			width: '128px',
			render: (item) => (
				<div className='admin-crud-table__actions'>
					<IconButton label={t('admin.crud.edit')} icon={<EditIcon />} size='sm' onClick={() => onEdit(item)} />
					<IconButton
						label={t('admin.crud.delete')}
						icon={<DeleteIcon />}
						variant='danger'
						size='sm'
						onClick={() => setPendingDelete(item)}
						disabled={deleteDisabled?.(item)}
						title={deleteDisabled?.(item) ? deleteTitle?.(item) : undefined}
					/>
				</div>
			),
		},
	]

	const handleConfirmDelete = () => {
		if (!pendingDelete) return
		const target = pendingDelete
		setPendingDelete(null)
		onDelete(target)
	}

	return (
		<>
			<DataTable
				columns={columns}
				items={items}
				getRowId={getRowId}
				loading={loading}
				emptyMessage={emptyMessage}
				sortable={{ onReorder: (orderedIds) => onReorder(orderedIds.map(Number)) }}
				footer={
					<TablePagination
						page={pagination.page}
						totalPages={pagination.totalPages}
						totalCount={pagination.totalCount}
						pageSize={pageSize}
						onPageChange={onPageChange}
						onPageSizeChange={onPageSizeChange}
					/>
				}
			/>
			<ConfirmDialog
				isOpen={pendingDelete !== null}
				title={deleteConfirmTitle}
				message={deleteConfirmMessage}
				variant='danger'
				confirmLabel={t('admin.crud.delete')}
				onConfirm={handleConfirmDelete}
				onCancel={() => setPendingDelete(null)}
			/>
		</>
	)
}
