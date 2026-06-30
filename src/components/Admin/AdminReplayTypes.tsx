import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameReplayType } from '@/hooks/useGameReplayType'
import { reorderGameReplayTypes } from '@/services/GameReplayTypeService'
import type { GameReplayType, GameReplayTypeCreateDto, GameReplayTypeUpdateDto } from '@/models/api/GameReplayType'
import { Toast } from '@/components/elements'
import { useAdminCrud } from './hooks/useAdminCrud'
import { AdminCrudTable } from './components/AdminCrudTable/AdminCrudTable'
import { AdminCrudModal } from './components/AdminCrudModal/AdminCrudModal'
import './AdminReplayTypes.scss'

const emptyForm: GameReplayTypeCreateDto = { name: '', isActive: true, color: '#ffffff', sortOrder: 0, isDefault: false, replayType: 'None' }

export const AdminReplayTypes: React.FC = () => {
	const { t } = useTranslation()
	const { replayTypes, loading, error, pagination, specialReplayType, loadReplayTypes, createReplayType, updateReplayType, deleteReplayType } = useGameReplayType()

	const crud = useAdminCrud<GameReplayType, GameReplayTypeCreateDto, GameReplayTypeUpdateDto>({
		items: replayTypes,
		loading,
		error,
		pagination,
		load: loadReplayTypes,
		create: createReplayType,
		update: updateReplayType,
		remove: deleteReplayType,
		reorder: reorderGameReplayTypes,
	})

	const specialTypeId = specialReplayType?.id ?? null

	const [isModalOpen, setIsModalOpen] = useState(false)
	const [editingType, setEditingType] = useState<GameReplayType | null>(null)
	const [formData, setFormData] = useState<GameReplayTypeCreateDto>(emptyForm)

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
			setFormData(emptyForm)
		}
		setIsModalOpen(true)
	}

	const handleCloseModal = () => {
		setIsModalOpen(false)
		setEditingType(null)
		setFormData(emptyForm)
	}

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault()
		try {
			if (editingType) {
				await crud.updateItem(editingType.id, { ...formData, id: editingType.id } as GameReplayTypeUpdateDto)
			} else {
				await crud.createItem(formData)
			}
			handleCloseModal()
		} catch (err) {
			console.error('Error saving replay type:', err)
		}
	}

	const handleDelete = (type: GameReplayType) => {
		if (type.id === specialTypeId) return
		crud.removeItem(type.id).catch((err) => console.error('Error deleting replay type:', err))
	}

	const renderName = (type: GameReplayType) => (
		<>
			{type.name}
			{type.replayType === 'Replay' && <span className='special-badge'>{t('admin.replayTypes.specialBadge')}</span>}
		</>
	)

	return (
		<div className='admin-replay-types'>
			<div className='admin-header'>
				<h1>{t('admin.replayTypes.title')}</h1>
				<button className='btn btn-primary' onClick={() => handleOpenModal()}>
					{t('admin.replayTypes.newType')}
				</button>
			</div>

			{crud.error && <div className='alert alert-error'>{crud.error}</div>}

			<AdminCrudTable
				items={crud.items}
				loading={crud.loading}
				getColor={(type) => type.color}
				getActive={(type) => type.isActive}
				renderName={renderName}
				onEdit={handleOpenModal}
				onDelete={handleDelete}
				deleteDisabled={(type) => type.id === specialTypeId}
				deleteTitle={() => t('admin.replayTypes.cantDeleteSpecial')}
				deleteConfirmTitle={t('admin.crud.confirmDeleteTitle')}
				deleteConfirmMessage={t('admin.replayTypes.confirmDelete')}
				isReordering={crud.isReordering}
				onReorder={crud.reorderTo}
				onMoveUp={(type) => crud.move(type.id, 'up')}
				onMoveDown={(type) => crud.move(type.id, 'down')}
				emptyMessage={t('admin.crud.empty')}
				pagination={crud.pagination}
				pageSize={crud.pageSize}
				onPageChange={crud.handlePageChange}
				onPageSizeChange={crud.handlePageSizeChange}
			/>

			{isModalOpen && (
				<AdminCrudModal
					title={editingType ? t('admin.replayTypes.editType') : t('admin.replayTypes.newType')}
					name={formData.name}
					onNameChange={(name) => setFormData((current) => ({ ...current, name }))}
					color={formData.color ?? ''}
					onColorChange={(color) => setFormData((current) => ({ ...current, color }))}
					submitLabel={editingType ? t('admin.crud.save') : t('admin.crud.create')}
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
							<input type='checkbox' checked={formData.isDefault ?? false} onChange={(event) => setFormData({ ...formData, isDefault: event.target.checked })} />
							{t('admin.replayTypes.defaultLabel')}
						</label>
					</div>
				</AdminCrudModal>
			)}

			<Toast isOpen={crud.reorderError} message={t('admin.replayTypes.reorderError')} type='error' onClose={crud.clearReorderError} />
		</div>
	)
}

export default AdminReplayTypes
