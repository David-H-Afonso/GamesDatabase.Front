import React, { useEffect, useState } from 'react'
import { useGamePlayedStatus } from '@/hooks'
import { reorderGamePlayedStatuses } from '@/services'
import type {
	GamePlayedStatus,
	GamePlayedStatusCreateDto,
	GamePlayedStatusUpdateDto,
} from '@/models/api/GamePlayedStatus'
import type { QueryParameters } from '@/models/api/Game'
import './AdminPlayedStatus.scss'

export const AdminPlayedStatus: React.FC = () => {
	const {
		playedStatuses,
		loading,
		error,
		pagination,
		loadPlayedStatuses,
		createPlayedStatus,
		updatePlayedStatus,
		deletePlayedStatus,
	} = useGamePlayedStatus()

	const [isModalOpen, setIsModalOpen] = useState(false)
	const [editingStatus, setEditingStatus] = useState<GamePlayedStatus | null>(null)
	const [formData, setFormData] = useState<GamePlayedStatusCreateDto>({
		name: '',
		isActive: true,
		color: '#000000',
	})

	// Pagination and sorting state
	const [queryParams, setQueryParams] = useState<QueryParameters>({
		page: 1,
		pageSize: 10,
		sortBy: undefined,
		sortDescending: false,
	})

	// Drag and drop state
	const [draggedId, setDraggedId] = useState<number | null>(null)
	const [dragOverId, setDragOverId] = useState<number | null>(null)
	const [isReordering, setIsReordering] = useState(false)

	useEffect(() => {
		loadPlayedStatuses(queryParams)
	}, [loadPlayedStatuses, queryParams])

	// Pagination handlers
	const handlePageChange = (newPage: number) => {
		setQueryParams((prev) => ({ ...prev, page: newPage }))
	}

	const handlePageSizeChange = (newPageSize: number) => {
		setQueryParams((prev) => ({ ...prev, pageSize: newPageSize, page: 1 }))
	}

	// Reorder played statuses by moving status with id `sourceId` to the position of `targetId`.
	const reorderPlayedStatuses = async (sourceId: number, targetId: number) => {
		// Work on a copy ordered by sortOrder if present, otherwise by id
		const ordered = [...playedStatuses].sort((a, b) => {
			const aKey = a.sortOrder ?? a.id
			const bKey = b.sortOrder ?? b.id
			return aKey - bKey
		})

		const sourceIndex = ordered.findIndex((s) => s.id === sourceId)
		const targetIndex = ordered.findIndex((s) => s.id === targetId)
		if (sourceIndex === -1 || targetIndex === -1) return

		// Remove source and insert at targetIndex
		const [moved] = ordered.splice(sourceIndex, 1)
		ordered.splice(targetIndex, 0, moved)

		// Extract ordered IDs
		const orderedIds = ordered.map((s) => s.id)

		setIsReordering(true)
		try {
			await reorderGamePlayedStatuses(orderedIds)
			// Reload list to reflect server state
			await loadPlayedStatuses(queryParams)
		} catch (err) {
			console.error('Failed to reorder played statuses:', err)
			window.alert('Error al reordenar. Por favor, intenta de nuevo.')
		} finally {
			setIsReordering(false)
		}
	}

	const handleOpenModal = (status?: GamePlayedStatus) => {
		if (status) {
			setEditingStatus(status)
			setFormData({
				name: status.name,
				isActive: status.isActive,
				color: status.color || '#000000',
			})
		} else {
			setEditingStatus(null)
			setFormData({
				name: '',
				isActive: true,
				color: '#000000',
			})
		}
		setIsModalOpen(true)
	}

	const handleCloseModal = () => {
		setIsModalOpen(false)
		setEditingStatus(null)
		setFormData({
			name: '',
			isActive: true,
			color: '#000000',
		})
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		try {
			if (editingStatus) {
				const updateData = { ...formData, id: editingStatus.id } as GamePlayedStatusUpdateDto
				await updatePlayedStatus(editingStatus.id, updateData)
			} else {
				await createPlayedStatus(formData)
			}
			handleCloseModal()
			await loadPlayedStatuses(queryParams) // Reload data after create/update
		} catch (error) {
			console.error('Error saving played status:', error)
		}
	}

	const handleDelete = async (id: number) => {
		if (window.confirm('¿Estás seguro de que quieres eliminar este estado?')) {
			try {
				await deletePlayedStatus(id)
				await loadPlayedStatuses(queryParams) // Reload data after delete
			} catch (error) {
				console.error('Error deleting played status:', error)
			}
		}
	}

	return (
		<div className='admin-played-status'>
			<div className='admin-header'>
				<h1>Gestión de Played Status</h1>
				<button className='btn btn-primary' onClick={() => handleOpenModal()}>
					Nuevo Estado
				</button>
			</div>

			{error && <div className='alert alert-error'>{error}</div>}

			<div className='admin-controls'>
				<div className='page-size-control'>
					<label>Elementos por página:</label>
					<select
						value={queryParams.pageSize || 10}
						onChange={(e) => handlePageSizeChange(Number(e.target.value))}>
						<option value={5}>5</option>
						<option value={10}>10</option>
						<option value={25}>25</option>
						<option value={50}>50</option>
					</select>
				</div>
			</div>

			{loading ? (
				<div className='loading'>Cargando...</div>
			) : (
				<>
					<div className='statuses-table'>
						<table>
							<thead>
								<tr>
									<th>Nombre</th>
									<th>Color</th>
									<th>Estado</th>
									<th>Acciones</th>
								</tr>
							</thead>
							<tbody>
								{playedStatuses.map((status) => (
									<tr
										key={status.id}
										draggable={true}
										onDragStart={(e) => {
											setDraggedId(status.id)
											e.dataTransfer.effectAllowed = 'move'
										}}
										onDragOver={(e) => {
											if (isReordering) return
											e.preventDefault()
											if (status.id !== draggedId) {
												setDragOverId(status.id)
											}
										}}
										onDragLeave={() => {
											setDragOverId(null)
										}}
										onDrop={async (e) => {
											e.preventDefault()
											setDragOverId(null)
											if (isReordering || draggedId == null || draggedId === status.id) return
											await reorderPlayedStatuses(draggedId, status.id)
											setDraggedId(null)
										}}
										style={{
											cursor: 'grab',
											opacity: draggedId === status.id ? 0.5 : 1,
											borderTop: dragOverId === status.id ? '2px solid #2563eb' : undefined,
										}}>
										<td>{status.name}</td>
										<td>
											<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
												{status.color && (
													<div
														style={{
															width: '20px',
															height: '20px',
															backgroundColor: status.color,
															borderRadius: '3px',
															border: '1px solid #ccc',
														}}
													/>
												)}
												<span>{status.color || 'Sin color'}</span>
											</div>
										</td>
										<td>
											<span className={`status ${status.isActive ? 'active' : 'inactive'}`}>
												{status.isActive ? 'Activo' : 'Inactivo'}
											</span>
										</td>
										<td>
											<div className='actions'>
												<button
													className='btn btn-sm btn-secondary'
													onClick={() => handleOpenModal(status)}>
													Editar
												</button>
												<button
													className='btn btn-sm btn-danger'
													onClick={() => handleDelete(status.id)}>
													Eliminar
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div className='pagination-controls'>
						<button
							className='pagination-btn'
							disabled={pagination.page <= 1}
							onClick={() => handlePageChange(pagination.page - 1)}>
							Anterior
						</button>
						<span className='pagination-info'>
							Página {pagination.page} de {pagination.totalPages}({pagination.totalCount} elementos)
						</span>
						<button
							className='pagination-btn'
							disabled={pagination.page >= pagination.totalPages}
							onClick={() => handlePageChange(pagination.page + 1)}>
							Siguiente
						</button>
					</div>
				</>
			)}

			{isModalOpen && (
				<div className='modal-overlay'>
					<div className='modal'>
						<div className='modal-header'>
							<h2>{editingStatus ? 'Editar Estado' : 'Nuevo Estado'}</h2>
							<button className='close-btn' onClick={handleCloseModal}>
								×
							</button>
						</div>
						<form onSubmit={handleSubmit} className='modal-body'>
							<div className='form-group'>
								<label htmlFor='name'>Nombre</label>
								<input
									type='text'
									id='name'
									value={formData.name}
									onChange={(e) => setFormData({ ...formData, name: e.target.value })}
									required
								/>
							</div>
							<div className='form-group'>
								<label htmlFor='color'>Color</label>
								<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
									<input
										type='color'
										id='colorPicker'
										value={formData.color || '#000000'}
										onChange={(e) => setFormData({ ...formData, color: e.target.value })}
										style={{ width: '50px', height: '40px', padding: '0', border: 'none' }}
									/>
									<input
										type='text'
										id='color'
										value={formData.color || ''}
										onChange={(e) => setFormData({ ...formData, color: e.target.value })}
										placeholder='#000000'
										pattern='^#[0-9A-Fa-f]{6}$'
										style={{ flex: 1 }}
									/>
								</div>
							</div>
							<div className='form-group'>
								<label className='checkbox-label'>
									<input
										type='checkbox'
										checked={formData.isActive}
										onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
									/>
									Activo
								</label>
							</div>
							<div className='modal-footer'>
								<button type='button' className='btn btn-secondary' onClick={handleCloseModal}>
									Cancelar
								</button>
								<button type='submit' className='btn btn-primary'>
									{editingStatus ? 'Actualizar' : 'Crear'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	)
}

export default AdminPlayedStatus
