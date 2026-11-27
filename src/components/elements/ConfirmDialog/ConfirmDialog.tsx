import { type FC, type KeyboardEvent, type ReactNode, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import './ConfirmDialog.scss'

interface ConfirmDialogProps {
	isOpen: boolean
	title: string
	message: ReactNode
	onConfirm: () => void
	onCancel: () => void
	confirmLabel?: string
	cancelLabel?: string
	variant?: 'danger' | 'primary'
	isConfirming?: boolean
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

export const ConfirmDialog: FC<ConfirmDialogProps> = ({ isOpen, title, message, onConfirm, onCancel, confirmLabel, cancelLabel, variant = 'danger', isConfirming = false }) => {
	const { t } = useTranslation()
	const panelRef = useRef<HTMLDivElement>(null)
	const cancelRef = useRef<HTMLButtonElement>(null)
	const titleId = useId()
	const messageId = useId()

	useEffect(() => {
		if (!isOpen) return
		const previouslyFocused = document.activeElement as HTMLElement | null
		cancelRef.current?.focus()
		const previousOverflow = document.body.style.overflow
		document.body.style.overflow = 'hidden'
		return () => {
			document.body.style.overflow = previousOverflow
			previouslyFocused?.focus?.()
		}
	}, [isOpen])
	useEffect(() => {
		const panel = panelRef.current
		if (!isOpen || !panel) return
		const active = document.activeElement
		if (panel.contains(active) && !(active instanceof HTMLElement && active.matches(':disabled'))) return
		const dialogs = document.querySelectorAll('[aria-modal="true"], dialog[open]')
		if (dialogs[dialogs.length - 1] === panel.closest('[aria-modal="true"]')) (isConfirming ? panel : cancelRef.current)?.focus()
	}, [isOpen, isConfirming])

	if (!isOpen) return null
	const requestCancel = () => {
		if (!isConfirming) { onCancel(); return }
		const panel = panelRef.current, dialogs = document.querySelectorAll('[aria-modal="true"], dialog[open]')
		if (panel && dialogs[dialogs.length - 1] === panel.closest('[aria-modal="true"]')) panel.focus()
	}

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === 'Escape') {
			event.preventDefault()
			requestCancel()
		} else if (event.key === 'Tab') {
			if (isConfirming) { event.preventDefault(); panelRef.current?.focus(); return }
			trapTab(event, panelRef.current)
		}
	}

	const nativeLayers = document.querySelectorAll('dialog[open] [data-gdb-modal-layer]')
	const portalTarget = nativeLayers[nativeLayers.length - 1] || document.getElementById('modal-portal') || document.body

	return createPortal(
		<div className='confirm-dialog' role='alertdialog' aria-modal='true' aria-labelledby={titleId} aria-describedby={messageId} onKeyDown={handleKeyDown}>
			<div className='confirm-dialog__backdrop' onMouseDown={event => { if (isConfirming) event.preventDefault() }} onClick={requestCancel} />
			<div className='confirm-dialog__panel' ref={panelRef} tabIndex={-1} aria-busy={isConfirming}>
				<h2 className='confirm-dialog__title' id={titleId}>
					{title}
				</h2>
				<div className='confirm-dialog__message' id={messageId}>
					{message}
				</div>
				<div className='confirm-dialog__actions'>
					<button ref={cancelRef} type='button' className='btn btn-secondary' onClick={onCancel} disabled={isConfirming}>
						{cancelLabel ?? t('common.cancel')}
					</button>
					<button type='button' className={`btn btn-${variant}`} onClick={onConfirm} disabled={isConfirming}>
						{confirmLabel ?? t('common.confirm')}
					</button>
				</div>
			</div>
		</div>,
		portalTarget
	)
}
