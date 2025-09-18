import { type FC, type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import './Modal.scss'

interface ModalProps {
	isOpen: boolean
	onClose: () => void
	title: string
	children: ReactNode
	footer?: ReactNode
	maxWidth?: string
}

export const Modal: FC<ModalProps> = ({
	isOpen,
	onClose,
	title,
	children,
	footer,
	maxWidth = '600px',
}) => {
	// Close modal on escape key
	useEffect(() => {
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose()
			}
		}

		if (isOpen) {
			document.addEventListener('keydown', handleEscape)
			document.body.style.overflow = 'hidden'
		}

		return () => {
			document.removeEventListener('keydown', handleEscape)
			document.body.style.overflow = 'unset'
		}
	}, [isOpen, onClose])

	if (!isOpen) return null

	return createPortal(
		<div className='modal-overlay' onClick={onClose}>
			<div className='modal-content' style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
				<div className='modal-header'>
					<h2 className='modal-title'>{title}</h2>
					<button className='modal-close' onClick={onClose} aria-label='Close modal'>
						×
					</button>
				</div>
				<div className='modal-body'>{children}</div>
				{footer && <div className='modal-footer'>{footer}</div>}
			</div>
		</div>,
		document.body
	)
}
