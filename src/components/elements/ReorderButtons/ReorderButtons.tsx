import React from 'react'
import { useTranslation } from 'react-i18next'
import './ReorderButtons.scss'

interface ReorderButtonsProps {
	canMoveUp: boolean
	canMoveDown: boolean
	onMoveUp: () => void
	onMoveDown: () => void
	isProcessing?: boolean
	size?: 'small' | 'medium' | 'large'
}

export const ReorderButtons: React.FC<ReorderButtonsProps> = ({ canMoveUp, canMoveDown, onMoveUp, onMoveDown, isProcessing = false, size = 'medium' }) => {
	const { t } = useTranslation()
	const moveUpLabel = t('common.moveUp')
	const moveDownLabel = t('common.moveDown')

	return (
		<div className={`reorder-buttons reorder-buttons--${size}`}>
			<button type='button' className='reorder-button reorder-button--up' onClick={onMoveUp} disabled={!canMoveUp || isProcessing} title={moveUpLabel} aria-label={moveUpLabel}>
				<svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>
					<path d='M8 3L3 8H6V13H10V8H13L8 3Z' fill='currentColor' />
				</svg>
			</button>
			<button
				type='button'
				className='reorder-button reorder-button--down'
				onClick={onMoveDown}
				disabled={!canMoveDown || isProcessing}
				title={moveDownLabel}
				aria-label={moveDownLabel}>
				<svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>
					<path d='M8 13L13 8H10V3H6V8H3L8 13Z' fill='currentColor' />
				</svg>
			</button>
		</div>
	)
}
