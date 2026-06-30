import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
	const defaultProps = {
		isOpen: true,
		title: 'Delete game',
		message: 'This action cannot be undone.',
		onConfirm: vi.fn(),
		onCancel: vi.fn(),
	}

	beforeEach(() => vi.clearAllMocks())

	it('renders nothing when isOpen is false', () => {
		render(<ConfirmDialog {...defaultProps} isOpen={false} />)
		expect(screen.queryByText('Delete game')).not.toBeInTheDocument()
	})

	it('renders title and message when open', () => {
		render(<ConfirmDialog {...defaultProps} />)
		expect(screen.getByText('Delete game')).toBeInTheDocument()
		expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument()
	})

	it('exposes an accessible alertdialog labelled by title and described by message', () => {
		render(<ConfirmDialog {...defaultProps} />)
		const dialog = screen.getByRole('alertdialog')
		expect(dialog).toHaveAttribute('aria-modal', 'true')
		expect(dialog).toHaveAccessibleName('Delete game')
		expect(dialog).toHaveAccessibleDescription('This action cannot be undone.')
	})

	it('moves focus to the cancel button when opened', () => {
		render(<ConfirmDialog {...defaultProps} cancelLabel='Cancel' />)
		expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
	})

	it('calls onConfirm when the confirm button is clicked', () => {
		const onConfirm = vi.fn()
		render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} confirmLabel='Delete' />)
		fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
		expect(onConfirm).toHaveBeenCalledOnce()
	})

	it('calls onCancel when the cancel button is clicked', () => {
		const onCancel = vi.fn()
		render(<ConfirmDialog {...defaultProps} onCancel={onCancel} cancelLabel='Cancel' />)
		fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
		expect(onCancel).toHaveBeenCalledOnce()
	})

	it('calls onCancel when the Escape key is pressed', async () => {
		const onCancel = vi.fn()
		render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />)
		await userEvent.keyboard('{Escape}')
		expect(onCancel).toHaveBeenCalledOnce()
	})

	it('calls onCancel when the backdrop is clicked', () => {
		const onCancel = vi.fn()
		render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />)
		fireEvent.click(document.querySelector('.confirm-dialog__backdrop')!)
		expect(onCancel).toHaveBeenCalledOnce()
	})

	it('falls back to the shared confirm and cancel labels', () => {
		render(<ConfirmDialog {...defaultProps} />)
		expect(screen.getByRole('button', { name: i18n.t('common.confirm') })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: i18n.t('common.cancel') })).toBeInTheDocument()
	})

	it('renders the danger action by default and the primary action when requested', () => {
		const { rerender } = render(<ConfirmDialog {...defaultProps} confirmLabel='Go' />)
		expect(screen.getByRole('button', { name: 'Go' })).toHaveClass('btn-danger')
		rerender(<ConfirmDialog {...defaultProps} confirmLabel='Go' variant='primary' />)
		expect(screen.getByRole('button', { name: 'Go' })).toHaveClass('btn-primary')
	})

	it('disables both actions while confirming', () => {
		render(<ConfirmDialog {...defaultProps} confirmLabel='Delete' cancelLabel='Cancel' isConfirming />)
		expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()
		expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
	})

	it('keeps focus within the dialog when tabbing past the last action', async () => {
		render(<ConfirmDialog {...defaultProps} confirmLabel='Delete' cancelLabel='Cancel' />)
		const cancel = screen.getByRole('button', { name: 'Cancel' })
		const confirm = screen.getByRole('button', { name: 'Delete' })
		expect(cancel).toHaveFocus()
		await userEvent.tab()
		expect(confirm).toHaveFocus()
		await userEvent.tab()
		expect(cancel).toHaveFocus()
	})
})
