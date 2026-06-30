import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGamePlayWith } from '@/hooks/useGamePlayWith'
import { reorderGamePlayWith } from '@/services/GamePlayWithService'
import type { GamePlayWith, GamePlayWithCreateDto, GamePlayWithUpdateDto } from '@/models/api/GamePlayWith'
import { useAdminCrud } from './hooks/useAdminCrud'
import { AdminCrudTable } from './components/AdminCrudTable/AdminCrudTable'
import { AdminCrudModal } from './components/AdminCrudModal/AdminCrudModal'
import './AdminPlayWith.scss'

const emptyForm: GamePlayWithCreateDto = { name: '', isActive: true, color: '#000000' }

export const AdminPlayWith: React.FC = () => {
	const { t } = useTranslation()
	const { playWiths, loading, error, pagination, loadPlayWiths, createPlayWith, updatePlayWith, deletePlayWith } = useGamePlayWith()

	const crud = useAdminCrud<GamePlayWith, GamePlayWithCreateDto, GamePlayWithUpdateDto>(
		{
			items: playWiths,
			loading,
			error,
			pagination,
			load: loadPlayWiths,
			create: createPlayWith,
			update: updatePlayWith,
			remove: deletePlayWith,
			reorder: reorderGamePlayWith,
		},
		{ onReorderError: () => window.alert(t('admin.playWith.reorderError')) }
	)

	const [isModalOpen, setIsModalOpen] = useState(false)
	const [editingOption, setEditingOption] = useState<GamePlayWith | null>(null)
	const [formData, setFormData] = useState<GamePlayWithCreateDto>(emptyForm)

	const handleOpenModal = (option?: GamePlayWith) => {
		if (option) {
			setEditingOption(option)
			setFormData({ name: option.name, isActive: option.isActive, color: option.color || '#000000' })
		} else {
			setEditingOption(null)
			setFormData(emptyForm)
		}
		setIsModalOpen(true)
	}

	const handleCloseModal = () => {
		setIsModalOpen(false)
		setEditingOption(null)
		setFormData(emptyForm)
	}

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault()
		try {
			if (editingOption) {
				await crud.updateItem(editingOption.id, { ...formData, id: editingOption.id } as GamePlayWithUpdateDto)
			} else {
				await crud.createItem(formData)
			}
			handleCloseModal()
		} catch (error) {
			console.error('Error saving play with option:', error)
		}
	}

	const handleDelete = (option: GamePlayWith) => {
		if (!window.confirm(t('admin.playWith.confirmDelete'))) return
		crud.removeItem(option.id).catch((error) => console.error('Error deleting play with option:', error))
	}

	return (
		<div className='admin-play-with'>
			<div className='admin-header'>
				<h1>{t('admin.playWith.title')}</h1>
				<button className='btn btn-primary' onClick={() => handleOpenModal()}>
					{t('admin.playWith.newOption')}
				</button>
			</div>

			{crud.error && <div className='alert alert-error'>{crud.error}</div>}

			<AdminCrudTable
				items={crud.items}
				loading={crud.loading}
				getColor={(option) => option.color}
				getActive={(option) => option.isActive}
				onEdit={handleOpenModal}
				onDelete={handleDelete}
				isReordering={crud.isReordering}
				onMoveUp={(option) => crud.move(option.id, 'up')}
				onMoveDown={(option) => crud.move(option.id, 'down')}
				emptyMessage={t('admin.crud.empty')}
				pagination={crud.pagination}
				pageSize={crud.pageSize}
				onPageChange={crud.handlePageChange}
				onPageSizeChange={crud.handlePageSizeChange}
			/>

			{isModalOpen && (
				<AdminCrudModal
					title={editingOption ? t('admin.playWith.editOption') : t('admin.playWith.newOption')}
					name={formData.name}
					onNameChange={(name) => setFormData((current) => ({ ...current, name }))}
					color={formData.color || ''}
					onColorChange={(color) => setFormData((current) => ({ ...current, color }))}
					submitLabel={editingOption ? t('admin.crud.update') : t('admin.crud.create')}
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
		</div>
	)
}

export default AdminPlayWith
