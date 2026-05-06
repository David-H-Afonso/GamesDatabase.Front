import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from './Modal'

describe('Modal', () => {
	const defaultProps = {
		isOpen: true,
		onClose: vi.fn(),
		title: 'Test Modal',
		children: <p>Modal content</p>,
	}

	beforeEach(() => vi.clearAllMocks())

	it('renders nothing when isOpen is false', () => {
		render(<Modal {...defaultProps} isOpen={false} />)
		expect(screen.queryByText('Test Modal')).not.toBeInTheDocument()
		expect(screen.queryByText('Modal content')).not.toBeInTheDocument()
	})

	it('renders title and children when isOpen is true', () => {
		render(<Modal {...defaultProps} />)
		expect(screen.getByText('Test Modal')).toBeInTheDocument()
		expect(screen.getByText('Modal content')).toBeInTheDocument()
	})

	it('calls onClose when the close button is clicked', () => {
		const onClose = vi.fn()
		render(<Modal {...defaultProps} onClose={onClose} />)
		fireEvent.click(screen.getByLabelText('Close modal'))
		expect(onClose).toHaveBeenCalledOnce()
	})

	it('calls onClose when the overlay is clicked', () => {
		const onClose = vi.fn()
		render(<Modal {...defaultProps} onClose={onClose} />)
		const overlay = document.querySelector('.modal-overlay')!
		fireEvent.click(overlay)
		expect(onClose).toHaveBeenCalledOnce()
	})

	it('does NOT call onClose when the modal content area is clicked', () => {
		const onClose = vi.fn()
		render(<Modal {...defaultProps} onClose={onClose} />)
		const content = document.querySelector('.modal-content')!
		fireEvent.click(content)
		expect(onClose).not.toHaveBeenCalled()
	})

	it('calls onClose when the Escape key is pressed', async () => {
		const onClose = vi.fn()
		render(<Modal {...defaultProps} onClose={onClose} />)
		await userEvent.keyboard('{Escape}')
		expect(onClose).toHaveBeenCalledOnce()
	})

	it('renders footer content when footer prop is provided', () => {
		render(<Modal {...defaultProps} footer={<button>Confirm</button>} />)
		expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
	})
})
