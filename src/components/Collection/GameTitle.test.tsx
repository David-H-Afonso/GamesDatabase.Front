import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GameTitle } from './GameTitle'

const pointer = (element: HTMLElement, type: string, values: Record<string, unknown> = {}) => { const event = new Event(type, { bubbles: true, cancelable: true }); for (const [key, value] of Object.entries(values)) Object.defineProperty(event, key, { value }); fireEvent(element, event) }
describe('full game title popup', () => {
	afterEach(() => vi.useRealTimers())
	it('keeps the complete accessible name and displays it on keyboard focus', () => {
		render(<GameTitle name='A very long game title' onOpen={vi.fn()} />)
		const button = screen.getByRole('button', { name: 'A very long game title' })
		expect(button).not.toHaveAttribute('title')
		const text = button.querySelector('.gdb-title-text')!
		Object.defineProperties(text, { scrollWidth: { value: 400 }, clientWidth: { value: 120 } })
		fireEvent.focus(button); expect(screen.getByRole('tooltip')).toHaveTextContent('A very long game title')
		fireEvent.keyDown(document, { key: 'Escape' }); expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
	})
	it('does not add an unsolicited popup to a title that fits or to artwork', () => {
		vi.useFakeTimers()
		const { rerender } = render(<GameTitle name='Short title' onOpen={vi.fn()} />)
		let button = screen.getByRole('button')
		fireEvent.focus(button); pointer(button, 'pointerenter', { pointerType: 'mouse' }); act(() => vi.advanceTimersByTime(600))
		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
		rerender(<GameTitle name='Artwork title' tooltip='hold' onOpen={vi.fn()}><img alt='' /></GameTitle>)
		button = screen.getByRole('button')
		Object.defineProperties(button, { scrollWidth: { value: 400 }, clientWidth: { value: 120 } })
		fireEvent.focus(button); pointer(button, 'pointerenter', { pointerType: 'mouse' }); act(() => vi.advanceTimersByTime(600))
		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
	})
	it('shows the title on a stationary mobile hold without opening the game on release', () => {
		vi.useFakeTimers(); const open = vi.fn()
		render(<GameTitle name='A very long game title' onOpen={open} />)
		const button = screen.getByRole('button')
		pointer(button, 'pointerdown', { pointerType: 'touch', clientX: 20, clientY: 30 }); act(() => vi.advanceTimersByTime(510))
		expect(screen.getByRole('tooltip')).toHaveTextContent('A very long game title')
		pointer(button, 'pointerup', { pointerType: 'touch' }); fireEvent.click(button); expect(open).not.toHaveBeenCalled()
		fireEvent.click(button); expect(open).toHaveBeenCalledOnce()
	})
	it('cancels the popup when a touch moves to scroll', () => {
		vi.useFakeTimers(); render(<GameTitle name='Title' onOpen={vi.fn()} />)
		const button = screen.getByRole('button')
		pointer(button, 'pointerdown', { pointerType: 'touch', clientX: 20, clientY: 30 }); pointer(button, 'pointermove', { pointerType: 'touch', clientX: 20, clientY: 80 }); act(() => vi.advanceTimersByTime(600))
		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
	})
})
