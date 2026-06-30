import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TablePagination } from './TablePagination'

vi.mock('./TablePagination.scss', () => ({}))

const baseProps = {
	page: 1,
	totalPages: 3,
	totalCount: 15,
	pageSize: 5,
	onPageChange: vi.fn(),
	onPageSizeChange: vi.fn(),
}

describe('TablePagination', () => {
	it('renders nothing when there is a single page', () => {
		const { container } = render(<TablePagination {...baseProps} totalPages={1} />)
		expect(container).toBeEmptyDOMElement()
	})

	it('renders size selector, info and navigation when there are several pages', () => {
		render(<TablePagination {...baseProps} />)
		expect(screen.getByText('Elementos por página:')).toBeInTheDocument()
		expect(screen.getByText(/Página 1 de 3/)).toBeInTheDocument()
		expect(screen.getByText(/15 elementos/)).toBeInTheDocument()
	})

	it('disables the previous button on the first page', () => {
		render(<TablePagination {...baseProps} />)
		expect(screen.getByText('Anterior')).toBeDisabled()
		expect(screen.getByText('Siguiente')).not.toBeDisabled()
	})

	it('emits page changes', () => {
		const onPageChange = vi.fn()
		render(<TablePagination {...baseProps} onPageChange={onPageChange} />)
		fireEvent.click(screen.getByText('Siguiente'))
		expect(onPageChange).toHaveBeenCalledWith(2)
	})

	it('emits page size changes', () => {
		const onPageSizeChange = vi.fn()
		render(<TablePagination {...baseProps} onPageSizeChange={onPageSizeChange} />)
		fireEvent.change(screen.getByRole('combobox'), { target: { value: '25' } })
		expect(onPageSizeChange).toHaveBeenCalledWith(25)
	})
})
