import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DataTable, ColorSwatch, StatusPill, type DataTableColumn } from './DataTable'

vi.mock('./DataTable.scss', () => ({}))

interface Row {
	id: number
	name: string
}

const columns: DataTableColumn<Row>[] = [
	{ key: 'name', header: 'Name', render: (item) => item.name },
	{ key: 'id', header: 'Id', render: (item) => item.id, align: 'right' },
]

const rows: Row[] = [
	{ id: 1, name: 'Alpha' },
	{ id: 2, name: 'Beta' },
]

describe('DataTable', () => {
	it('renders headers and rows', () => {
		render(<DataTable columns={columns} items={rows} getRowId={(item) => item.id} />)
		expect(screen.getByText('Name')).toBeInTheDocument()
		expect(screen.getByText('Alpha')).toBeInTheDocument()
		expect(screen.getByText('Beta')).toBeInTheDocument()
	})

	it('renders the empty message when there are no items', () => {
		render(<DataTable columns={columns} items={[]} getRowId={(item) => item.id} emptyMessage='Nothing here' />)
		expect(screen.getByText('Nothing here')).toBeInTheDocument()
	})

	it('renders skeleton rows while loading', () => {
		const { container } = render(<DataTable columns={columns} items={[]} getRowId={(item) => item.id} loading skeletonRows={3} />)
		expect(container.querySelectorAll('.data-table__skeleton')).toHaveLength(6)
	})
})

describe('ColorSwatch', () => {
	it('shows the hex value when a color is provided', () => {
		const { container } = render(<ColorSwatch color='#ff0000' emptyLabel='No color' />)
		expect(screen.getByText('#ff0000')).toBeInTheDocument()
		expect(container.querySelector('.color-cell__swatch--empty')).toBeNull()
	})

	it('shows a placeholder swatch when no color is provided', () => {
		const { container } = render(<ColorSwatch color={null} emptyLabel='No color' />)
		expect(screen.getByText('No color')).toBeInTheDocument()
		expect(container.querySelector('.color-cell__swatch--empty')).not.toBeNull()
	})
})

describe('StatusPill', () => {
	it('renders the active label', () => {
		render(<StatusPill active activeLabel='Active' inactiveLabel='Inactive' />)
		expect(screen.getByText('Active')).toBeInTheDocument()
	})

	it('renders the inactive label', () => {
		render(<StatusPill active={false} activeLabel='Active' inactiveLabel='Inactive' />)
		expect(screen.getByText('Inactive')).toBeInTheDocument()
	})
})
