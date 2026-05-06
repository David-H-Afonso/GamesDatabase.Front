import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditableSelect } from './EditableSelect'

const options = [
	{ id: 1, name: 'Option A', color: '#ff0000' },
	{ id: 2, name: 'Option B', color: '#00ff00' },
	{ id: 3, name: 'Option C', color: '#0000ff' },
]

describe('EditableSelect', () => {
	const defaultProps = {
		value: 1,
		displayValue: 'Option A',
		options,
		onSave: vi.fn().mockResolvedValue(undefined),
	}

	beforeEach(() => vi.clearAllMocks())

	// ── Display ────────────────────────────────────────────────────────────────

	it('shows the current display value', () => {
		render(<EditableSelect {...defaultProps} />)
		expect(screen.getByText('Option A')).toBeInTheDocument()
	})

	it('shows placeholder when displayValue is undefined', () => {
		render(<EditableSelect {...defaultProps} displayValue={undefined} />)
		expect(screen.getByText('Select...')).toBeInTheDocument()
	})

	// ── Dropdown ───────────────────────────────────────────────────────────────

	it('opens dropdown when trigger is clicked', async () => {
		render(<EditableSelect {...defaultProps} />)
		await userEvent.click(screen.getByText('Option A'))
		expect(screen.getByText('Option B')).toBeInTheDocument()
		expect(screen.getByText('Option C')).toBeInTheDocument()
	})

	it('calls onSave with the clicked option id', async () => {
		const onSave = vi.fn().mockResolvedValue(undefined)
		// value=1 (Option A selected), clicking Option B should call onSave(2)
		render(<EditableSelect {...defaultProps} onSave={onSave} />)
		await userEvent.click(screen.getByText('Option A'))
		await userEvent.click(screen.getByText('Option B'))
		expect(onSave).toHaveBeenCalledWith(2)
	})

	it('calls onSave with undefined when the currently-selected option is clicked (deselect)', async () => {
		const onSave = vi.fn().mockResolvedValue(undefined)
		// dropdownOnly=true so option A is visible immediately, clicking it deselects
		render(<EditableSelect {...defaultProps} value={1} onSave={onSave} dropdownOnly={true} />)
		await userEvent.click(screen.getByText('Option A'))
		expect(onSave).toHaveBeenCalledWith(undefined)
	})

	it('shows dropdown immediately when dropdownOnly is true', () => {
		render(<EditableSelect {...defaultProps} dropdownOnly={true} />)
		expect(screen.getByText('Option B')).toBeInTheDocument()
	})

	it('shows check mark next to selected option', () => {
		render(<EditableSelect {...defaultProps} dropdownOnly={true} />)
		expect(screen.getByText('✓')).toBeInTheDocument()
	})
})
