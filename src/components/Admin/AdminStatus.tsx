import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameStatus } from '@/hooks/useGameStatus'
import { reorderGameStatuses } from '@/services/GameStatusService'
import type { GameStatus, GameStatusCreateDto, GameStatusUpdateDto } from '@/models/api/GameStatus'
import { Toast } from '@/components/elements'
import { useAdminCrud } from './hooks/useAdminCrud'
import { AdminCrudTable } from './components/AdminCrudTable/AdminCrudTable'
import { AdminCrudModal } from './components/AdminCrudModal/AdminCrudModal'
import './AdminStatus.scss'

const emptyForm: GameStatusCreateDto = {
	name: '',
	isActive: true,
	color: '#000000',
	statusType: 'None',
	isDefault: false,
	isSpecialStatus: false,
}

export const AdminStatus: React.FC = () => {
	const { t } = useTranslation()
	const { statuses, loading, error, pagination, loadStatuses, createStatus, updateStatus, deleteStatus, reassignSpecial } = useGameStatus()

	const crud = useAdminCrud<GameStatus, GameStatusCreateDto, GameStatusUpdateDto>({
		items: statuses,
		loading,
		error,
		pagination,
		load: loadStatuses,
		create: createStatus,
		update: updateStatus,
		remove: deleteStatus,
		reorder: reorderGameStatuses,
	})

	const [isModalOpen, setIsModalOpen] = useState(false)
	const [editingStatus, setEditingStatus] = useState<GameStatus | null>(null)
	const [formData, setFormData] = useState<GameStatusCreateDto>(emptyForm)

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
			setFormData(emptyForm)
		}
		setIsModalOpen(true)
	}

	const handleCloseModal = () => {
		setIsModalOpen(false)
		setEditingStatus(null)
		setFormData(emptyForm)
	}

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault()
		try {
			if (editingStatus) {
				await updateStatus(editingStatus.id, { ...formData, id: editingStatus.id } as GameStatusUpdateDto)
				if (formData.statusType && editingStatus.statusType !== formData.statusType) {
					try {
						await reassignSpecial({ newDefaultStatusId: editingStatus.id, statusType: formData.statusType })
					} catch (err) {
						console.warn('Failed to reassign special statuses:', err)
					}
				}
				await crud.reload()
			} else {
				await crud.createItem(formData)
			}
			handleCloseModal()
		} catch (error) {
			console.error('Error saving status:', error)
		}
	}

	const handleDelete = (status: GameStatus) => {
		crud.removeItem(status.id).catch((error) => console.error('Error deleting status:', error))
	}

	const statusMeta = (status: GameStatus) =>
		status.statusType && status.statusType !== 'None' ? <span className='admin-crud-table__meta'>({status.statusType})</span> : null

	return (
		<div className='admin-status'>
			<div className='admin-header'>
				<h1>{t('admin.status.title')}</h1>
				<button className='btn btn-primary' onClick={() => handleOpenModal()}>
					{t('admin.status.newStatus')}
				</button>
			</div>

			{crud.error && <div className='alert alert-error'>{crud.error}</div>}

			<AdminCrudTable
				items={crud.items}
				loading={crud.loading}
				getColor={(status) => status.color}
				getActive={(status) => status.isActive}
				statusMeta={statusMeta}
				onEdit={handleOpenModal}
				onDelete={handleDelete}
				deleteDisabled={(status) => !!status.isSpecialStatus}
				deleteTitle={() => t('admin.status.cantDeleteSpecial')}
				deleteConfirmTitle={t('admin.crud.confirmDeleteTitle')}
				deleteConfirmMessage={t('admin.status.confirmDelete')}
				isReordering={crud.isReordering}
				onReorder={crud.reorderTo}
				onMoveUp={(status) => crud.move(status.id, 'up')}
				onMoveDown={(status) => crud.move(status.id, 'down')}
				emptyMessage={t('admin.crud.empty')}
				pagination={crud.pagination}
				pageSize={crud.pageSize}
				onPageChange={crud.handlePageChange}
				onPageSizeChange={crud.handlePageSizeChange}
			/>

			{isModalOpen && (
				<AdminCrudModal
					title={editingStatus ? t('admin.status.editStatus') : t('admin.status.newStatus')}
					name={formData.name}
					onNameChange={(name) => setFormData((current) => ({ ...current, name }))}
					color={formData.color || ''}
					onColorChange={(color) => setFormData((current) => ({ ...current, color }))}
					submitLabel={editingStatus ? t('admin.crud.update') : t('admin.crud.create')}
					onClose={handleCloseModal}
					onSubmit={handleSubmit}>
					<div className='form-group'>
						<label className='checkbox-label'>
							<input type='checkbox' checked={formData.isActive} onChange={(event) => setFormData({ ...formData, isActive: event.target.checked })} />
							{t('admin.crud.form.activeLabel')}
						</label>
					</div>
					<div className='form-group'>
						<label className='checkbox-label'>
							<input
								type='checkbox'
								checked={!!formData.isSpecialStatus}
								onChange={(event) =>
									setFormData((prev) => ({
										...prev,
										isSpecialStatus: event.target.checked,
										statusType: event.target.checked ? prev.statusType || 'None' : 'None',
									}))
								}
							/>
							{t('admin.status.specialStatus')}
						</label>
					</div>
					{formData.isSpecialStatus && (
						<div className='form-group'>
							<label htmlFor='statusType'>{t('admin.status.statusType')}</label>
							<select id='statusType' value={formData.statusType || 'None'} onChange={(event) => setFormData({ ...formData, statusType: event.target.value })}>
								<option value='NotFulfilled'>{t('admin.status.notFulfilled')}</option>
								<option value='Playing'>{t('admin.status.playing')}</option>
							</select>
						</div>
					)}
				</AdminCrudModal>
			)}

			<Toast isOpen={crud.reorderError} message={t('admin.status.reorderError')} type='error' onClose={crud.clearReorderError} />
		</div>
	)
}

export default AdminStatus
