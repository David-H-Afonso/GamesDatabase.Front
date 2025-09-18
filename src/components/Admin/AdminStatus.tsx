import React, { useEffect, useState } from 'react'
import { useGameStatus } from '@/hooks'
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
	} = useGameStatus()

	const [isModalOpen, setIsModalOpen] = useState(false)
	const [editingStatus, setEditingStatus] = useState<GameStatus | null>(null)
	const [formData, setFormData] = useState<GameStatusCreateDto>({
		name: '',
		isActive: true,
		color: '#000000',
	})

	// Pagination and sorting state
	const [queryParams, setQueryParams] = useState<QueryParameters>({
		page: 1,
		pageSize: 10,
		sortBy: 'name',
		sortDescending: false,
	})

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
		setQueryParams((prev) => ({
			...prev,
			sortBy,
			sortDescending: prev.sortBy === sortBy ? !prev.sortDescending : false,
		}))
	}

	const handleOpenModal = (status?: GameStatus) => {
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
				const updateData = { ...formData, id: editingStatus.id } as GameStatusUpdateDto
				await updateStatus(editingStatus.id, updateData)
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
						value={queryParams.sortBy || 'name'}
						onChange={(e) => handleSortChange(e.target.value)}>
						<option value='name'>Nombre</option>
						<option value='id'>ID</option>
						<option value='isActive'>Estado</option>
					</select>
					<button
						className='sort-direction-btn'
						onClick={() => handleSortChange(queryParams.sortBy || 'name')}>
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
									<tr key={status.id}>
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
