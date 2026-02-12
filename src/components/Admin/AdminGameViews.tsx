import React, { useEffect, useState } from 'react'
import { useGameViews } from '@/hooks'
import { reorderGameViews } from '@/services'
import type { GameView, GameViewQueryParameters } from '@/models/api/GameView'
import GameViewModal from './GameViewModal'
import { ReorderButtons } from '@/components/elements/ReorderButtons/ReorderButtons'
import './AdminGameViews.scss'

export const AdminGameViews: React.FC = () => {
	const { gameViews, loading, error, loadGameViews, loadGameViewById, deleteGameView } = useGameViews()

	const [isModalOpen, setIsModalOpen] = useState(false)
	const [editingGameView, setEditingGameView] = useState<GameView | null>(null)
	const [isReordering, setIsReordering] = useState(false)

	// Pagination and sorting state
	const [queryParams, setQueryParams] = useState<GameViewQueryParameters>({
		page: 1,
		pageSize: 50,
	})

	useEffect(() => {
		loadGameViews(queryParams)
	}, [loadGameViews, queryParams])

	const handleSearchChange = (search: string) => {
		setQueryParams((prev) => ({ ...prev, search: search || undefined, page: 1 }))
	}

	const moveView = async (viewId: number, direction: 'up' | 'down') => {
		if (isReordering || !gameViews || gameViews.length < 2) return

		const currentIndex = gameViews.findIndex((v) => v.id === viewId)
		if (currentIndex === -1) return

		const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
		if (targetIndex < 0 || targetIndex >= gameViews.length) return

		// Create new array with swapped positions
		const newOrder = [...gameViews]
		const temp = newOrder[currentIndex]
		newOrder[currentIndex] = newOrder[targetIndex]
		newOrder[targetIndex] = temp

		// Send the new order to backend
		const orderedIds = newOrder.map((v) => v.id)

		setIsReordering(true)
		try {
			await reorderGameViews(orderedIds)
			// Reload to get fresh data with updated sortOrder
			await loadGameViews(queryParams)
		} catch (err) {
			console.error('Failed to reorder views:', err)
			window.alert('Error al reordenar las vistas. Por favor, intenta de nuevo.')
		} finally {
			setIsReordering(false)
		}
	}

	const handleOpenModal = async (gameView?: GameView) => {
		if (gameView && gameView.id) {
			// Load the full game view (with configuration) by id before opening the modal
			try {
				const full = await loadGameViewById(gameView.id)
				setEditingGameView((full as GameView) || gameView)
			} catch (err) {
				console.error('Failed to load full game view:', err)
				setEditingGameView(gameView)
			}
		} else {
			setEditingGameView(null)
		}
		setIsModalOpen(true)
	}

	const handleCloseModal = () => {
		setIsModalOpen(false)
		setEditingGameView(null)
	}

	const handleSaveComplete = async () => {
		handleCloseModal()
		await loadGameViews(queryParams) // Reload data after save
	}

	const handleDelete = async (id: number, name: string) => {
		if (window.confirm(`¿Estás seguro de que quieres eliminar la vista "${name}"?`)) {
			try {
				await deleteGameView(id)
				await loadGameViews(queryParams) // Reload data after delete
			} catch (error) {
				console.error('Error deleting game view:', error)
			}
		}
	}

	const formatFiltersPreview = (gameView: GameView): string => {
		// Prefer explicit configuration -> fallback to counts provided in the list DTO -> fallback to legacy fields
		const config = (gameView as any).configuration

		let filtersCount = 0
		let sortingCount = 0

		if (config?.filterGroups) {
			// New FilterGroups structure - count total filters across all groups
			filtersCount = config.filterGroups.reduce((total: number, group: any) => {
				return total + (Array.isArray(group.filters) ? group.filters.length : 0)
			}, 0)
		} else if (Array.isArray(config?.filters)) {
			// Legacy filters array
			filtersCount = config.filters.length
		} else if (typeof (gameView as any).filterCount === 'number') {
			// Count from list DTO summary
			filtersCount = (gameView as any).filterCount
		} else if (Array.isArray((gameView as any).filters)) {
			// Very legacy structure
			filtersCount = (gameView as any).filters.length
		}

		if (Array.isArray(config?.sorting)) {
			sortingCount = config.sorting.length
		} else if (typeof (gameView as any).sortCount === 'number') {
			sortingCount = (gameView as any).sortCount
		} else if (Array.isArray((gameView as any).sorting)) {
			sortingCount = (gameView as any).sorting.length
		}

		const parts: string[] = []
		if (filtersCount > 0) {
			if (config?.filterGroups && config.filterGroups.length > 1) {
				parts.push(`${config.filterGroups.length} grupos (${filtersCount} filtros)`)
			} else {
				parts.push(`${filtersCount} filtro${filtersCount > 1 ? 's' : ''}`)
			}
		}
		if (sortingCount > 0) parts.push(`${sortingCount} ordenamiento${sortingCount > 1 ? 's' : ''}`)

		return parts.length > 0 ? parts.join(', ') : 'Sin configuración'
	}

	console.log('GameViews:', gameViews)

	return (
		<div className='admin-game-views'>
			<div className='admin-header'>
				<h1>Gestión de Vistas de Juegos</h1>
				<button className='btn btn-primary' onClick={() => handleOpenModal()}>
					Nueva Vista
				</button>
			</div>

			{error && (
				<div
					style={{
						padding: '1rem',
						color: 'red',
						backgroundColor: '#fee',
						borderRadius: '4px',
						marginBottom: '1rem',
					}}>
					Error: {error}
				</div>
			)}

			<div className='controls'>
				<input type='text' placeholder='Buscar vistas...' value={queryParams.search || ''} onChange={(e) => handleSearchChange(e.target.value)} className='search-input' />
			</div>

			{loading ? (
				<div className='loading'>Cargando...</div>
			) : (
				<div className='game-views-table'>
					<table>
						<thead>
							<tr>
								<th style={{ width: '80px' }}>Orden</th>
								<th>Nombre</th>
								<th>Configuración</th>
								<th>Creado</th>
								<th>Acciones</th>
							</tr>
						</thead>
						<tbody>
							{gameViews &&
								gameViews.map((gameView, index) => (
									<tr key={gameView.id}>
										<td>
											<ReorderButtons
												canMoveUp={index > 0}
												canMoveDown={index < gameViews.length - 1}
												onMoveUp={() => moveView(gameView.id, 'up')}
												onMoveDown={() => moveView(gameView.id, 'down')}
												isProcessing={isReordering}
											/>
										</td>
										<td className='view-name'>{gameView.name}</td>
										<td className='filters-preview' title={formatFiltersPreview(gameView)}>
											{formatFiltersPreview(gameView)}
										</td>
										<td>{new Date(gameView.createdAt).toLocaleDateString()}</td>
										<td className='actions'>
											<button className='action-btn edit' onClick={() => handleOpenModal(gameView)}>
												Editar
											</button>
											<button className='action-btn delete' onClick={() => handleDelete(gameView.id, gameView.name)}>
												Eliminar
											</button>
										</td>
									</tr>
								))}
							{!gameViews && (
								<tr>
									<td
										colSpan={6}
										style={{
											textAlign: 'center',
											padding: '2rem',
											color: 'var(--text-secondary)',
										}}>
										No se encontraron vistas de juegos
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			)}

			{isModalOpen && <GameViewModal gameView={editingGameView} onClose={handleCloseModal} onSave={handleSaveComplete} />}
		</div>
	)
}

export default AdminGameViews
