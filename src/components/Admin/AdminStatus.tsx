import React, { useEffect, useState } from 'react'
import { useGameStatus } from '@/hooks'
import { reorderGameStatuses } from '@/services'
import { fetchStatuses } from '@/store/features/gameStatus/thunk'
import { useAppDispatch } from '@/store/hooks'
import type { GameStatus, GameStatusCreateDto, GameStatusUpdateDto } from '@/models/api/GameStatus'
import type { QueryParameters } from '@/models/api/Game'
import { ReorderButtons } from '@/components/elements/ReorderButtons/ReorderButtons'
import './AdminStatus.scss'

export const AdminStatus: React.FC = () => {
	const dispatch = useAppDispatch()
	const { statuses, loading, error, pagination, loadStatuses, createStatus, updateStatus, deleteStatus, reassignSpecial } = useGameStatus()

	const [isModalOpen, setIsModalOpen] = useState(false)
	const [editingStatus, setEditingStatus] = useState<GameStatus | null>(null)
	const [formData, setFormData] = useState<GameStatusCreateDto>({
		name: '',
		isActive: true,
		color: '#000000',
		statusType: 'None',
		isDefault: false,
		isSpecialStatus: false,
	})

	// Pagination and sorting state
	const [queryParams, setQueryParams] = useState<QueryParameters>({
		page: 1,
		pageSize: 50,
		// default: no sorting applied
		sortBy: undefined,
		sortDescending: false,
	})

	// Reorder state
	const [isReordering, setIsReordering] = useState(false)

	// Reorder statuses by moving status up or down one position
	// Uses the new /reorder endpoint for efficient batch updates.
	const moveStatus = async (statusId: number, direction: 'up' | 'down') => {
		if (isReordering) return // Prevent multiple simultaneous reorders

		// Work on a copy ordered by sortOrder if present, otherwise by id
		const ordered = [...statuses].sort((a, b) => {
			const aKey = a.sortOrder ?? a.id
			const bKey = b.sortOrder ?? b.id
			return aKey - bKey
		})

		const currentIndex = ordered.findIndex((s) => s.id === statusId)
		if (currentIndex === -1) return

		const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
		if (targetIndex < 0 || targetIndex >= ordered.length) return

		// Swap positions
		const [moved] = ordered.splice(currentIndex, 1)
		ordered.splice(targetIndex, 0, moved)

		// Extract ordered IDs
		const orderedIds = ordered.map((s) => s.id)

		setIsReordering(true)
		try {
			await reorderGameStatuses(orderedIds)
			// Reload list directly using dispatch to ensure fresh data
			await dispatch(fetchStatuses({ ...queryParams })).unwrap()
		} catch (err) {
			console.error('Failed to reorder statuses:', err)
			window.alert('Error al reordenar. Por favor, intenta de nuevo.')
		} finally {
			setIsReordering(false)
		}
	}

	useEffect(() => {
		loadStatuses(queryParams)
	}, [loadStatuses, queryParams])

	// Pagination handlers
	const handlePageChange = (newPage: number) => {
		setQueryParams((prev) => ({ ...prev, page: newPage }))
	}

	const handlePageSizeChange = (newPageSize: number) => {
		setQueryParams((prev) => ({ ...prev, pageSize: newPageSize, page: 1 }))
	}

	const handleOpenModal = (status?: GameStatus) => {
		if (status) {
			setEditingStatus(status)
			setFormData({
				name: status.name,
				isActive: status.isActive,
				color: status.color || '#000000',
				statusType: status.statusType || 'None',
				isDefault: status.isDefault || false,
				isSpecialStatus: status.isSpecialStatus || false,
			})
		} else {
			setEditingStatus(null)
			setFormData({
				name: '',
				isActive: true,
				color: '#000000',
				statusType: 'None',
				isDefault: false,
				isSpecialStatus: false,
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
			statusType: 'None',
			isDefault: false,
			isSpecialStatus: false,
		})
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		try {
			if (editingStatus) {
				const updateData = { ...formData, id: editingStatus.id } as GameStatusUpdateDto
				await updateStatus(editingStatus.id, updateData)
				// If statusType changed to a non-empty value, call reassign endpoint via hook
				if (formData.statusType && editingStatus?.statusType !== formData.statusType) {
					try {
						await reassignSpecial({
							newDefaultStatusId: editingStatus.id,
							statusType: formData.statusType,
						})
					} catch (err) {
						console.warn('Failed to reassign special statuses via thunk:', err)
					}
				}
			} else {
				await createStatus(formData)
			}
			handleCloseModal()
			await loadStatuses(queryParams) // Reload data after create/update
		} catch (error) {
			console.error('Error saving status:', error)
		}
	}

	const handleDelete = async (id: number) => {
		if (window.confirm('¿Estás seguro de que quieres eliminar este status?')) {
			try {
				await deleteStatus(id)
				await loadStatuses(queryParams) // Reload data after delete
			} catch (error) {
				console.error('Error deleting status:', error)
			}
		}
	}

	return (
		<div className='admin-status'>
			<div className='admin-header'>
				<h1>Gestión de Status</h1>
				<button className='btn btn-primary' onClick={() => handleOpenModal()}>
					Nuevo Status
				</button>
			</div>

			{error && <div className='alert alert-error'>{error}</div>}

			<div className='admin-controls'>
				<div className='page-size-control'>
					<label>Elementos por página:</label>
					<select value={queryParams.pageSize || 50} onChange={(e) => handlePageSizeChange(Number(e.target.value))}>
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
					<div className='status-table'>
						<table>
							<thead>
								<tr>
									<th style={{ width: '60px' }}>Orden</th>
									<th>Nombre</th>
									<th>Color</th>
									<th>Estado</th>
									<th>Acciones</th>
								</tr>
							</thead>
							<tbody>
								{[...statuses]
									.sort((a, b) => {
										const aKey = a.sortOrder ?? a.id
										const bKey = b.sortOrder ?? b.id
										return aKey - bKey
									})
									.map((status, index, array) => (
										<tr key={status.id}>
											<td>
												<ReorderButtons
													canMoveUp={index > 0}
													canMoveDown={index < array.length - 1}
													onMoveUp={() => moveStatus(status.id, 'up')}
													onMoveDown={() => moveStatus(status.id, 'down')}
													isProcessing={isReordering}
													size='small'
												/>
											</td>
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
												<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
													<span className={`status ${status.isActive ? 'active' : 'inactive'}`}>{status.isActive ? 'Activo' : 'Inactivo'}</span>
													<span className='meta'>
														{status.statusType ? `(${status.statusType})` : ''}
														{/* Default flag hidden in admin list per requirements */}
														{status.isSpecialStatus ? ' • Special' : ''}
													</span>
												</div>
											</td>
											<td>
												<div className='actions'>
													<button className='btn btn-sm btn-secondary' onClick={() => handleOpenModal(status)}>
														Editar
													</button>
													<button
														className='btn btn-sm btn-danger'
														onClick={() => handleDelete(status.id)}
														disabled={!!status.isSpecialStatus}
														title={status.isSpecialStatus ? 'No se puede eliminar un special status' : 'Eliminar'}>
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
						<button className='pagination-btn' disabled={pagination.page <= 1} onClick={() => handlePageChange(pagination.page - 1)}>
							Anterior
						</button>
						<span className='pagination-info'>
							Página {pagination.page} de {pagination.totalPages}({pagination.totalCount} elementos)
						</span>
						<button className='pagination-btn' disabled={pagination.page >= pagination.totalPages} onClick={() => handlePageChange(pagination.page + 1)}>
							Siguiente
						</button>
					</div>
				</>
			)}

			{isModalOpen && (
				<div className='modal-overlay'>
					<div className='modal'>
						<div className='modal-header'>
							<h2>{editingStatus ? 'Editar Status' : 'Nuevo Status'}</h2>
							<button className='close-btn' onClick={handleCloseModal}>
								×
							</button>
						</div>
						<form onSubmit={handleSubmit} className='modal-body'>
							<div className='form-group'>
								<label htmlFor='name'>Nombre</label>
								<input type='text' id='name' value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
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
									<input type='checkbox' checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />
									Activo
								</label>
							</div>

							<div className='form-group'>
								<label className='checkbox-label'>
									<input
										type='checkbox'
										checked={!!formData.isSpecialStatus}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												isSpecialStatus: e.target.checked,
												// reset statusType when unchecked
												statusType: e.target.checked ? prev.statusType || 'None' : 'None',
											}))
										}
									/>
									Special Status
								</label>
							</div>

							{formData.isSpecialStatus && (
								<div className='form-group'>
									<label htmlFor='statusType'>Tipo</label>
									<select id='statusType' value={formData.statusType || 'None'} onChange={(e) => setFormData({ ...formData, statusType: e.target.value })}>
										<option value='NotFulfilled'>Not Fulfilled</option>
										<option value='Playing'>Playing</option>
									</select>
								</div>
							)}
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

export default AdminStatus
