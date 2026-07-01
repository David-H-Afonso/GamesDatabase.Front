import { type FC, type KeyboardEvent, type ReactNode, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import './Modal.scss'

interface ModalProps {
	isOpen: boolean
	onClose: () => void
	title: string
	children: ReactNode
	footer?: ReactNode
	maxWidth?: string
	bodyPadding?: string
	hideBorders?: boolean
	headerPaddingBottom?: string
}

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const trapTab = (event: KeyboardEvent<HTMLDivElement>, container: HTMLElement | null) => {
	const focusable = container ? Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : []
	if (focusable.length === 0) return
	const first = focusable[0]
	const last = focusable[focusable.length - 1]
	if (event.shiftKey && document.activeElement === first) {
		event.preventDefault()
		last.focus()
	} else if (!event.shiftKey && document.activeElement === last) {
		event.preventDefault()
		first.focus()
	}
}

export const Modal: FC<ModalProps> = ({ isOpen, onClose, title, children, footer, maxWidth = '600px', bodyPadding, hideBorders = false, headerPaddingBottom }) => {
	const { t } = useTranslation()
	const panelRef = useRef<HTMLDivElement>(null)
	const titleId = useId()

	useEffect(() => {
		if (!isOpen) return
		const previouslyFocused = document.activeElement as HTMLElement | null
		const panel = panelRef.current
		if (panel && !panel.contains(document.activeElement)) {
			const firstFocusable = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
			;(firstFocusable ?? panel).focus()
		}
		const previousOverflow = document.body.style.overflow
		document.body.style.overflow = 'hidden'
		return () => {
			document.body.style.overflow = previousOverflow
			previouslyFocused?.focus?.()
		}
	}, [isOpen])

	if (!isOpen) return null

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === 'Escape') {
			event.preventDefault()
			onClose()
		} else if (event.key === 'Tab') {
			trapTab(event, panelRef.current)
		}
	}

	const portalTarget = (typeof document !== 'undefined' && document.getElementById('modal-portal')) || document.body

	return createPortal(
		<div className='modal-overlay' onClick={onClose} onKeyDown={handleKeyDown} role='presentation'>
			<div
				className='modal-content'
				style={{ maxWidth }}
				onClick={(event) => event.stopPropagation()}
				ref={panelRef}
				role='dialog'
				aria-modal='true'
				aria-labelledby={titleId}
				tabIndex={-1}>
				<div
					className='modal-header'
					style={{
						...(hideBorders ? { borderBottom: 'none' } : {}),
						...(headerPaddingBottom ? { paddingBottom: headerPaddingBottom } : {}),
					}}>
					<h2 className='modal-title' id={titleId}>
						{title}
					</h2>
					<button type='button' className='modal-close' onClick={onClose} aria-label={t('common.close')}>
						×
					</button>
				</div>
				<div className='modal-body' style={bodyPadding ? { padding: bodyPadding } : undefined}>
					{children}
				</div>
				{footer && (
					<div className='modal-footer' style={hideBorders ? { borderTop: 'none' } : undefined}>
						{footer}
					</div>
				)}
			</div>
		</div>,
		portalTarget
	)
}
