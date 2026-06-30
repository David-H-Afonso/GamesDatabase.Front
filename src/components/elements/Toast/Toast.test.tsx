import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Toast } from './Toast'

describe('Toast', () => {
	const defaultProps = {
		isOpen: true,
		message: 'Saved successfully',
		onClose: vi.fn(),
	}

	beforeEach(() => vi.clearAllMocks())

	it('renders nothing when isOpen is false', () => {
		render(<Toast {...defaultProps} isOpen={false} />)
		expect(screen.queryByText('Saved successfully')).not.toBeInTheDocument()
	})

	it('renders the message when open', () => {
		render(<Toast {...defaultProps} />)
		expect(screen.getByText('Saved successfully')).toBeInTheDocument()
	})

	it('uses the status role for non-error toasts', () => {
		render(<Toast {...defaultProps} type='success' />)
		expect(screen.getByRole('status')).toHaveTextContent('Saved successfully')
	})

	it('uses the alert role for error toasts', () => {
		render(<Toast {...defaultProps} type='error' message='Something failed' />)
		expect(screen.getByRole('alert')).toHaveTextContent('Something failed')
	})

	it('applies the type modifier class', () => {
		render(<Toast {...defaultProps} type='warning' />)
		expect(screen.getByRole('status')).toHaveClass('toast--warning')
	})

	it('calls onClose when the dismiss button is clicked', () => {
		const onClose = vi.fn()
		render(<Toast {...defaultProps} onClose={onClose} />)
		fireEvent.click(screen.getByRole('button'))
		expect(onClose).toHaveBeenCalledOnce()
	})

	it('auto-dismisses after the given duration', () => {
		vi.useFakeTimers()
		const onClose = vi.fn()
		try {
			render(<Toast {...defaultProps} onClose={onClose} duration={3000} />)
			expect(onClose).not.toHaveBeenCalled()
			act(() => vi.advanceTimersByTime(3000))
			expect(onClose).toHaveBeenCalledOnce()
		} finally {
			vi.useRealTimers()
		}
	})

	it('does not auto-dismiss when duration is zero', () => {
		vi.useFakeTimers()
		const onClose = vi.fn()
		try {
			render(<Toast {...defaultProps} onClose={onClose} duration={0} />)
			act(() => vi.advanceTimersByTime(10000))
			expect(onClose).not.toHaveBeenCalled()
		} finally {
			vi.useRealTimers()
		}
	})
})
