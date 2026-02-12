import React from 'react'
import './ReorderButtons.scss'

interface ReorderButtonsProps {
	/** Si puede moverse hacia arriba */
	canMoveUp: boolean
	/** Si puede moverse hacia abajo */
	canMoveDown: boolean
	/** Callback cuando se hace click en subir */
	onMoveUp: () => void
	/** Callback cuando se hace click en bajar */
	onMoveDown: () => void
	/** Si está procesando una acción de reorden */
	isProcessing?: boolean
	/** Tamaño de los botones */
	size?: 'small' | 'medium' | 'large'
}

/**
 * Componente de botones de reordenamiento con flechas
 * Reemplaza el drag and drop por una interfaz más intuitiva
 */
export const ReorderButtons: React.FC<ReorderButtonsProps> = ({ canMoveUp, canMoveDown, onMoveUp, onMoveDown, isProcessing = false, size = 'medium' }) => {
	return (
		<div className={`reorder-buttons reorder-buttons--${size}`}>
			<button type='button' className='reorder-button reorder-button--up' onClick={onMoveUp} disabled={!canMoveUp || isProcessing} title='Mover arriba' aria-label='Mover arriba'>
				<svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
					<path d='M8 3L3 8H6V13H10V8H13L8 3Z' fill='currentColor' />
				</svg>
			</button>
			<button
				type='button'
				className='reorder-button reorder-button--down'
				onClick={onMoveDown}
				disabled={!canMoveDown || isProcessing}
				title='Mover abajo'
				aria-label='Mover abajo'>
				<svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
					<path d='M8 13L13 8H10V3H6V8H3L8 13Z' fill='currentColor' />
				</svg>
			</button>
		</div>
	)
}
