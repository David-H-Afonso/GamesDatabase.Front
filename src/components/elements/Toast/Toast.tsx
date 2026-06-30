import { type FC, type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import './Toast.scss'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
	isOpen: boolean
	message: string
	onClose: () => void
	type?: ToastType
	duration?: number
}

const TOAST_ICONS: Record<ToastType, ReactNode> = {
	success: <path d='M20 6 9 17l-5-5' />,
	error: <path d='M18 6 6 18M6 6l12 12' />,
	warning: (
		<>
			<path d='M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' />
			<path d='M12 9v4M12 17h.01' />
		</>
	),
	info: (
		<>
			<circle cx='12' cy='12' r='9' />
			<path d='M12 16v-4M12 8h.01' />
		</>
	),
}

export const Toast: FC<ToastProps> = ({ isOpen, message, onClose, type = 'info', duration = 4000 }) => {
	const { t } = useTranslation()

	useEffect(() => {
		if (!isOpen || duration <= 0) return
		const timer = window.setTimeout(onClose, duration)
		return () => window.clearTimeout(timer)
	}, [isOpen, duration])

	if (!isOpen) return null

	const portalTarget = (typeof document !== 'undefined' && document.getElementById('modal-portal')) || document.body

	return createPortal(
		<div className={`toast toast--${type}`} role={type === 'error' ? 'alert' : 'status'}>
			<svg className='toast__icon' viewBox='0 0 24 24' width='20' height='20' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
				{TOAST_ICONS[type]}
			</svg>
			<span className='toast__message'>{message}</span>
			<button type='button' className='toast__close' onClick={onClose} aria-label={t('common.close')}>
				×
			</button>
		</div>,
		portalTarget
	)
}
