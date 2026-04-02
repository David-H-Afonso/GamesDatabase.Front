import React, { useEffect, useState } from 'react'
import {
	getGameReplayTypes,
	createGameReplayType,
	updateGameReplayType,
	deleteGameReplayType,
	reorderGameReplayTypes,
	getSpecialGameReplayType,
} from '@/services/GameReplayTypeService'
import type { GameReplayType, GameReplayTypeCreateDto, GameReplayTypeUpdateDto } from '@/models/api/GameReplayType'
import type { QueryParameters, PagedResult } from '@/models/api/Game'
import { ReorderButtons } from '@/components/elements/ReorderButtons/ReorderButtons'
import './AdminReplayTypes.scss'

export const AdminReplayTypes: React.FC = () => {
	const [replayTypes, setReplayTypes] = useState<GameReplayType[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalCount: 0 })
	const [specialTypeId, setSpecialTypeId] = useState<number | null>(null)

	const [isModalOpen, setIsModalOpen] = useState(false)
	const [editingType, setEditingType] = useState<GameReplayType | null>(null)
	const [formData, setFormData] = useState<GameReplayTypeCreateDto>({
		name: '',
		isActive: true,
		color: '#ffffff',
		sortOrder: 0,
		isDefault: false,
		replayType: 'None',
	})

	const [queryParams, setQueryParams] = useState<QueryParameters>({
		page: 1,
		pageSize: 50,
		sortBy: undefined,
		sortDescending: false,
	})

	const [isReordering, setIsReordering] = useState(false)

	const loadData = async (params: QueryParameters) => {
		setLoading(true)
		setError(null)
		try {
			const [result, special] = await Promise.all([getGameReplayTypes(params) as Promise<PagedResult<GameReplayType>>, getSpecialGameReplayType().catch(() => null)])
			setReplayTypes(result.data)
			setPagination({ page: result.page, totalPages: result.totalPages, totalCount: result.totalCount })
			if (special) setSpecialTypeId(special.id)
		} catch (err) {
			setError('Error al cargar los tipos de rejugada')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		void loadData(queryParams)
	}, [queryParams])

	const moveType = async (typeId: number, direction: 'up' | 'down') => {
		if (isReordering) return
		const ordered = [...replayTypes].sort((a, b) => (a.sortOrder ?? a.id) - (b.sortOrder ?? b.id))
		const currentIndex = ordered.findIndex((t) => t.id === typeId)
		if (currentIndex === -1) return
		const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
		if (targetIndex < 0 || targetIndex >= ordered.length) return
		const [moved] = ordered.splice(currentIndex, 1)
		ordered.splice(targetIndex, 0, moved)
		setIsReordering(true)
		try {
			await reorderGameReplayTypes(ordered.map((t) => t.id))
			await loadData(queryParams)
		} catch {
			window.alert('Error al reordenar. Por favor, intenta de nuevo.')
		} finally {
			setIsReordering(false)
		}
	}

	const handleOpenModal = (type?: GameReplayType) => {
		if (type) {
			setEditingType(type)
			setFormData({
				name: type.name,
				isActive: type.isActive,
				color: type.color ?? '#ffffff',
				sortOrder: type.sortOrder ?? 0,
				isDefault: type.isDefault ?? false,
				replayType: type.replayType ?? 'None',
			})
		} else {
			setEditingType(null)
			setFormData({ name: '', isActive: true, color: '#ffffff', sortOrder: 0, isDefault: false, replayType: 'None' })
		}
		setIsModalOpen(true)
	}

	const handleCloseModal = () => {
		setIsModalOpen(false)
		setEditingType(null)
		setFormData({ name: '', isActive: true, color: '#ffffff', sortOrder: 0, isDefault: false, replayType: 'None' })
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		try {
			if (editingType) {
				await updateGameReplayType(editingType.id, { ...formData, id: editingType.id } as GameReplayTypeUpdateDto)
			} else {
				await createGameReplayType(formData)
			}
			handleCloseModal()
			await loadData(queryParams)
		} catch {
			setError('Error al guardar el tipo de rejugada')
		}
	}

	const handleDelete = async (id: number) => {
		if (id === specialTypeId) return
		if (!window.confirm('¿Estás seguro de que quieres eliminar este tipo de rejugada?')) return
		try {
			await deleteGameReplayType(id)
			await loadData(queryParams)
		} catch {
			setError('Error al eliminar el tipo de rejugada')
		}
	}

	const sorted = [...replayTypes].sort((a, b) => (a.sortOrder ?? a.id) - (b.sortOrder ?? b.id))

	return (
		<div className='admin-replay-types'>
			<div className='admin-header'>
				<h1>Tipos de Rejugada</h1>
				<button className='btn btn-primary' onClick={() => handleOpenModal()}>
					Nuevo Tipo
				</button>
			</div>

			{error && <div className='alert alert-error'>{error}</div>}

			<div className='admin-controls'>
				<div className='page-size-control'>
					<label>Elementos por página:</label>
					<select value={queryParams.pageSize ?? 50} onChange={(e) => setQueryParams((p) => ({ ...p, pageSize: Number(e.target.value), page: 1 }))}>
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
					<div className='replay-types-table'>
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
								{sorted.map((type, index, array) => (
									<tr key={type.id}>
										<td>
											<ReorderButtons
												canMoveUp={index > 0}
												canMoveDown={index < array.length - 1}
												onMoveUp={() => moveType(type.id, 'up')}
												onMoveDown={() => moveType(type.id, 'down')}
												isProcessing={isReordering}
												size='small'
											/>
										</td>
										<td>
											{type.name}
											{type.replayType === 'Replay' && <span className='special-badge'>Especial</span>}
										</td>
										<td>
											<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
												{type.color && <div style={{ width: '20px', height: '20px', backgroundColor: type.color, borderRadius: '3px', border: '1px solid var(--border)' }} />}
												<span>{type.color ?? 'Sin color'}</span>
											</div>
										</td>
										<td>
											<span className={`status ${type.isActive ? 'active' : 'inactive'}`}>{type.isActive ? 'Activo' : 'Inactivo'}</span>
										</td>
										<td>
											<div className='actions'>
												<button className='btn btn-sm btn-secondary' onClick={() => handleOpenModal(type)}>
													Editar
												</button>
												<button
													className='btn btn-sm btn-danger'
													onClick={() => handleDelete(type.id)}
													disabled={type.id === specialTypeId}
													title={type.id === specialTypeId ? 'El tipo especial no se puede eliminar' : 'Eliminar'}>
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
						<button className='pagination-btn' disabled={pagination.page <= 1} onClick={() => setQueryParams((p) => ({ ...p, page: p.page! - 1 }))}>
							Anterior
						</button>
						<span className='pagination-info'>
							Página {pagination.page} de {pagination.totalPages} ({pagination.totalCount} elementos)
						</span>
						<button className='pagination-btn' disabled={pagination.page >= pagination.totalPages} onClick={() => setQueryParams((p) => ({ ...p, page: p.page! + 1 }))}>
							Siguiente
						</button>
					</div>
				</>
			)}

			{isModalOpen && (
				<div className='modal-overlay'>
					<div className='modal'>
						<div className='modal-header'>
							<h2>{editingType ? 'Editar Tipo de Rejugada' : 'Nuevo Tipo de Rejugada'}</h2>
							<button className='close-btn' onClick={handleCloseModal}>
								×
							</button>
						</div>
						<form onSubmit={handleSubmit} className='modal-body'>
							<div className='form-group'>
								<label htmlFor='rt-name'>Nombre</label>
								<input id='rt-name' type='text' value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
							</div>
							<div className='form-group'>
								<label htmlFor='rt-color'>Color</label>
								<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
									<input
										id='rt-color'
										type='color'
										value={formData.color ?? '#ffffff'}
										onChange={(e) => setFormData({ ...formData, color: e.target.value })}
										style={{ width: '50px', height: '36px', cursor: 'pointer' }}
									/>
									<input type='text' value={formData.color ?? ''} onChange={(e) => setFormData({ ...formData, color: e.target.value })} placeholder='#ffffff' style={{ flex: 1 }} />
								</div>
							</div>
							<div className='form-group'>
								<label>
									<input type='checkbox' checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} style={{ marginRight: '8px' }} />
									Activo
								</label>
							</div>
							<div className='form-group'>
								<label>
									<input
										type='checkbox'
										checked={formData.isDefault ?? false}
										onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
										style={{ marginRight: '8px' }}
									/>
									Por defecto
								</label>
							</div>
							<div className='modal-footer'>
								<button type='button' className='btn btn-secondary' onClick={handleCloseModal}>
									Cancelar
								</button>
								<button type='submit' className='btn btn-primary'>
									{editingType ? 'Guardar cambios' : 'Crear'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	)
}

export default AdminReplayTypes
