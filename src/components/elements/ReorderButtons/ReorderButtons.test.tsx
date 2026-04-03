import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReorderButtons } from './ReorderButtons'

describe('ReorderButtons', () => {
	const baseProps = {
		canMoveUp: true,
		canMoveDown: true,
		onMoveUp: vi.fn(),
		onMoveDown: vi.fn(),
	}

	beforeEach(() => vi.clearAllMocks())

	it('calls onMoveUp when the up button is clicked', () => {
		const onMoveUp = vi.fn()
		render(<ReorderButtons {...baseProps} onMoveUp={onMoveUp} />)
		fireEvent.click(screen.getByRole('button', { name: /mover arriba/i }))
		expect(onMoveUp).toHaveBeenCalledOnce()
	})

	it('calls onMoveDown when the down button is clicked', () => {
		const onMoveDown = vi.fn()
		render(<ReorderButtons {...baseProps} onMoveDown={onMoveDown} />)
		fireEvent.click(screen.getByRole('button', { name: /mover abajo/i }))
		expect(onMoveDown).toHaveBeenCalledOnce()
	})

	it('disables the up button when canMoveUp is false', () => {
		render(<ReorderButtons {...baseProps} canMoveUp={false} />)
		expect(screen.getByRole('button', { name: /mover arriba/i })).toBeDisabled()
	})

	it('disables the down button when canMoveDown is false', () => {
		render(<ReorderButtons {...baseProps} canMoveDown={false} />)
		expect(screen.getByRole('button', { name: /mover abajo/i })).toBeDisabled()
	})

	it('disables both buttons when isProcessing is true', () => {
		render(<ReorderButtons {...baseProps} isProcessing={true} />)
		screen.getAllByRole('button').forEach((btn) => expect(btn).toBeDisabled())
	})

	it('up button is enabled when canMoveUp is true and not processing', () => {
		render(<ReorderButtons {...baseProps} canMoveUp={true} isProcessing={false} />)
		expect(screen.getByRole('button', { name: /mover arriba/i })).not.toBeDisabled()
	})
})
