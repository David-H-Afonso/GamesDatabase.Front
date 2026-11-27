import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { LibrarySelectionToolbar } from './LibrarySelectionToolbar'

let availableWidth = 1400
const observers = new Set<() => void>()
const rectangle = (width: number) => ({ x: 0, y: 100, top: 100, bottom: 144, left: 0, right: width, width, height: 44, toJSON: () => ({}) }) as DOMRect
const resize = (width: number) => act(() => { availableWidth = width; for (const measure of [...observers]) measure() })
const callbacks = () => ({ onBulkAutofill: vi.fn(), onSelectAll: vi.fn(), onDeselectAll: vi.fn(), onBulkEdit: vi.fn(), onBulkExport: vi.fn(), onBulkDelete: vi.fn(), onBulkRefreshImages: vi.fn(), onDone: vi.fn() })
const replaceCheckbox = () => screen.getByRole('checkbox', { name: 'Replace existing metadata' })
const enableReplace = async (user: ReturnType<typeof userEvent.setup>) => {
	await user.click(replaceCheckbox())
	await user.click(screen.getByRole('button', { name: 'Enable Replace' }))
}

describe('Library selection toolbar', () => {
	beforeEach(async () => {
		availableWidth = 1400; observers.clear()
		await i18n.changeLanguage('en')
		vi.stubGlobal('ResizeObserver', class {
			private callback: () => void
			constructor(callback: () => void) { this.callback = callback }
			observe() { observers.add(this.callback) }
			disconnect() { observers.delete(this.callback) }
		})
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
			if (this.classList.contains('gdb-bulk-toolbar')) return rectangle(availableWidth)
			if (this.classList.contains('gdb-bulk-toolbar__count')) return rectangle(100)
			if (this.classList.contains('gdb-bulk-toolbar__autofill')) return rectangle(240)
			if (this.classList.contains('gdb-bulk-toolbar__done')) return rectangle(80)
			if (this.classList.contains('gdb-bulk-toolbar__group')) {
				if (this.querySelector('[data-bulk-action="select"]')) return rectangle(220)
				if (this.querySelector('[data-bulk-action="edit"]')) return rectangle(64)
				if (this.querySelector('[data-bulk-action="artwork"]')) return rectangle(240)
				return rectangle(160)
			}
			return rectangle(44)
		})
		vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([rectangle(44)] as unknown as DOMRectList)
	})
	afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); observers.clear() })

	it('exposes an explicitly named action group and sends empty-only mode by default', async () => {
		const props = callbacks(), user = userEvent.setup()
		render(<LibrarySelectionToolbar selectedCount={2} selectionKey='owner:1/query:a/ids:11,12' {...props} />)
		expect(screen.getByRole('group', { name: 'Selection actions' })).toHaveAttribute('aria-busy', 'false')
		expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Autofill' })).toHaveAccessibleDescription('Fills empty fields')
		expect(screen.getByRole('button', { name: 'Autofill' }).querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
		expect(replaceCheckbox()).not.toBeChecked(); expect(props.onBulkAutofill).not.toHaveBeenCalled()
		await user.click(screen.getByRole('button', { name: 'Autofill' }))
		expect(props.onBulkAutofill).toHaveBeenCalledExactlyOnceWith({ overwrite: false })
	})

	it('requires a separate warning acceptance before checking Replace, without starting lookup', async () => {
		const props = callbacks(), user = userEvent.setup()
		render(<LibrarySelectionToolbar selectedCount={2} selectionKey='a' {...props} />)
		replaceCheckbox().focus(); await user.keyboard(' ')
		expect(replaceCheckbox()).not.toBeChecked()
		const warning = screen.getByRole('alertdialog', { name: 'Allow replacing existing values?' })
		expect(warning).toHaveTextContent('these 2 selected games')
		expect(warning).toHaveTextContent('Missing provider values will not erase saved information')
		expect(screen.getByRole('button', { name: 'Keep existing' })).toHaveFocus()
		expect(props.onBulkAutofill).not.toHaveBeenCalled()
		await user.tab(); await user.keyboard('{Enter}')
		expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
		expect(replaceCheckbox()).toBeChecked(); expect(replaceCheckbox()).toHaveFocus()
		expect(props.onBulkAutofill).not.toHaveBeenCalled()
		await user.click(screen.getByRole('button', { name: 'Autofill' }))
		expect(props.onBulkAutofill).toHaveBeenCalledExactlyOnceWith({ overwrite: true })
		await user.click(replaceCheckbox())
		expect(replaceCheckbox()).not.toBeChecked(); expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
		await user.click(screen.getByRole('button', { name: 'Autofill' }))
		expect(props.onBulkAutofill).toHaveBeenLastCalledWith({ overwrite: false })
	})

	it.each(['cancel', 'escape', 'backdrop'])('keeps Replace off after dismissing the warning with %s', async method => {
		const props = callbacks(), user = userEvent.setup(), outerEscape = vi.fn()
		render(<div onKeyDown={outerEscape}><LibrarySelectionToolbar selectedCount={1} selectionKey='a' {...props} /></div>)
		await user.click(replaceCheckbox())
		expect(screen.getByRole('alertdialog')).toHaveTextContent('this selected game')
		if (method === 'cancel') await user.click(screen.getByRole('button', { name: 'Keep existing' }))
		else if (method === 'escape') { outerEscape.mockClear(); await user.keyboard('{Escape}'); expect(outerEscape).not.toHaveBeenCalled() }
		else fireEvent.click(document.querySelector('.confirm-dialog__backdrop')!)
		expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(); expect(replaceCheckbox()).not.toBeChecked()
		expect(replaceCheckbox()).toHaveFocus(); expect(props.onBulkAutofill).not.toHaveBeenCalled()
	})

	it('resets confirmed permission across exact-ID changes with the same count and never revives old permission', async () => {
		const props = callbacks(), user = userEvent.setup()
		const view = render(<LibrarySelectionToolbar selectedCount={2} selectionKey='owner:1/ids:11,12' {...props} />)
		await enableReplace(user)
		view.rerender(<LibrarySelectionToolbar selectedCount={2} selectionKey='owner:1/ids:21,22' {...props} />)
		expect(replaceCheckbox()).not.toBeChecked()
		view.rerender(<LibrarySelectionToolbar selectedCount={2} selectionKey='owner:1/ids:11,12' {...props} />)
		expect(replaceCheckbox()).not.toBeChecked()
		await user.click(screen.getByRole('button', { name: 'Autofill' }))
		expect(props.onBulkAutofill).toHaveBeenCalledExactlyOnceWith({ overwrite: false })
	})

	it('dismisses pending authorization on owner/query changes, count changes, or a busy transition', async () => {
		const props = callbacks(), user = userEvent.setup()
		const view = render(<LibrarySelectionToolbar selectedCount={2} selectionKey='owner:1/query:a' {...props} />)
		await user.click(replaceCheckbox())
		view.rerender(<LibrarySelectionToolbar selectedCount={2} selectionKey='owner:2/query:b' {...props} />)
		expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(); expect(replaceCheckbox()).not.toBeChecked()
		await enableReplace(user)
		view.rerender(<LibrarySelectionToolbar selectedCount={0} selectionKey='owner:2/query:b' {...props} />)
		expect(replaceCheckbox()).not.toBeChecked(); expect(replaceCheckbox()).toBeDisabled()
		view.rerender(<LibrarySelectionToolbar selectedCount={2} selectionKey='owner:2/query:b' {...props} />)
		await user.click(replaceCheckbox())
		view.rerender(<LibrarySelectionToolbar selectedCount={2} selectionKey='owner:2/query:b' {...props} bulkAutofillBusy />)
		expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
		view.rerender(<LibrarySelectionToolbar selectedCount={2} selectionKey='owner:2/query:b' {...props} />)
		expect(replaceCheckbox()).not.toBeChecked(); expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
		expect(props.onBulkAutofill).not.toHaveBeenCalled()
	})

	it('clears replacement authorization on Done, Select visible and Deselect even before the parent updates', async () => {
		const props = callbacks(), user = userEvent.setup()
		render(<LibrarySelectionToolbar selectedCount={2} selectionKey='a' {...props} />)
		for (const label of ['Done', 'Select visible', 'Deselect']) {
			await enableReplace(user); await user.click(screen.getByRole('button', { name: label }))
			expect(replaceCheckbox()).not.toBeChecked()
		}
		expect(props.onDone).toHaveBeenCalledOnce(); expect(props.onSelectAll).toHaveBeenCalledOnce(); expect(props.onDeselectAll).toHaveBeenCalledOnce()
	})

	it.each(['bulkAutofillBusy', 'bulkImagesDisabled'] as const)('disables conflicting actions while %s, retaining an intelligible primary action', async flag => {
		const props = callbacks(), user = userEvent.setup()
		const view = render(<LibrarySelectionToolbar selectedCount={2} selectionKey='a' {...props} />)
		await enableReplace(user)
		view.rerender(<LibrarySelectionToolbar selectedCount={2} selectionKey='a' {...props} {...{ [flag]: true }} />)
		for (const button of within(screen.getByRole('group', { name: 'Selection actions' })).getAllByRole('button')) expect(button).toBeDisabled()
		expect(replaceCheckbox()).toBeDisabled(); expect(replaceCheckbox()).not.toBeChecked()
		expect(screen.getByRole('combobox', { name: 'Image to refresh' })).toBeDisabled()
		await user.click(screen.getByRole('button', { name: 'Autofill' })); expect(props.onBulkAutofill).not.toHaveBeenCalled()
		view.rerender(<LibrarySelectionToolbar selectedCount={2} selectionKey='a' {...props} />)
		expect(replaceCheckbox()).not.toBeChecked()
	})

	it('keeps selection entry usable with zero selected games but never enables a mutation', async () => {
		const props = callbacks(), user = userEvent.setup()
		render(<LibrarySelectionToolbar selectedCount={0} {...props} />)
		expect(screen.getByRole('button', { name: 'Select visible' })).toBeEnabled()
		for (const label of ['Autofill', 'Edit', 'Delete', 'Export', 'Refresh image']) expect(screen.getByRole('button', { name: label })).toBeDisabled()
		await user.click(screen.getByRole('button', { name: 'Select visible' })); expect(props.onSelectAll).toHaveBeenCalledOnce()
	})

	it('refreshes only the explicitly chosen artwork role through the separate callback', async () => {
		const props = callbacks(), user = userEvent.setup()
		render(<LibrarySelectionToolbar selectedCount={2} {...props} />)
		const artwork = screen.getByRole('group', { name: 'Refresh artwork' })
		expect(within(artwork).getByRole('combobox')).toHaveValue('cover')
		await user.selectOptions(within(artwork).getByRole('combobox'), 'hero')
		await user.click(within(artwork).getByRole('button', { name: 'Refresh image' }))
		expect(props.onBulkRefreshImages).toHaveBeenCalledExactlyOnceWith('hero'); expect(props.onBulkAutofill).not.toHaveBeenCalled()
	})

	it('uses measured available space: artwork stays inline at a fitting width and overflow contains only moved controls', async () => {
		const props = callbacks(), user = userEvent.setup()
		render(<LibrarySelectionToolbar selectedCount={2} {...props} />)
		expect(screen.queryByRole('button', { name: 'More selection actions' })).not.toBeInTheDocument()
		resize(1000)
		expect(screen.getByRole('button', { name: 'Refresh image' })).toBeVisible()
		expect(screen.getByRole('button', { name: 'Autofill' })).toBeVisible()
		expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument()
		await user.click(screen.getByRole('button', { name: 'More selection actions' }))
		const panel = screen.getByRole('dialog', { name: 'More selection actions' })
		expect(within(panel).getByRole('button', { name: 'Export' })).toBeVisible()
		expect(within(panel).queryByRole('button', { name: 'Refresh image' })).not.toBeInTheDocument()
		expect(screen.getAllByRole('button', { name: 'Refresh image' })).toHaveLength(1)
		await user.click(within(panel).getByRole('button', { name: 'Export' }))
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(props.onBulkExport).toHaveBeenCalledOnce()
		resize(1400)
		expect(screen.queryByRole('button', { name: 'More selection actions' })).not.toBeInTheDocument()
		expect(screen.getAllByRole('button', { name: 'Export' })).toHaveLength(1)
	})

	it('keeps Autofill and Replace visible on narrow layouts, restores focus on Escape, and closes overflow before an action', async () => {
		availableWidth = 360
		const props = callbacks(), user = userEvent.setup()
		render(<LibrarySelectionToolbar selectedCount={2} {...props} />)
		expect(screen.getByRole('group', { name: 'Selection actions' })).toHaveAttribute('data-compact', 'true')
		expect(screen.getByRole('button', { name: 'Autofill' })).toBeVisible(); expect(replaceCheckbox()).toBeVisible()
		expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
		const more = screen.getByRole('button', { name: 'More selection actions' })
		expect(more).toHaveAttribute('aria-haspopup', 'dialog')
		more.focus(); await user.keyboard('{Enter}')
		expect(screen.getByRole('button', { name: 'Select visible' })).toHaveFocus()
		await user.keyboard('{Escape}'); expect(more).toHaveFocus()
		await user.click(more); await user.click(screen.getByRole('button', { name: 'Edit' }))
		expect(props.onBulkEdit).toHaveBeenCalledOnce(); expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		expect(more).toHaveFocus()
	})

	it('does not strand focus when an inline action moves into overflow', () => {
		render(<LibrarySelectionToolbar selectedCount={2} {...callbacks()} />)
		screen.getByRole('button', { name: 'Edit' }).focus()
		resize(360)
		expect(screen.getByRole('button', { name: 'More selection actions' })).toHaveFocus()
	})

	it('closes and recovers focus when a container resize removes or repositions an open overflow panel', async () => {
		availableWidth = 1000
		const user = userEvent.setup()
		render(<LibrarySelectionToolbar selectedCount={2} {...callbacks()} />)
		await user.click(screen.getByRole('button', { name: 'More selection actions' }))
		expect(screen.getByRole('button', { name: 'Select visible' })).toHaveFocus()
		resize(950)
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'More selection actions' })).toHaveFocus()
		await user.click(screen.getByRole('button', { name: 'More selection actions' }))
		resize(1400)
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Autofill' })).toHaveFocus()
	})

	it('falls back to resize events when ResizeObserver is unavailable', () => {
		vi.stubGlobal('ResizeObserver', undefined)
		render(<LibrarySelectionToolbar selectedCount={2} {...callbacks()} />)
		availableWidth = 360; fireEvent(window, new Event('resize'))
		expect(screen.getByRole('group', { name: 'Selection actions' })).toHaveAttribute('data-compact', 'true')
		expect(screen.getByRole('button', { name: 'More selection actions' })).toBeVisible()
	})

	it('retains the chosen artwork role when its controls move into overflow', async () => {
		const props = callbacks(), user = userEvent.setup()
		render(<LibrarySelectionToolbar selectedCount={2} {...props} />)
		await user.selectOptions(screen.getByRole('combobox', { name: 'Image to refresh' }), 'logo')
		resize(360); await user.click(screen.getByRole('button', { name: 'More selection actions' }))
		expect(screen.getByRole('combobox', { name: 'Image to refresh' })).toHaveValue('logo')
		await user.click(screen.getByRole('button', { name: 'Refresh image' }))
		expect(props.onBulkRefreshImages).toHaveBeenCalledExactlyOnceWith('logo'); expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('provides Spanish primary labels and the same confirmation gate without fallback keys', async () => {
		await i18n.changeLanguage('es'); availableWidth = 360
		const props = callbacks(), user = userEvent.setup()
		render(<LibrarySelectionToolbar selectedCount={2} {...props} />)
		expect(screen.getByRole('button', { name: 'Autocompletar' })).toHaveAccessibleDescription('Rellena los campos vacíos')
		await user.click(screen.getByRole('checkbox', { name: 'Reemplazar metadatos existentes' }))
		expect(screen.getByRole('alertdialog', { name: '¿Permitir reemplazar valores existentes?' })).toHaveTextContent('estos 2 juegos seleccionados')
		await user.click(screen.getByRole('button', { name: 'Permitir reemplazar' }))
		expect(props.onBulkAutofill).not.toHaveBeenCalled()
		await user.click(screen.getByRole('button', { name: 'Autocompletar' }))
		expect(props.onBulkAutofill).toHaveBeenCalledExactlyOnceWith({ overwrite: true })
		expect(document.body.textContent).not.toContain('gallery.bulkToolbar.')
	})

	it('contains zero-selection mode copy inside the primary action rather than leaving a detached helper row', () => {
		render(<LibrarySelectionToolbar selectedCount={0} {...callbacks()} />)
		const autofill = screen.getByRole('button', { name: 'Autofill' })
		const hint = document.getElementById(autofill.getAttribute('aria-describedby')!)
		expect(autofill).toHaveAccessibleName('Autofill')
		expect(autofill).toContainElement(hint)
		expect(autofill).toHaveAccessibleDescription('Fills empty fields')
		expect(replaceCheckbox()).toHaveAccessibleDescription('Fills empty fields')
		expect(autofill).not.toContainElement(replaceCheckbox())
		expect(screen.getAllByText('Fills empty fields')).toHaveLength(1)
		expect(autofill).toBeDisabled()
		expect(screen.getByRole('button', { name: 'Select visible' })).toBeEnabled()
		expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled()
	})

	it('keeps the contained mode description and framed Replace state synchronized with explicit confirmation', async () => {
		const user = userEvent.setup()
		render(<LibrarySelectionToolbar selectedCount={2} {...callbacks()} />)
		const autofill = screen.getByRole('button', { name: 'Autofill' }), label = replaceCheckbox().closest('label')!
		expect(label).toHaveAttribute('data-active', 'false')
		await user.click(replaceCheckbox())
		expect(label).toHaveAttribute('data-active', 'false')
		await user.click(screen.getByRole('button', { name: 'Enable Replace' }))
		expect(label).toHaveAttribute('data-active', 'true')
		expect(autofill).toHaveAccessibleDescription('Existing values may be replaced')
		expect(autofill).toContainElement(document.getElementById(autofill.getAttribute('aria-describedby')!))
		await user.click(replaceCheckbox())
		expect(label).toHaveAttribute('data-active', 'false')
		expect(autofill).toHaveAccessibleDescription('Fills empty fields')
	})

	it('does not impose a compact overflow breakpoint when the actual controls fit below 600px', () => {
		availableWidth = 590
		render(<LibrarySelectionToolbar selectedCount={2} onBulkAutofill={vi.fn()} onBulkEdit={vi.fn()} onDone={vi.fn()} />)
		expect(screen.getByRole('group', { name: 'Selection actions' })).toHaveAttribute('data-compact', 'false')
		expect(screen.getByRole('button', { name: 'Edit' })).toBeVisible()
		expect(screen.queryByRole('button', { name: 'More selection actions' })).not.toBeInTheDocument()
	})

	it('restores inline controls using intrinsic primary width after a compact row was stretched', () => {
		const original = vi.mocked(HTMLElement.prototype.getBoundingClientRect).getMockImplementation()!
		vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockImplementation(function (this: HTMLElement) {
			if (this.classList.contains('gdb-bulk-toolbar__autofill') && this.closest('.gdb-bulk-toolbar')?.getAttribute('data-compact') === 'true') return rectangle(availableWidth)
			return original.call(this)
		})
		availableWidth = 360
		render(<LibrarySelectionToolbar selectedCount={2} {...callbacks()} />)
		expect(screen.getByRole('group', { name: 'Selection actions' })).toHaveAttribute('data-compact', 'true')
		resize(590)
		expect(screen.getByRole('group', { name: 'Selection actions' })).toHaveAttribute('data-compact', 'false')
		expect(screen.getByRole('button', { name: 'Edit' })).toBeVisible()
		expect(screen.getAllByRole('button', { name: 'Autofill' })).toHaveLength(1)
		expect(screen.getByRole('button', { name: 'More selection actions' })).toBeVisible()
	})

	it('budgets the 44px overflow trigger and moves a group only when it no longer fits', async () => {
		availableWidth = 560
		const user = userEvent.setup()
		render(<LibrarySelectionToolbar selectedCount={2} {...callbacks()} />)
		const root = screen.getByRole('group', { name: 'Selection actions' })
		root.style.padding = '0'; root.style.border = '0'; root.style.columnGap = '8px'
		resize(560)
		expect(screen.getByRole('button', { name: 'Edit' })).toBeVisible()
		resize(559)
		expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
		await user.click(screen.getByRole('button', { name: 'More selection actions' }))
		expect(within(screen.getByRole('dialog', { name: 'More selection actions' })).getByRole('button', { name: 'Edit' })).toBeVisible()
		expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(1)
	})

	it('closes overflow on an outside action without stealing focus from that action', async () => {
		availableWidth = 1000
		const props = callbacks(), user = userEvent.setup()
		render(<LibrarySelectionToolbar selectedCount={2} {...props} />)
		await user.click(screen.getByRole('button', { name: 'More selection actions' }))
		await user.click(screen.getByRole('button', { name: 'Autofill' }))
		expect(screen.queryByRole('dialog', { name: 'More selection actions' })).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Autofill' })).toHaveFocus()
		expect(props.onBulkAutofill).toHaveBeenCalledExactlyOnceWith({ overwrite: false })
	})
})
