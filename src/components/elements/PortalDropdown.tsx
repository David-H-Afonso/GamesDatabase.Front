import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface PortalDropdownProps {
	children: React.ReactNode
	style?: React.CSSProperties
	containerId?: string
	contentRef?: React.RefObject<HTMLDivElement | null>
	onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
}

export default function PortalDropdown({ children, style, containerId = 'dropdown-portal', contentRef, onClick }: PortalDropdownProps) {
	const elRef = useRef<HTMLDivElement | null>(null)

	if (!elRef.current) elRef.current = document.createElement('div')

	useEffect(() => {
		const nativeLayers = document.querySelectorAll('dialog[open] [data-gdb-modal-layer]')
		const container = nativeLayers[nativeLayers.length - 1] || document.getElementById(containerId) || document.body
		const el = elRef.current!
		container.appendChild(el)
		return () => {
			container.removeChild(el)
		}
	}, [containerId])

	return createPortal(
		<div style={document.querySelector('dialog[open]') && style ? { ...style, position: 'fixed', ...(style.left ? { left: `${parseFloat(String(style.left)) - window.scrollX}px` } : {}), ...(style.top ? { top: `${parseFloat(String(style.top)) - window.scrollY}px` } : {}) } : style} ref={contentRef} onClick={onClick} onMouseDown={(e) => e.stopPropagation()}>
			{children}
		</div>,
		elRef.current
	)
}
