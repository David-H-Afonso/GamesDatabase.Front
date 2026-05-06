import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useClickOutside } from './useClickOutside'

describe('useClickOutside', () => {
	beforeEach(() => {
		vi.restoreAllMocks()
	})

	it('calls the handler when clicking outside the referenced element', () => {
		const handler = vi.fn()
		const { result } = renderHook(() => useClickOutside(handler))

		// Create an element outside the ref target
		const outside = document.createElement('button')
		document.body.appendChild(outside)

		// Attach the ref to an inner div
		const innerDiv = document.createElement('div')
		document.body.appendChild(innerDiv)
		;(result.current as any).current = innerDiv

		act(() => {
			outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
		})

		expect(handler).toHaveBeenCalledTimes(1)

		outside.remove()
		innerDiv.remove()
	})

	it('does NOT call the handler when clicking inside the referenced element', () => {
		const handler = vi.fn()
		const { result } = renderHook(() => useClickOutside(handler))

		const container = document.createElement('div')
		const inner = document.createElement('span')
		container.appendChild(inner)
		document.body.appendChild(container)
		;(result.current as any).current = container

		act(() => {
			inner.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
		})

		expect(handler).not.toHaveBeenCalled()

		container.remove()
	})

	it('does NOT call the handler when the event has defaultPrevented', () => {
		const handler = vi.fn()
		const { result } = renderHook(() => useClickOutside(handler))

		const outside = document.createElement('button')
		document.body.appendChild(outside)

		const container = document.createElement('div')
		document.body.appendChild(container)
		;(result.current as any).current = container

		act(() => {
			const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
			event.preventDefault()
			outside.dispatchEvent(event)
		})

		expect(handler).not.toHaveBeenCalled()

		outside.remove()
		container.remove()
	})

	it('removes the event listener on unmount (no memory leaks)', () => {
		const addSpy = vi.spyOn(document, 'addEventListener')
		const removeSpy = vi.spyOn(document, 'removeEventListener')

		const handler = vi.fn()
		const { unmount } = renderHook(() => useClickOutside(handler))

		expect(addSpy).toHaveBeenCalledWith('mousedown', expect.any(Function))

		unmount()

		expect(removeSpy).toHaveBeenCalledWith('mousedown', expect.any(Function))
	})

	it('accepts an external ref and uses it instead of the internal one', () => {
		const handler = vi.fn()

		const container = document.createElement('div')
		document.body.appendChild(container)

		// Provide a pre-populated ref — current is already HTMLDivElement, no cast needed
		const externalRef: React.RefObject<HTMLDivElement> = { current: container }

		const outside = document.createElement('button')
		document.body.appendChild(outside)

		renderHook(() => useClickOutside(handler, externalRef))

		act(() => {
			outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
		})

		expect(handler).toHaveBeenCalledTimes(1)

		container.remove()
		outside.remove()
	})
})
