import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
	it('renders with the provided title', () => {
		render(<Button title='Click me' onPress={vi.fn()} />)
		expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
	})

	it('calls onPress when clicked', () => {
		const onPress = vi.fn()
		render(<Button title='Go' onPress={onPress} />)
		fireEvent.click(screen.getByRole('button'))
		expect(onPress).toHaveBeenCalledOnce()
	})

	it('renders button with expected text content', () => {
		render(<Button title='Save' onPress={vi.fn()} />)
		expect(screen.getByText('Save')).toBeInTheDocument()
	})
})
