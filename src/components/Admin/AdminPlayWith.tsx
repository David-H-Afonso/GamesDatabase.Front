import React, { useEffect, useState } from 'react'
import { useGamePlayWith } from '@/hooks'
import { reorderGamePlayWith } from '@/services'
import { fetchPlayWithOptions } from '@/store/features/gamePlayWith/thunk'
import { useAppDispatch } from '@/store/hooks'
import type {
	GamePlayWith,
	GamePlayWithCreateDto,
	GamePlayWithUpdateDto,
} from '@/models/api/GamePlayWith'
import type { QueryParameters } from '@/models/api/Game'
import { ReorderButtons } from '@/components/elements/ReorderButtons/ReorderButtons'
import './AdminPlayWith.scss'

export const AdminPlayWith: React.FC = () => {
	const dispatch = useAppDispatch()
	const {
		playWiths,
		loading,
		error,
		pagination,
		loadPlayWiths,
		createPlayWith,
		updatePlayWith,
		deletePlayWith,
	} = useGamePlayWith()

	const [isModalOpen, setIsModalOpen] = useState(false)
	const [editingOption, setEditingOption] = useState<GamePlayWith | null>(null)
	const [formData, setFormData] = useState<GamePlayWithCreateDto>({
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

	// Reorder state
	const [isReordering, setIsReordering] = useState(false)

	useEffect(() => {
		loadPlayWiths(queryParams)
	}, [loadPlayWiths, queryParams])

	// Pagination handlers
	const handlePageChange = (newPage: number) => {
		setQueryParams((prev) => ({ ...prev, page: newPage }))
	}

	const handlePageSizeChange = (newPageSize: number) => {
		setQueryParams((prev) => ({ ...prev, pageSize: newPageSize, page: 1 }))
	}

	// Reorder play-with options by moving option up or down one position
	const movePlayWith = async (playWithId: number, direction: 'up' | 'down') => {
		if (isReordering) return // Prevent multiple simultaneous reorders

		// Work on a copy ordered by sortOrder if present, otherwise by id
		const ordered = [...playWiths].sort((a, b) => {
			const aKey = a.sortOrder ?? a.id
			const bKey = b.sortOrder ?? b.id
			return aKey - bKey
		})

		const currentIndex = ordered.findIndex((s) => s.id === playWithId)
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
			await reorderGamePlayWith(orderedIds)
			// Reload list directly using dispatch to ensure fresh data
			await dispatch(fetchPlayWithOptions({ ...queryParams })).unwrap()
		} catch (err) {
			console.error('Failed to reorder play-with options:', err)
			window.alert('Error al reordenar. Por favor, intenta de nuevo.')
		} finally {
			setIsReordering(false)
		}
	}

	const handleOpenModal = (option?: GamePlayWith) => {
		if (option) {
			setEditingOption(option)
			setFormData({
				name: option.name,
				isActive: option.isActive,
				color: option.color || '#000000',
			})
		} else {
			setEditingOption(null)
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
		setEditingOption(null)
		setFormData({
			name: '',
			isActive: true,
			color: '#000000',
		})
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		try {
			if (editingOption) {
				const updateData = { ...formData, id: editingOption.id } as GamePlayWithUpdateDto
				await updatePlayWith(editingOption.id, updateData)
			} else {
				await createPlayWith(formData)
			}
			handleCloseModal()
			await loadPlayWiths(queryParams) // Reload data after create/update
		} catch (error) {
			console.error('Error saving play with option:', error)
		}
	}

	const handleDelete = async (id: number) => {
		if (window.confirm('¿Estás seguro de que quieres eliminar esta opción?')) {
			try {
				await deletePlayWith(id)
				await loadPlayWiths(queryParams) // Reload data after delete
			} catch (error) {
				console.error('Error deleting play with option:', error)
			}
		}
	}

	return (
		<div className='admin-play-with'>
			<div className='admin-header'>
				<h1>Gestión de Play With</h1>
				<button className='btn btn-primary' onClick={() => handleOpenModal()}>
					Nueva Opción
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
					<div className='options-table'>
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
								{[...playWiths]
									.sort((a, b) => {
										const aKey = a.sortOrder ?? a.id
										const bKey = b.sortOrder ?? b.id
										return aKey - bKey
									})
									.map((option, index, array) => (
										<tr key={option.id}>
											<td>
												<ReorderButtons
													canMoveUp={index > 0}
													canMoveDown={index < array.length - 1}
													onMoveUp={() => movePlayWith(option.id, 'up')}
													onMoveDown={() => movePlayWith(option.id, 'down')}
													isProcessing={isReordering}
													size='small'
												/>
											</td>
											<td>{option.name}</td>
											<td>
												<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
													{option.color && (
														<div
															style={{
																width: '20px',
																height: '20px',
																backgroundColor: option.color,
																borderRadius: '3px',
																border: '1px solid #ccc',
															}}
														/>
													)}
													<span>{option.color || 'Sin color'}</span>
												</div>
											</td>
											<td>
												<span className={`status ${option.isActive ? 'active' : 'inactive'}`}>
													{option.isActive ? 'Activo' : 'Inactivo'}
												</span>
											</td>
											<td>
												<div className='actions'>
													<button
														className='btn btn-sm btn-secondary'
														onClick={() => handleOpenModal(option)}>
														Editar
													</button>
													<button
														className='btn btn-sm btn-danger'
														onClick={() => handleDelete(option.id)}>
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
							<h2>{editingOption ? 'Editar Opción' : 'Nueva Opción'}</h2>
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
									{editingOption ? 'Actualizar' : 'Crear'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	)
}

export default AdminPlayWith
