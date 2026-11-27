import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CollectionSheet } from './CollectionSheet'

describe('CollectionSheet keyboard boundaries', () => {
	afterEach(() => vi.restoreAllMocks())
	it('wraps Tab and Shift+Tab inside the visible native dialog controls', () => {
		vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([new DOMRect(0, 0, 44, 44)] as unknown as DOMRectList)
		render(<CollectionSheet open onClose={vi.fn()} title='Keyboard boundary' footer={<button type='button'>Last action</button>}><input aria-label='First field' /><button type='button' disabled>Disabled action</button></CollectionSheet>)
		const close = screen.getByRole('dialog').querySelector<HTMLButtonElement>('.gdb-sheet__head button')!
		const last = screen.getByRole('button', { name: 'Last action' })
		expect(last.closest('dialog[open]')).toBe(screen.getByRole('dialog'))
		expect(last.getClientRects()).toHaveLength(1)
		expect(getComputedStyle(last).visibility).not.toBe('hidden')
		last.focus()
		fireEvent.keyDown(last, { key: 'Tab' })
		expect(close).toHaveFocus()
		fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
		expect(last).toHaveFocus()
	})
	it('does not steal the keyboard boundary from a nested modal', () => {
		vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([new DOMRect(0, 0, 44, 44)] as unknown as DOMRectList)
		render(<CollectionSheet open onClose={vi.fn()} title='Outer sheet'><div role='dialog' aria-modal='true' aria-label='Inner modal'><button type='button'>Nested action</button></div></CollectionSheet>)
		const nested = screen.getByRole('button', { name: 'Nested action' })
		nested.focus()
		fireEvent.keyDown(nested, { key: 'Tab' })
		expect(nested).toHaveFocus()
	})
	it('focuses an explicit field after showModal and restores the opener on close', () => {
		const opener = document.createElement('button'); document.body.append(opener); opener.focus()
		const input = createRef<HTMLInputElement>()
		const view = render(<CollectionSheet open title='Creation' onClose={vi.fn()} initialFocusRef={input}><input ref={input} aria-label='Title' /></CollectionSheet>)
		expect(screen.getByRole('dialog')).toHaveAttribute('open'); expect(screen.getByRole('textbox', { name: 'Title' })).toHaveFocus()
		view.unmount(); expect(opener).toHaveFocus(); opener.remove()
	})
	it('does not close a protected write through the header, native Escape or backdrop', () => {
		const close = vi.fn(), view = render(<CollectionSheet open title='Saving' onClose={close} closeDisabled><p>Saving fields</p></CollectionSheet>)
		const dialog = screen.getByRole('dialog'); expect(dialog.querySelector('header button')).toBeDisabled()
		fireEvent(dialog, new Event('cancel', { cancelable: true })); fireEvent.click(dialog, { clientX: -20, clientY: -20 }); expect(close).not.toHaveBeenCalled()
		view.rerender(<CollectionSheet open title='Saving' onClose={close}><p>Saved fields</p></CollectionSheet>); fireEvent(dialog, new Event('cancel', { cancelable: true })); expect(close).toHaveBeenCalledOnce()
	})
})
