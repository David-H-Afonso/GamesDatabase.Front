import { createContext, useContext, type CSSProperties, type ReactNode } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import './DataTable.scss'

export interface DataTableColumn<T> {
	key: string
	header: ReactNode
	render: (item: T, index: number) => ReactNode
	width?: string
	align?: 'left' | 'center' | 'right'
	className?: string
}

export interface DataTableSortable {
	onReorder: (orderedIds: Array<string | number>) => void
	disabled?: boolean
}

export interface DataTableProps<T> {
	columns: DataTableColumn<T>[]
	items: T[]
	getRowId: (item: T) => string | number
	loading?: boolean
	skeletonRows?: number
	emptyMessage?: ReactNode
	rowClassName?: (item: T) => string | undefined
	footer?: ReactNode
	ariaLabel?: string
	sortable?: DataTableSortable
}

interface RowDragHandle {
	attributes: ReturnType<typeof useSortable>['attributes']
	listeners: ReturnType<typeof useSortable>['listeners']
	setActivatorNodeRef: ReturnType<typeof useSortable>['setActivatorNodeRef']
	isDragging: boolean
}

const RowDragContext = createContext<RowDragHandle | null>(null)

const prefersReducedMotion = () =>
	typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function SortableRow({ id, className, children }: { id: string | number; className: string; children: ReactNode }) {
	const { setNodeRef, setActivatorNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({ id })
	const style: CSSProperties = {
		transform: transform ? `translate3d(0, ${Math.round(transform.y)}px, 0)` : undefined,
		transition: prefersReducedMotion() ? undefined : (transition ?? undefined),
		zIndex: isDragging ? 2 : undefined,
		position: isDragging ? 'relative' : undefined,
	}
	return (
		<RowDragContext.Provider value={{ attributes, listeners, setActivatorNodeRef, isDragging }}>
			<tr ref={setNodeRef} style={style} className={`${className}${isDragging ? ' data-table__row--dragging' : ''}`}>
				{children}
			</tr>
		</RowDragContext.Provider>
	)
}

export const DragHandle = ({ label }: { label: string }) => {
	const ctx = useContext(RowDragContext)
	if (!ctx) return null
	return (
		<button
			type='button'
			ref={ctx.setActivatorNodeRef}
			className='data-table__drag-handle'
			aria-label={label}
			title={label}
			{...ctx.attributes}
			{...ctx.listeners}>
			<svg viewBox='0 0 16 16' width='16' height='16' fill='currentColor' aria-hidden='true' focusable='false'>
				<circle cx='6' cy='3' r='1.4' />
				<circle cx='10' cy='3' r='1.4' />
				<circle cx='6' cy='8' r='1.4' />
				<circle cx='10' cy='8' r='1.4' />
				<circle cx='6' cy='13' r='1.4' />
				<circle cx='10' cy='13' r='1.4' />
			</svg>
		</button>
	)
}

export function DataTable<T>({ columns, items, getRowId, loading = false, skeletonRows = 5, emptyMessage, rowClassName, footer, ariaLabel, sortable }: DataTableProps<T>) {
	const cellClass = (col: DataTableColumn<T>, base: string) => `${base} data-table__cell--${col.align ?? 'left'}${col.className ? ` ${col.className}` : ''}`

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

	const renderCells = (item: T, index: number) =>
		columns.map((col) => (
			<td key={col.key} className={cellClass(col, 'data-table__td')}>
				{col.render(item, index)}
			</td>
		))

	const dndEnabled = !!sortable && !sortable.disabled && !loading && items.length > 0

	const handleDragEnd = (event: DragEndEvent) => {
		if (!sortable) return
		const { active, over } = event
		if (!over || active.id === over.id) return
		const ids = items.map(getRowId)
		const oldIndex = ids.findIndex((id) => String(id) === String(active.id))
		const newIndex = ids.findIndex((id) => String(id) === String(over.id))
		if (oldIndex === -1 || newIndex === -1) return
		sortable.onReorder(arrayMove(ids, oldIndex, newIndex))
	}

	const body = loading ? (
		Array.from({ length: skeletonRows }).map((_, row) => (
			<tr key={`skeleton-${row}`} className='data-table__row data-table__row--skeleton'>
				{columns.map((col) => (
					<td key={col.key} className='data-table__td'>
						<span className='data-table__skeleton' />
					</td>
				))}
			</tr>
		))
	) : items.length === 0 ? (
		<tr>
			<td className='data-table__empty' colSpan={columns.length}>
				{emptyMessage}
			</td>
		</tr>
	) : sortable ? (
		<SortableContext items={items.map(getRowId)} strategy={verticalListSortingStrategy}>
			{items.map((item, index) => (
				<SortableRow key={getRowId(item)} id={getRowId(item)} className={`data-table__row${rowClassName?.(item) ? ` ${rowClassName(item)}` : ''}`}>
					{renderCells(item, index)}
				</SortableRow>
			))}
		</SortableContext>
	) : (
		items.map((item, index) => (
			<tr key={getRowId(item)} className={`data-table__row${rowClassName?.(item) ? ` ${rowClassName(item)}` : ''}`}>
				{renderCells(item, index)}
			</tr>
		))
	)

	const table = (
		<table className='data-table__table' aria-label={ariaLabel}>
			<thead>
				<tr>
					{columns.map((col) => (
						<th key={col.key} scope='col' className={cellClass(col, 'data-table__th')} style={col.width ? { width: col.width } : undefined}>
							{col.header}
						</th>
					))}
				</tr>
			</thead>
			<tbody>{body}</tbody>
		</table>
	)

	return (
		<div className='data-table'>
			<div className='data-table__scroll'>
				{dndEnabled ? (
					<DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis, restrictToParentElement]} onDragEnd={handleDragEnd}>
						{table}
					</DndContext>
				) : (
					table
				)}
			</div>
			{footer}
		</div>
	)
}

export interface ColorSwatchProps {
	color?: string | null
	emptyLabel: string
}

export const ColorSwatch = ({ color, emptyLabel }: ColorSwatchProps) => (
	<span className='color-cell'>
		<span className={`color-cell__swatch${color ? '' : ' color-cell__swatch--empty'}`} style={color ? { backgroundColor: color } : undefined} aria-hidden='true' />
		<span className='color-cell__value'>{color || emptyLabel}</span>
	</span>
)

export interface StatusPillProps {
	active: boolean
	activeLabel: string
	inactiveLabel: string
}

export const StatusPill = ({ active, activeLabel, inactiveLabel }: StatusPillProps) => (
	<span className={`status-pill ${active ? 'status-pill--active' : 'status-pill--inactive'}`}>{active ? activeLabel : inactiveLabel}</span>
)
