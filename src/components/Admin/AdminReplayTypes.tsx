import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
	const { t } = useTranslation()
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
			setError(t('admin.replayTypes.errorLoad'))
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
			window.alert(t('admin.replayTypes.reorderError'))
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
			setError(t('admin.replayTypes.errorSave'))
		}
	}

	const handleDelete = async (id: number) => {
		if (id === specialTypeId) return
		if (!window.confirm(t('admin.replayTypes.confirmDelete'))) return
		try {
			await deleteGameReplayType(id)
			await loadData(queryParams)
		} catch {
			setError(t('admin.replayTypes.errorDelete'))
		}
	}

	const sorted = [...replayTypes].sort((a, b) => (a.sortOrder ?? a.id) - (b.sortOrder ?? b.id))

	return (
		<div className='admin-replay-types'>
			<div className='admin-header'>
				<h1>{t('admin.replayTypes.title')}</h1>
				<button className='btn btn-primary' onClick={() => handleOpenModal()}>
					{t('admin.replayTypes.newType')}
				</button>
			</div>

			{error && <div className='alert alert-error'>{error}</div>}

			<div className='admin-controls'>
				<div className='page-size-control'>
					<label>{t('admin.pagination.perPage')}</label>
					<select value={queryParams.pageSize ?? 50} onChange={(e) => setQueryParams((p) => ({ ...p, pageSize: Number(e.target.value), page: 1 }))}>
						<option value={10}>10</option>
						<option value={25}>25</option>
						<option value={50}>50</option>
					</select>
				</div>
			</div>

			{loading ? (
				<div className='loading'>{t('common.loading')}</div>
			) : (
				<>
					<div className='replay-types-table'>
						<table>
							<thead>
								<tr>
									<th style={{ width: '60px' }}>{t('common.order')}</th>
									<th>{t('common.name')}</th>
									<th>{t('common.color')}</th>
									<th>{t('common.status')}</th>
									<th>{t('common.actions')}</th>
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
											{type.replayType === 'Replay' && <span className='special-badge'>{t('admin.replayTypes.specialBadge')}</span>}
										</td>
										<td>
											<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
												{type.color && <div style={{ width: '20px', height: '20px', backgroundColor: type.color, borderRadius: '3px', border: '1px solid var(--border)' }} />}
												<span>{type.color ?? t('common.noColor')}</span>
											</div>
										</td>
										<td>
											<span className={`status ${type.isActive ? 'active' : 'inactive'}`}>{type.isActive ? t('common.active') : t('common.inactive')}</span>
										</td>
										<td>
											<div className='actions'>
												<button className='btn btn-sm btn-secondary' onClick={() => handleOpenModal(type)}>
													{t('admin.crud.edit')}
												</button>
												<button
													className='btn btn-sm btn-danger'
													onClick={() => handleDelete(type.id)}
													disabled={type.id === specialTypeId}
													title={type.id === specialTypeId ? t('admin.replayTypes.cantDeleteSpecial') : t('admin.crud.delete')}>
													{t('admin.crud.delete')}
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
							{t('common.previous')}
						</button>
						<span className='pagination-info'>
							{t('common.page')} {pagination.page} {t('common.of')} {pagination.totalPages} ({pagination.totalCount} {t('admin.pagination.elements')})
						</span>
						<button className='pagination-btn' disabled={pagination.page >= pagination.totalPages} onClick={() => setQueryParams((p) => ({ ...p, page: p.page! + 1 }))}>
							{t('common.next')}
						</button>
					</div>
				</>
			)}

			{isModalOpen && (
				<div className='modal-overlay'>
					<div className='modal'>
						<div className='modal-header'>
							<h2>{editingType ? t('admin.replayTypes.editType') : t('admin.replayTypes.newType')}</h2>
							<button className='close-btn' onClick={handleCloseModal}>
								{t('admin.crud.close')}
							</button>
						</div>
						<form onSubmit={handleSubmit} className='modal-body'>
							<div className='form-group'>
								<label htmlFor='rt-name'>{t('admin.crud.form.nameLabel')}</label>
								<input id='rt-name' type='text' value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
							</div>
							<div className='form-group'>
								<label htmlFor='rt-color'>{t('admin.crud.form.colorLabel')}</label>
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
									{t('admin.crud.form.activeLabel')}
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
									{t('admin.replayTypes.defaultLabel')}
								</label>
							</div>
							<div className='modal-footer'>
								<button type='button' className='btn btn-secondary' onClick={handleCloseModal}>
									{t('admin.crud.cancel')}
								</button>
								<button type='submit' className='btn btn-primary'>
									{editingType ? t('admin.crud.save') : t('admin.crud.create')}
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
