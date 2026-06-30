import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { IconButton } from './IconButton'

vi.mock('./IconButton.scss', () => ({}))

const icon = <svg data-testid='icon' />

describe('IconButton', () => {
	it('exposes the label as accessible name and title', () => {
		render(<IconButton label='Edit' icon={icon} />)
		const button = screen.getByRole('button', { name: 'Edit' })
		expect(button).toHaveAttribute('title', 'Edit')
	})

	it('calls onClick when pressed', () => {
		const onClick = vi.fn()
		render(<IconButton label='Delete' icon={icon} onClick={onClick} />)
		fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
		expect(onClick).toHaveBeenCalledOnce()
	})

	it('applies variant and size modifiers', () => {
		render(<IconButton label='Export' icon={icon} variant='danger' size='sm' />)
		const button = screen.getByRole('button', { name: 'Export' })
		expect(button.className).toContain('icon-button--danger')
		expect(button.className).toContain('icon-button--sm')
	})

	it('does not fire onClick while disabled', () => {
		const onClick = vi.fn()
		render(<IconButton label='Edit' icon={icon} onClick={onClick} disabled />)
		fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
		expect(onClick).not.toHaveBeenCalled()
	})
})
