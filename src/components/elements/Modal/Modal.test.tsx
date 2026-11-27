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

	it('lets Escape dismiss an open native select before closing its parent modal', () => {
		const onClose = vi.fn(); render(<Modal {...defaultProps} onClose={onClose}><select aria-label='Fixture select'><option>One</option><option>Two</option></select></Modal>)
		const select = screen.getByRole('combobox', { name: 'Fixture select' }), matches = vi.spyOn(select, 'matches').mockReturnValue(true)
		expect(fireEvent.keyDown(select, { key: 'Escape' })).toBe(true); expect(onClose).not.toHaveBeenCalled(); expect(matches).toHaveBeenCalledWith(':open')
		matches.mockReturnValue(false); fireEvent.keyDown(select, { key: 'Escape' }); expect(onClose).toHaveBeenCalledOnce(); matches.mockRestore()
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

	it('recovers focus lost while an async action is disabled so Escape still closes this layer', async () => {
		const onClose = vi.fn()
		const { rerender } = render(<Modal {...defaultProps} onClose={onClose} footer={<button>Save</button>} />)
		const save = screen.getByRole('button', { name: 'Save' })
		save.focus(); save.blur()
		rerender(<Modal {...defaultProps} onClose={onClose} footer={<button disabled>Save</button>} />)
		expect(screen.getByRole('button', { name: closeName() })).toHaveFocus()
		await userEvent.keyboard('{Escape}')
		expect(onClose).toHaveBeenCalledOnce()
	})

	it('does not steal focus from a later nested modal when the parent rerenders', () => {
		const layers = (title: string) => <><Modal {...defaultProps} title={title} /><Modal {...defaultProps} title='Nested' /></>
		const { rerender } = render(layers('Parent'))
		const nested = screen.getByRole('dialog', { name: 'Nested' })
		rerender(layers('Updated parent'))
		expect(nested.contains(document.activeElement)).toBe(true)
	})

	it('keeps a fully disabled pending form focused after a real backdrop click and Tab', async () => {
		const onClose = vi.fn()
		render(<Modal {...defaultProps} closeDisabled onClose={onClose}><fieldset disabled><input aria-label='Pending fixture name' /><button>Save fixture</button></fieldset></Modal>)
		const dialog = screen.getByRole('dialog')
		await userEvent.click(document.querySelector('.modal-overlay')!)
		expect(dialog.contains(document.activeElement)).toBe(true)
		await userEvent.tab()
		expect(dialog.contains(document.activeElement)).toBe(true)
		expect(onClose).not.toHaveBeenCalled()
	})

	it('adds a named keyboard-readable body only when the caller explicitly requests it', () => {
		const { rerender } = render(<Modal {...defaultProps} />)
		expect(screen.queryByRole('region')).not.toBeInTheDocument()
		rerender(<Modal {...defaultProps} closeDisabled bodyLabel='Read-only pending fields' />)
		const region = screen.getByRole('region', { name: 'Read-only pending fields' })
		expect(region).toHaveAttribute('tabindex', '0')
		region.focus(); expect(region).toHaveFocus()
	})
})
