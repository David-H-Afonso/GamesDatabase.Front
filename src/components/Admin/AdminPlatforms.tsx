import React, { useEffect, useState } from 'react'
import { useGamePlatform } from '@/hooks'
import { reorderGamePlatforms } from '@/services'
import type {
	GamePlatform,
	GamePlatformCreateDto,
	GamePlatformUpdateDto,
} from '@/models/api/GamePlatform'
import type { QueryParameters } from '@/models/api/Game'
import './AdminPlatforms.scss'

export const AdminPlatforms: React.FC = () => {
	const {
		platforms,
		pagination,
		loading,
		error,
		loadPlatforms,
		createPlatform,
		updatePlatform,
		deletePlatform,
	} = useGamePlatform()

	const [isModalOpen, setIsModalOpen] = useState(false)
	const [editingPlatform, setEditingPlatform] = useState<GamePlatform | null>(null)
	const [formData, setFormData] = useState<GamePlatformCreateDto>({
		name: '',
		isActive: true,
		color: '#000000',
	})

	// Pagination and sorting state
	const [queryParams, setQueryParams] = useState<QueryParameters>({
		page: 1,
		pageSize: 50,
		sortBy: undefined,
		sortDescending: false,
	})

	// Drag and drop state
	const [draggedId, setDraggedId] = useState<number | null>(null)
	const [dragOverId, setDragOverId] = useState<number | null>(null)
	const [isReordering, setIsReordering] = useState(false)

	// Reorder platforms by moving platform with id `sourceId` to the position of `targetId`.
	const reorderPlatforms = async (sourceId: number, targetId: number) => {
		const ordered = [...platforms].sort((a, b) => {
			const aKey = a.sortOrder ?? a.id
			const bKey = b.sortOrder ?? b.id
			return aKey - bKey
		})

		const sourceIndex = ordered.findIndex((p) => p.id === sourceId)
		const targetIndex = ordered.findIndex((p) => p.id === targetId)
		if (sourceIndex === -1 || targetIndex === -1) return

		const [moved] = ordered.splice(sourceIndex, 1)
		ordered.splice(targetIndex, 0, moved)

		const orderedIds = ordered.map((p) => p.id)

		setIsReordering(true)
		try {
			await reorderGamePlatforms(orderedIds)
			await loadPlatforms(queryParams)
		} catch (err) {
			console.error('Failed to reorder platforms:', err)
			window.alert('Error al reordenar. Por favor, intenta de nuevo.')
		} finally {
			setIsReordering(false)
		}
	}

	useEffect(() => {
		loadPlatforms(queryParams)
	}, [loadPlatforms, queryParams])

	// Pagination handlers
	const handlePageChange = (newPage: number) => {
		setQueryParams((prev) => ({ ...prev, page: newPage }))
	}

	const handlePageSizeChange = (newPageSize: number) => {
		setQueryParams((prev) => ({ ...prev, pageSize: newPageSize, page: 1 }))
	}

	const handleOpenModal = (platform?: GamePlatform) => {
		if (platform) {
			setEditingPlatform(platform)
			setFormData({
				name: platform.name,
				isActive: platform.isActive,
				color: platform.color || '#000000',
			})
		} else {
			setEditingPlatform(null)
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
		setEditingPlatform(null)
		setFormData({
			name: '',
			isActive: true,
			color: '#000000',
		})
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		try {
			if (editingPlatform) {
				const updateData = { ...formData, id: editingPlatform.id } as GamePlatformUpdateDto
				await updatePlatform(editingPlatform.id, updateData)
			} else {
				await createPlatform(formData)
			}
			handleCloseModal()
			// Reload current page
			loadPlatforms(queryParams)
		} catch (error) {
			console.error('Error saving platform:', error)
		}
	}

	const handleDelete = async (id: number) => {
		if (window.confirm('¿Estás seguro de que quieres eliminar esta plataforma?')) {
			try {
				await deletePlatform(id)
				// Reload current page
				loadPlatforms(queryParams)
			} catch (error) {
				console.error('Error deleting platform:', error)
			}
		}
	}

	return (
		<div className='admin-platforms'>
			<div className='admin-header'>
				<h1>Gestión de Plataformas</h1>
				<button className='btn btn-primary' onClick={() => handleOpenModal()}>
					Nueva Plataforma
				</button>
			</div>

			{error && <div className='alert alert-error'>{error}</div>}

			{/* Filters and Pagination Controls */}
			<div className='admin-controls'>
				<div className='page-size-control'>
					<label>Elementos por página:</label>
					<select
						value={queryParams.pageSize || 50}
						onChange={(e) => handlePageSizeChange(Number(e.target.value))}>
						<option value='5'>5</option>
						<option value='10'>10</option>
						<option value='25'>25</option>
						<option value='50'>50</option>
					</select>
				</div>
			</div>

			{loading ? (
				<div className='loading'>Cargando...</div>
			) : (
				<div className='platforms-table'>
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
							{platforms.map((platform) => (
								<tr
									key={platform.id}
									draggable={true}
									onDragStart={(e) => {
										setDraggedId(platform.id)
										e.dataTransfer.effectAllowed = 'move'
									}}
									onDragOver={(e) => {
										if (isReordering) return
										e.preventDefault()
										if (platform.id !== draggedId) {
											setDragOverId(platform.id)
										}
									}}
									onDragLeave={() => {
										setDragOverId(null)
									}}
									onDrop={async (e) => {
										e.preventDefault()
										setDragOverId(null)
										if (isReordering || draggedId == null || draggedId === platform.id) return
										await reorderPlatforms(draggedId, platform.id)
										setDraggedId(null)
									}}
									style={{
										cursor: 'grab',
										opacity: draggedId === platform.id ? 0.5 : 1,
										borderTop: dragOverId === platform.id ? '2px solid #2563eb' : undefined,
									}}>
									<td>{platform.name}</td>
									<td>
										<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
											{platform.color && (
												<div
													style={{
														width: '20px',
														height: '20px',
														backgroundColor: platform.color,
														borderRadius: '3px',
														border: '1px solid #ccc',
													}}
												/>
											)}
											<span>{platform.color || 'Sin color'}</span>
										</div>
									</td>
									<td>
										<span className={`status ${platform.isActive ? 'active' : 'inactive'}`}>
											{platform.isActive ? 'Activo' : 'Inactivo'}
										</span>
									</td>
									<td>
										<div className='actions'>
											<button
												className='btn btn-sm btn-secondary'
												onClick={() => handleOpenModal(platform)}>
												Editar
											</button>
											<button
												className='btn btn-sm btn-danger'
												onClick={() => handleDelete(platform.id)}>
												Eliminar
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Pagination */}
			{pagination.totalPages > 1 && (
				<div className='pagination-controls'>
					<button
						disabled={!pagination.hasPreviousPage}
						onClick={() => handlePageChange(pagination.page - 1)}
						className='pagination-btn'>
						Anterior
					</button>
					<span className='pagination-info'>
						Página {pagination.page} de {pagination.totalPages}({pagination.totalCount} elementos
						total)
					</span>
					<button
						disabled={!pagination.hasNextPage}
						onClick={() => handlePageChange(pagination.page + 1)}
						className='pagination-btn'>
						Siguiente
					</button>
				</div>
			)}

			{isModalOpen && (
				<div className='modal-overlay'>
					<div className='modal'>
						<div className='modal-header'>
							<h2>{editingPlatform ? 'Editar Plataforma' : 'Nueva Plataforma'}</h2>
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
									{editingPlatform ? 'Actualizar' : 'Crear'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	)
}

export default AdminPlatforms
