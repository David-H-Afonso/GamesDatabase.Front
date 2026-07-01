import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n'
import { Modal } from './Modal'

describe('Modal', () => {
	const defaultProps = {
		isOpen: true,
		onClose: vi.fn(),
		title: 'Test Modal',
		children: <p>Modal content</p>,
	}

	const closeName = () => i18n.t('common.close')

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

	it('exposes an accessible dialog labelled by its title', () => {
		render(<Modal {...defaultProps} />)
		const dialog = screen.getByRole('dialog')
		expect(dialog).toHaveAttribute('aria-modal', 'true')
		expect(dialog).toHaveAccessibleName('Test Modal')
	})

	it('calls onClose when the close button is clicked', () => {
		const onClose = vi.fn()
		render(<Modal {...defaultProps} onClose={onClose} />)
		fireEvent.click(screen.getByRole('button', { name: closeName() }))
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

	it('moves focus into the dialog when opened', () => {
		render(<Modal {...defaultProps} />)
		expect(screen.getByRole('button', { name: closeName() })).toHaveFocus()
	})

	it('keeps focus within the dialog when tabbing past the last control', async () => {
		render(<Modal {...defaultProps} footer={<button>Confirm</button>} />)
		const close = screen.getByRole('button', { name: closeName() })
		const confirm = screen.getByRole('button', { name: /confirm/i })
		expect(close).toHaveFocus()
		await userEvent.tab()
		expect(confirm).toHaveFocus()
		await userEvent.tab()
		expect(close).toHaveFocus()
		await userEvent.tab({ shift: true })
		expect(confirm).toHaveFocus()
	})
})
