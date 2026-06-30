import type { ReactNode } from 'react'
import './DataTable.scss'

export interface DataTableColumn<T> {
	key: string
	header: ReactNode
	render: (item: T, index: number) => ReactNode
	width?: string
	align?: 'left' | 'center' | 'right'
	className?: string
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
}

export function DataTable<T>({ columns, items, getRowId, loading = false, skeletonRows = 5, emptyMessage, rowClassName, footer, ariaLabel }: DataTableProps<T>) {
	const cellClass = (col: DataTableColumn<T>, base: string) => `${base} data-table__cell--${col.align ?? 'left'}${col.className ? ` ${col.className}` : ''}`

	return (
		<div className='data-table'>
			<div className='data-table__scroll'>
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
					<tbody>
						{loading ? (
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
						) : (
							items.map((item, index) => {
								const extraClass = rowClassName?.(item)
								return (
									<tr key={getRowId(item)} className={`data-table__row${extraClass ? ` ${extraClass}` : ''}`}>
										{columns.map((col) => (
											<td key={col.key} className={cellClass(col, 'data-table__td')}>
												{col.render(item, index)}
											</td>
										))}
									</tr>
								)
							})
						)}
					</tbody>
				</table>
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
