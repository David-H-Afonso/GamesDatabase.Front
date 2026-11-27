import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { CollectionSegmentedControl } from './CollectionSegmentedControl'

const options = [{ value: 'finished', label: 'Finished', description: 'Uses saved finish dates.' }, { value: 'started', label: 'Started' }] as const
const Controlled = () => { const [value, setValue] = useState<'finished' | 'started'>('finished'); return <CollectionSegmentedControl label='Date basis' value={value} onChange={setValue} options={options} /> }
describe('native segmented single choice', () => {
	it('has an accessible group and selected radio with source description', () => {
		render(<Controlled />)
		expect(screen.getByRole('group', { name: 'Date basis' })).toBeInTheDocument(); expect(screen.getByRole('radio', { name: 'Finished' })).toBeChecked(); expect(screen.getByRole('radio', { name: 'Finished' })).toHaveAccessibleDescription('Uses saved finish dates.')
	})
	it('supports native keyboard navigation and a single selected value', async () => {
		const user = userEvent.setup(); render(<Controlled />); await user.tab(); expect(screen.getByRole('radio', { name: 'Finished' })).toHaveFocus()
		await user.keyboard('{ArrowRight}'); expect(screen.getByRole('radio', { name: 'Started' })).toBeChecked(); expect(screen.getByRole('radio', { name: 'Finished' })).not.toBeChecked()
	})
	it('responds to pointer selection and isolates multiple native radio groups', async () => {
		render(<><Controlled /><Controlled /></>); await userEvent.click(screen.getAllByRole('radio', { name: 'Started' })[0])
		expect(screen.getAllByRole('radio', { name: 'Started' })[0]).toBeChecked(); expect(screen.getAllByRole('radio', { name: 'Finished' })[1]).toBeChecked()
	})
	it('disables the whole group without firing a change', async () => {
		const onChange = vi.fn(); render(<CollectionSegmentedControl label='Date basis' value='finished' onChange={onChange} options={options} disabled />)
		await userEvent.click(screen.getByRole('radio', { name: 'Started' })); expect(onChange).not.toHaveBeenCalled(); expect(screen.getByRole('radio', { name: 'Started' })).toBeDisabled()
	})
})
