import React, { useEffect, useState } from 'react'
import { useGameStatus } from '@/hooks'
import { updateGameStatus } from '@/services'
import type { GameStatus, GameStatusCreateDto, GameStatusUpdateDto } from '@/models/api/GameStatus'
import type { QueryParameters } from '@/models/api/Game'
import './AdminStatus.scss'

export const AdminStatus: React.FC = () => {
	const {
		statuses,
		loading,
		error,
		pagination,
		loadStatuses,
		createStatus,
		updateStatus,
		deleteStatus,
		reassignSpecial,
	} = useGameStatus()

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
		pageSize: 10,
		// default: no sorting applied
		sortBy: undefined,
		sortDescending: false,
	})

	// Drag and drop state
	const [draggedId, setDraggedId] = useState<number | null>(null)
	const [isReordering, setIsReordering] = useState(false)

	// Reorder statuses by moving status with id `sourceId` to the position of `targetId`.
	// This will compute new sortOrder values for affected statuses and persist them.
	const reorderStatuses = async (sourceId: number, targetId: number) => {
		// Work on a copy ordered by sortOrder if present, otherwise by id
		const ordered = [...statuses].sort((a, b) => {
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

		// Reassign sortOrder sequentially starting from 1
		const updates = ordered.map((s, idx) => ({ ...s, sortOrder: idx + 1 }))

		// Determine which ones changed

		setIsReordering(true)
		const failures: Array<{ id: number; error: any }> = []
		try {
			for (const u of updates) {
				const original = statuses.find((s) => s.id === u.id)
				if (!original) continue
				const newSort = u.sortOrder
				if ((original.sortOrder ?? original.id) === newSort) continue
				const dto = {
					name: original.name,
					isActive: original.isActive,
					color: original.color,
					statusType: original.statusType,
					isDefault: original.isDefault,
					isSpecialStatus: original.isSpecialStatus,
					sortOrder: newSort,
				} as any
				try {
					// sequential to avoid overloading server
					await updateGameStatus(u.id, dto)
				} catch (err) {
					console.error(`Failed updating status ${u.id} sortOrder -> ${newSort}:`, err)
					failures.push({ id: u.id, error: err })
				}
			}
			// reload list to reflect server state
			await loadStatuses(queryParams)
		} finally {
			setIsReordering(false)
		}
		if (failures.length > 0) {
			console.warn('Some status updates failed:', failures)
			window.alert('Algunas actualizaciones fallaron. Revisa la consola para más detalles.')
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

	// Sorting handlers
	const handleSortChange = (sortBy: string) => {
		setQueryParams((prev) => {
			if (!sortBy) {
				// clear sorting
				return { ...prev, sortBy: undefined, sortDescending: false }
			}
			return {
				...prev,
				sortBy,
				sortDescending: prev.sortBy === sortBy ? !prev.sortDescending : false,
			}
		})
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
				<div className='sort-controls'>
					<label>Ordenar por:</label>
					<select
						value={queryParams.sortBy ?? ''}
						onChange={(e) => handleSortChange(e.target.value)}>
						<option value=''>Sin ordenar</option>
						<option value='name'>Nombre</option>
						<option value='id'>ID</option>
						<option value='isActive'>Estado</option>
					</select>
					<button
						className='sort-direction-btn'
						onClick={() => handleSortChange(queryParams.sortBy || '')}
						disabled={!queryParams.sortBy}>
						{queryParams.sortDescending ? '↓' : '↑'}
					</button>
				</div>
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
					<div className='status-table'>
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
								{statuses.map((status) => (
									<tr
										key={status.id}
										draggable={!isReordering}
										onDragStart={(e) => {
											if (isReordering) return
											setDraggedId(status.id)
											e.dataTransfer!.effectAllowed = 'move'
										}}
										onDragOver={(e) => {
											if (isReordering) return
											e.preventDefault()
										}}
										onDragLeave={() => {}}
										onDrop={async (e) => {
											e.preventDefault()
											if (isReordering) return
											if (draggedId == null) return
											if (draggedId === status.id) return

											// compute new ordering and persist
											await reorderStatuses(draggedId, status.id)
											setDraggedId(null)
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
											<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
												<span className={`status ${status.isActive ? 'active' : 'inactive'}`}>
													{status.isActive ? 'Activo' : 'Inactivo'}
												</span>
												<span className='meta'>
													{status.statusType ? `(${status.statusType})` : ''}
													{/* Default flag hidden in admin list per requirements */}
													{status.isSpecialStatus ? ' • Special' : ''}
												</span>
											</div>
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
													onClick={() => handleDelete(status.id)}
													disabled={!!status.isSpecialStatus}
													title={
														status.isSpecialStatus
															? 'No se puede eliminar un special status'
															: 'Eliminar'
													}>
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
							<h2>{editingStatus ? 'Editar Status' : 'Nuevo Status'}</h2>
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
									<select
										id='statusType'
										value={formData.statusType || 'None'}
										onChange={(e) => setFormData({ ...formData, statusType: e.target.value })}>
										<option value='NotFulfilled'>Not Fulfilled</option>
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
