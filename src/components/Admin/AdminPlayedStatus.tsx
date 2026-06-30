import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGamePlayedStatus } from '@/hooks/useGamePlayedStatus'
import { reorderGamePlayedStatuses } from '@/services/GamePlayedStatusService'
import type { GamePlayedStatus, GamePlayedStatusCreateDto, GamePlayedStatusUpdateDto } from '@/models/api/GamePlayedStatus'
import { Toast } from '@/components/elements'
import { useAdminCrud } from './hooks/useAdminCrud'
import { AdminCrudTable } from './components/AdminCrudTable/AdminCrudTable'
import { AdminCrudModal } from './components/AdminCrudModal/AdminCrudModal'
import './AdminPlayedStatus.scss'

const emptyForm: GamePlayedStatusCreateDto = { name: '', isActive: true, color: '#000000' }

export const AdminPlayedStatus: React.FC = () => {
	const { t } = useTranslation()
	const { playedStatuses, loading, error, pagination, loadPlayedStatuses, createPlayedStatus, updatePlayedStatus, deletePlayedStatus } = useGamePlayedStatus()

	const crud = useAdminCrud<GamePlayedStatus, GamePlayedStatusCreateDto, GamePlayedStatusUpdateDto>({
		items: playedStatuses,
		loading,
		error,
		pagination,
		load: loadPlayedStatuses,
		create: createPlayedStatus,
		update: updatePlayedStatus,
		remove: deletePlayedStatus,
		reorder: reorderGamePlayedStatuses,
	})

	const [isModalOpen, setIsModalOpen] = useState(false)
	const [editingStatus, setEditingStatus] = useState<GamePlayedStatus | null>(null)
	const [formData, setFormData] = useState<GamePlayedStatusCreateDto>(emptyForm)

	const handleOpenModal = (status?: GamePlayedStatus) => {
		if (status) {
			setEditingStatus(status)
			setFormData({ name: status.name, isActive: status.isActive, color: status.color || '#000000' })
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
				await crud.updateItem(editingStatus.id, { ...formData, id: editingStatus.id } as GamePlayedStatusUpdateDto)
			} else {
				await crud.createItem(formData)
			}
			handleCloseModal()
		} catch (error) {
			console.error('Error saving played status:', error)
		}
	}

	const handleDelete = (status: GamePlayedStatus) => {
		crud.removeItem(status.id).catch((error) => console.error('Error deleting played status:', error))
	}

	return (
		<div className='admin-played-status'>
			<div className='admin-header'>
				<h1>{t('admin.playedStatus.title')}</h1>
				<button className='btn btn-primary' onClick={() => handleOpenModal()}>
					{t('admin.playedStatus.newOption')}
				</button>
			</div>

			{crud.error && <div className='alert alert-error'>{crud.error}</div>}

			<AdminCrudTable
				items={crud.items}
				loading={crud.loading}
				getColor={(status) => status.color}
				getActive={(status) => status.isActive}
				onEdit={handleOpenModal}
				onDelete={handleDelete}
				deleteConfirmTitle={t('admin.crud.confirmDeleteTitle')}
				deleteConfirmMessage={t('admin.playedStatus.confirmDelete')}
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
					title={editingStatus ? t('admin.playedStatus.editOption') : t('admin.playedStatus.newOption')}
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
				</AdminCrudModal>
			)}

			<Toast isOpen={crud.reorderError} message={t('admin.playedStatus.reorderError')} type='error' onClose={crud.clearReorderError} />
		</div>
	)
}

export default AdminPlayedStatus
