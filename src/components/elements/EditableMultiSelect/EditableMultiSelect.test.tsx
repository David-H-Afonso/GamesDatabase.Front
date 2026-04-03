import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditableMultiSelect } from './EditableMultiSelect'

const options = [
	{ id: 1, name: 'Solo', color: '#ff0000' },
	{ id: 2, name: 'Co-op', color: '#00ff00' },
	{ id: 3, name: 'Online', color: '#0000ff' },
]

describe('EditableMultiSelect', () => {
	const defaultProps = {
		values: [1],
		displayValues: ['Solo'],
		options,
		onSave: vi.fn().mockResolvedValue(undefined),
	}

	beforeEach(() => vi.clearAllMocks())

	// ── Display ────────────────────────────────────────────────────────────────

	it('shows the current selected display value', () => {
		render(<EditableMultiSelect {...defaultProps} />)
		expect(screen.getByText('Solo')).toBeInTheDocument()
	})

	it('shows placeholder when no values are selected', () => {
		render(<EditableMultiSelect {...defaultProps} values={[]} displayValues={[]} />)
		expect(screen.getByText('Select...')).toBeInTheDocument()
	})

	it('shows condensed text when multiple values selected', () => {
		render(<EditableMultiSelect {...defaultProps} values={[1, 2]} displayValues={['Solo', 'Co-op']} />)
		expect(screen.getByText('Solo +1')).toBeInTheDocument()
	})

	// ── Dropdown ───────────────────────────────────────────────────────────────

	it('opens dropdown when trigger is clicked', async () => {
		render(<EditableMultiSelect {...defaultProps} />)
		await userEvent.click(screen.getByText('Solo'))
		expect(screen.getByText('Co-op')).toBeInTheDocument()
		expect(screen.getByText('Online')).toBeInTheDocument()
	})

	it('calls onSave with added id when an unselected option is clicked', async () => {
		const onSave = vi.fn().mockResolvedValue(undefined)
		// dropdownOnly=true so options are visible immediately
		render(<EditableMultiSelect {...defaultProps} dropdownOnly={true} onSave={onSave} />)
		await userEvent.click(screen.getByText('Co-op'))
		expect(onSave).toHaveBeenCalledWith([1, 2])
	})

	it('calls onSave with id removed when a selected option is clicked', async () => {
		const onSave = vi.fn().mockResolvedValue(undefined)
		render(<EditableMultiSelect {...defaultProps} values={[1, 2]} displayValues={['Solo', 'Co-op']} dropdownOnly={true} onSave={onSave} />)
		await userEvent.click(screen.getByText('Co-op'))
		expect(onSave).toHaveBeenCalledWith([1])
	})

	it('shows all options when dropdownOnly is true', () => {
		render(<EditableMultiSelect {...defaultProps} dropdownOnly={true} />)
		expect(screen.getByText('Solo')).toBeInTheDocument()
		expect(screen.getByText('Co-op')).toBeInTheDocument()
		expect(screen.getByText('Online')).toBeInTheDocument()
	})
})
