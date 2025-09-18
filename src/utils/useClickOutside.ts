import { useEffect, useRef } from 'react'

/**
 * Custom hook to detect clicks outside of a specified element.
 *
 * @param onOutsideClick - Callback function to execute when a click outside the element is detected.
 * @param externalElementRef - Optional external reference to the target element.
 * @returns A reference to be attached to the target element.
 */
export const useClickOutside = <ElementType extends HTMLElement>(
	onOutsideClick: () => void,
	externalElementRef?: React.RefObject<ElementType>
) => {
	// Internal reference to the target element if no external reference is provided
	const internalElementRef = useRef<ElementType>(null)
	const targetElementRef = externalElementRef || internalElementRef

	useEffect(() => {
		// Event handler to detect clicks outside the target element
		const handleOutsideClick = (event: MouseEvent) => {
			// ignore events that were prevented/stopped upstream
			if (event.defaultPrevented) return
			if (targetElementRef.current && !targetElementRef.current.contains(event.target as Node)) {
				onOutsideClick()
			}
		}

		// Attach the event listener to the document
		document.addEventListener('mousedown', handleOutsideClick)

		// Cleanup the event listener on component unmount
		return () => {
			document.removeEventListener('mousedown', handleOutsideClick)
		}
	}, [onOutsideClick, targetElementRef])

	// Return the reference to be attached to the target element
	return targetElementRef
}
