import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { CollectionMenu } from './CollectionMenu'

const renderMenu = () => {
	const action = vi.fn()
	const view = renderWithProviders(<><CollectionMenu label='Fixture actions'>{close => <><button type='button' disabled>Unavailable action</button><button type='button' onClick={() => { close(); action() }}>Use action</button></>}</CollectionMenu><button type='button'>Outside</button></>)
	return { ...view, action }
}
describe('non-modal collection action panel', () => {
	beforeEach(() => { vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ width: 44, height: 44 }] as unknown as DOMRectList) })
	afterEach(() => { vi.restoreAllMocks() })
	it('uses a bounded portal and focuses the first enabled action, returning focus on Escape', async () => {
		const { container, action } = renderMenu(), user = userEvent.setup(), trigger = screen.getByRole('button', { name: 'Fixture actions' })
		expect(trigger).toHaveAttribute('aria-expanded', 'false'); await user.click(trigger)
		const panel = screen.getByRole('dialog', { name: 'Fixture actions' })
		expect(container.contains(panel)).toBe(false); expect(trigger).toHaveAttribute('aria-controls', panel.id)
		expect(within(panel).getByRole('button', { name: 'Use action' })).toHaveFocus()
		await user.keyboard('{Escape}'); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(trigger).toHaveFocus(); expect(action).not.toHaveBeenCalled()
	})
	it('closes for an explicit action only once and keeps the original trigger as the focus target', async () => {
		const { action } = renderMenu(), user = userEvent.setup(), trigger = screen.getByRole('button', { name: 'Fixture actions' })
		await user.click(trigger); await user.click(screen.getByRole('button', { name: 'Use action' }))
		expect(action).toHaveBeenCalledOnce(); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(trigger).toHaveFocus()
	})
	it('closes on an outside pointer, Tab leaving, viewport change, or page scroll without activating an action', async () => {
		const { action } = renderMenu(), user = userEvent.setup(), trigger = screen.getByRole('button', { name: 'Fixture actions' })
		await user.click(trigger); await user.click(screen.getByRole('button', { name: 'Outside' })); expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		await user.click(trigger); await user.keyboard('{Tab}'); expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		await user.click(trigger); fireEvent(window, new Event('resize')); expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		await user.click(trigger); fireEvent.scroll(window); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(action).not.toHaveBeenCalled()
	})
})
