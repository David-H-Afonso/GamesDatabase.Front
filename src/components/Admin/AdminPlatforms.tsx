import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGamePlatform } from '@/hooks/useGamePlatform'
import { reorderGamePlatforms } from '@/services/GamePlatformService'
import type { GamePlatform, GamePlatformCreateDto, GamePlatformUpdateDto } from '@/models/api/GamePlatform'
import type { DataTableColumn } from '@/components/elements/DataTable/DataTable'
import { Toast } from '@/components/elements'
import { useAdminCrud } from './hooks/useAdminCrud'
import { AdminCrudTable } from './components/AdminCrudTable/AdminCrudTable'
import { AdminCrudModal } from './components/AdminCrudModal/AdminCrudModal'
import { DEFAULT_PLATFORM_ICON, PLATFORM_LOGO_ACCEPT, PLATFORM_ICON_PRESETS, processPlatformLogoFile } from '@/utils'
import './AdminPlatforms.scss'

const emptyForm: GamePlatformCreateDto = { name: '', isActive: true, color: '#000000', logo: undefined }

export const AdminPlatforms: React.FC = () => {
	const { t } = useTranslation()
	const { platforms, loading, error, pagination, loadPlatforms, createPlatform, updatePlatform, deletePlatform } = useGamePlatform()

	const crud = useAdminCrud<GamePlatform, GamePlatformCreateDto, GamePlatformUpdateDto>({
		items: platforms,
		loading,
		error,
		pagination,
		load: loadPlatforms,
		create: createPlatform,
		update: updatePlatform,
		remove: deletePlatform,
		reorder: reorderGamePlatforms,
	})

	const [isModalOpen, setIsModalOpen] = useState(false)
	const [editingOption, setEditingOption] = useState<GamePlatform | null>(null)
	const [formData, setFormData] = useState<GamePlatformCreateDto>(emptyForm)
	const [logoError, setLogoError] = useState<string | null>(null)

	const handleOpenModal = (option?: GamePlatform) => {
		if (option) {
			setEditingOption(option)
			setFormData({ name: option.name, isActive: option.isActive, color: option.color || '#000000', logo: option.logo })
		} else {
			setEditingOption(null)
			setFormData(emptyForm)
		}
		setLogoError(null)
		setIsModalOpen(true)
	}

	const handleCloseModal = () => {
		setIsModalOpen(false)
		setEditingOption(null)
		setFormData(emptyForm)
		setLogoError(null)
	}

	const handleLogoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		event.target.value = ''
		if (!file) return

		try {
			setLogoError(null)
			const logo = await processPlatformLogoFile(file)
			setFormData((current) => ({ ...current, logo }))
		} catch (error) {
			const key = error instanceof Error ? error.message : 'invalidImage'
			setLogoError(t(`admin.platforms.logoErrors.${key}`, { defaultValue: t('admin.platforms.logoErrors.invalidImage') }))
		}
	}

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault()
		try {
			if (editingOption) {
				await crud.updateItem(editingOption.id, { ...formData, id: editingOption.id } as GamePlatformUpdateDto)
			} else {
				await crud.createItem(formData)
			}
			handleCloseModal()
		} catch (error) {
			console.error('Error saving platform:', error)
		}
	}

	const handleDelete = (option: GamePlatform) => {
		crud.removeItem(option.id).catch((error) => console.error('Error deleting platform:', error))
	}

	const logoColumn: DataTableColumn<GamePlatform> = {
		key: 'logo',
		header: t('admin.platforms.logo'),
		width: '64px',
		render: (option) => (
			<img
				className='platform-logo-preview platform-logo-preview--table'
				src={option.logo || DEFAULT_PLATFORM_ICON}
				alt={t('admin.platforms.logoAlt', { name: option.name })}
				onError={(event) => {
					event.currentTarget.src = DEFAULT_PLATFORM_ICON
				}}
			/>
		),
	}

	return (
		<div className='admin-platform'>
			<div className='admin-header'>
				<h1>{t('admin.platforms.title')}</h1>
				<button className='btn btn-primary' onClick={() => handleOpenModal()}>
					{t('admin.platforms.newPlatform')}
				</button>
			</div>

			{crud.error && <div className='alert alert-error'>{crud.error}</div>}

			<AdminCrudTable
				items={crud.items}
				loading={crud.loading}
				getColor={(option) => option.color}
				getActive={(option) => option.isActive}
				leadingColumns={[logoColumn]}
				onEdit={handleOpenModal}
				onDelete={handleDelete}
				deleteConfirmTitle={t('admin.crud.confirmDeleteTitle')}
				deleteConfirmMessage={t('admin.platforms.confirmDelete')}
				isReordering={crud.isReordering}
				onReorder={crud.reorderTo}
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
					title={editingOption ? t('admin.platforms.editPlatform') : t('admin.platforms.newPlatform')}
					name={formData.name}
					onNameChange={(name) => setFormData((current) => ({ ...current, name }))}
					color={formData.color || ''}
					onColorChange={(color) => setFormData((current) => ({ ...current, color }))}
					submitLabel={editingOption ? t('admin.crud.update') : t('admin.crud.create')}
					onClose={handleCloseModal}
					onSubmit={handleSubmit}>
					<div className='form-group'>
						<label>{t('admin.platforms.logo')}</label>
						<div className='platform-logo-editor'>
							<img
								className='platform-logo-preview'
								src={formData.logo || DEFAULT_PLATFORM_ICON}
								alt={t('admin.platforms.logoPreview')}
								onError={(event) => {
									event.currentTarget.src = DEFAULT_PLATFORM_ICON
								}}
							/>
							<div className='platform-logo-editor__controls'>
								<input type='file' accept={PLATFORM_LOGO_ACCEPT} aria-label={t('admin.platforms.uploadLogo')} onChange={(event) => void handleLogoFileChange(event)} />
								<input
									type='url'
									value={formData.logo?.startsWith('data:') ? '' : formData.logo || ''}
									onChange={(event) => setFormData({ ...formData, logo: event.target.value || undefined })}
									placeholder={t('admin.platforms.logoUrlPlaceholder')}
								/>
								<button type='button' className='btn btn-secondary btn-sm' onClick={() => setFormData({ ...formData, logo: undefined })}>
									{t('common.clear')}
								</button>
							</div>
						</div>
						<div className='platform-logo-presets' aria-label={t('admin.platforms.logoPresets')}>
							{PLATFORM_ICON_PRESETS.map((preset) => (
								<button
									key={preset.id}
									type='button'
									className={`platform-logo-preset ${formData.logo === preset.logo ? 'active' : ''}`}
									onClick={() => setFormData({ ...formData, logo: preset.logo })}
									title={preset.label}
									aria-label={preset.label}>
									<img src={preset.logo} alt='' aria-hidden='true' />
									<span>{preset.label}</span>
								</button>
							))}
						</div>
						{logoError && <p className='platform-logo-error'>{logoError}</p>}
					</div>
					<div className='form-group'>
						<label className='checkbox-label'>
							<input type='checkbox' checked={formData.isActive} onChange={(event) => setFormData({ ...formData, isActive: event.target.checked })} />
							{t('admin.crud.form.activeLabel')}
						</label>
					</div>
				</AdminCrudModal>
			)}

			<Toast isOpen={crud.reorderError} message={t('admin.platforms.reorderError')} type='error' onClose={crud.clearReorderError} />
		</div>
	)
}

export default AdminPlatforms
