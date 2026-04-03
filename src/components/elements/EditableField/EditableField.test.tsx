import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditableField } from './EditableField'

describe('EditableField', () => {
	const defaultProps = {
		value: 'Hello World',
		type: 'text',
		placeholder: 'Enter value',
		onSave: vi.fn(),
	}

	beforeEach(() => vi.clearAllMocks())

	// ── Display mode ───────────────────────────────────────────────────────────

	it('displays the value in display mode', () => {
		render(<EditableField {...defaultProps} />)
		expect(screen.getByText('Hello World')).toBeInTheDocument()
	})

	it('shows placeholder when value is undefined', () => {
		render(<EditableField {...defaultProps} value={undefined} />)
		expect(screen.getByText('Enter value')).toBeInTheDocument()
	})

	it('applies formatter when provided', () => {
		render(<EditableField {...defaultProps} value={80} formatter={(v) => `Score: ${v}`} />)
		expect(screen.getByText('Score: 80')).toBeInTheDocument()
	})

	// ── Entering edit mode ─────────────────────────────────────────────────────

	it('shows a text input after clicking the display value', async () => {
		render(<EditableField {...defaultProps} />)
		await userEvent.click(screen.getByText('Hello World'))
		expect(screen.getByRole('textbox')).toBeInTheDocument()
	})

	it('does not enter edit mode when allowEditing is false', async () => {
		render(<EditableField {...defaultProps} allowEditing={false} />)
		await userEvent.click(screen.getByText('Hello World'))
		expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
	})

	// ── Saving ─────────────────────────────────────────────────────────────────

	it('calls onSave with the new value when Enter is pressed', async () => {
		const onSave = vi.fn()
		render(<EditableField {...defaultProps} onSave={onSave} />)
		await userEvent.click(screen.getByText('Hello World'))
		const input = screen.getByRole('textbox')
		await userEvent.clear(input)
		await userEvent.type(input, 'New Value')
		await userEvent.keyboard('{Enter}')
		expect(onSave).toHaveBeenCalledWith('New Value')
	})

	it('calls onSave with the current value on Blur', async () => {
		const onSave = vi.fn()
		render(<EditableField {...defaultProps} onSave={onSave} value='Existing' />)
		await userEvent.click(screen.getByText('Existing'))
		const input = screen.getByRole('textbox')
		await userEvent.clear(input)
		await userEvent.type(input, 'Updated')
		await userEvent.tab()
		expect(onSave).toHaveBeenCalledWith('Updated')
	})

	// ── allowEmpty validation ──────────────────────────────────────────────────

	it('does NOT call onSave and exits edit mode when allowEmpty=false and input is empty', async () => {
		const onSave = vi.fn()
		render(<EditableField {...defaultProps} onSave={onSave} allowEmpty={false} />)
		await userEvent.click(screen.getByText('Hello World'))
		await userEvent.clear(screen.getByRole('textbox'))
		await userEvent.keyboard('{Enter}')
		expect(onSave).not.toHaveBeenCalled()
		expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
	})

	it('calls onSave with empty string when allowEmpty=true and input is cleared', async () => {
		const onSave = vi.fn()
		render(<EditableField {...defaultProps} onSave={onSave} allowEmpty={true} />)
		await userEvent.click(screen.getByText('Hello World'))
		await userEvent.clear(screen.getByRole('textbox'))
		await userEvent.keyboard('{Enter}')
		expect(onSave).toHaveBeenCalledWith('')
	})
})
