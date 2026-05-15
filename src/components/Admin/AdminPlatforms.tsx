import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGamePlatform } from '@/hooks/useGamePlatform'
import { reorderGamePlatforms } from '@/services/GamePlatformService'
import { fetchPlatforms } from '@/store/features/gamePlatform/thunk'
import { useAppDispatch } from '@/store/hooks'
import type { GamePlatform, GamePlatformCreateDto, GamePlatformUpdateDto } from '@/models/api/GamePlatform'
import type { QueryParameters } from '@/models/api/Game'
import { ReorderButtons } from '@/components/elements/ReorderButtons/ReorderButtons'
import { DEFAULT_PLATFORM_ICON, PLATFORM_LOGO_ACCEPT, PLATFORM_ICON_PRESETS, processPlatformLogoFile } from '@/utils'
import './AdminPlatforms.scss'

export const AdminPlatforms: React.FC = () => {
	const { t } = useTranslation()
	const dispatch = useAppDispatch()
	const { platforms, loading, error, pagination, loadPlatforms, createPlatform, updatePlatform, deletePlatform } = useGamePlatform()

	const [isModalOpen, setIsModalOpen] = useState(false)
	const [editingOption, setEditingOption] = useState<GamePlatform | null>(null)
	const [formData, setFormData] = useState<GamePlatformCreateDto>({
		name: '',
		isActive: true,
		color: '#000000',
		logo: undefined,
	})
	const [logoError, setLogoError] = useState<string | null>(null)

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
		loadPlatforms(queryParams)
	}, [loadPlatforms, queryParams])

	// Pagination handlers
	const handlePageChange = (newPage: number) => {
		setQueryParams((prev) => ({ ...prev, page: newPage }))
	}

	const handlePageSizeChange = (newPageSize: number) => {
		setQueryParams((prev) => ({ ...prev, pageSize: newPageSize, page: 1 }))
	}

	// Reorder platform options by moving option up or down one position
	const movePlatform = async (PlatformId: number, direction: 'up' | 'down') => {
		if (isReordering) return // Prevent multiple simultaneous reorders

		// Work on a copy ordered by sortOrder if present, otherwise by id
		const ordered = [...platforms].sort((a, b) => {
			const aKey = a.sortOrder ?? a.id
			const bKey = b.sortOrder ?? b.id
			return aKey - bKey
		})

		const currentIndex = ordered.findIndex((s) => s.id === PlatformId)
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
			await reorderGamePlatforms(orderedIds)
			// Reload list directly using dispatch to ensure fresh data
			await dispatch(fetchPlatforms({ ...queryParams })).unwrap()
		} catch (err) {
			console.error('Failed to reorder platform options:', err)
			window.alert(t('admin.platforms.reorderError'))
		} finally {
			setIsReordering(false)
		}
	}

	const handleOpenModal = (option?: GamePlatform) => {
		if (option) {
			setEditingOption(option)
			setFormData({
				name: option.name,
				isActive: option.isActive,
				color: option.color || '#000000',
				logo: option.logo,
			})
		} else {
			setEditingOption(null)
			setFormData({
				name: '',
				isActive: true,
				color: '#000000',
				logo: undefined,
			})
		}
		setLogoError(null)
		setIsModalOpen(true)
	}

	const handleCloseModal = () => {
		setIsModalOpen(false)
		setEditingOption(null)
		setFormData({
			name: '',
			isActive: true,
			color: '#000000',
			logo: undefined,
		})
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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		try {
			if (editingOption) {
				const updateData = { ...formData, id: editingOption.id } as GamePlatformUpdateDto
				await updatePlatform(editingOption.id, updateData)
			} else {
				await createPlatform(formData)
			}
			handleCloseModal()
			await loadPlatforms(queryParams) // Reload data after create/update
		} catch (error) {
			console.error('Error saving play with option:', error)
		}
	}

	const handleDelete = async (id: number) => {
		if (window.confirm(t('admin.platforms.confirmDelete'))) {
			try {
				await deletePlatform(id)
				await loadPlatforms(queryParams) // Reload data after delete
			} catch (error) {
				console.error('Error deleting play with option:', error)
			}
		}
	}

	return (
		<div className='admin-platform'>
			<div className='admin-header'>
				<h1>{t('admin.platforms.title')}</h1>
				<button className='btn btn-primary' onClick={() => handleOpenModal()}>
					{t('admin.platforms.newPlatform')}
				</button>
			</div>

			{error && <div className='alert alert-error'>{error}</div>}

			<div className='admin-controls'>
				<div className='page-size-control'>
					<label>{t('admin.pagination.perPage')}</label>
					<select value={queryParams.pageSize || 10} onChange={(e) => handlePageSizeChange(Number(e.target.value))}>
						<option value={5}>5</option>
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
					<div className='options-table'>
						<table>
							<thead>
								<tr>
									<th style={{ width: '60px' }}>{t('common.order')}</th>
									<th>{t('admin.platforms.logo')}</th>
									<th>{t('common.name')}</th>
									<th>{t('common.color')}</th>
									<th>{t('common.status')}</th>
									<th>{t('common.actions')}</th>
								</tr>
							</thead>
							<tbody>
								{[...platforms]
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
													onMoveUp={() => movePlatform(option.id, 'up')}
													onMoveDown={() => movePlatform(option.id, 'down')}
													isProcessing={isReordering}
													size='small'
												/>
											</td>
											<td>
												<img
													className='platform-logo-preview platform-logo-preview--table'
													src={option.logo || DEFAULT_PLATFORM_ICON}
													alt={t('admin.platforms.logoAlt', { name: option.name })}
													onError={(event) => {
														event.currentTarget.src = DEFAULT_PLATFORM_ICON
													}}
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
													<span>{option.color || t('common.noColor')}</span>
												</div>
											</td>
											<td>
												<span className={`status ${option.isActive ? 'active' : 'inactive'}`}>{option.isActive ? t('common.active') : t('common.inactive')}</span>
											</td>
											<td>
												<div className='actions'>
													<button className='btn btn-sm btn-secondary' onClick={() => handleOpenModal(option)}>
														{t('admin.crud.edit')}
													</button>
													<button className='btn btn-sm btn-danger' onClick={() => handleDelete(option.id)}>
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
						<button className='pagination-btn' disabled={pagination.page <= 1} onClick={() => handlePageChange(pagination.page - 1)}>
							{t('common.previous')}
						</button>
						<span className='pagination-info'>
							{t('common.page')} {pagination.page} {t('common.of')} {pagination.totalPages}({pagination.totalCount} {t('admin.pagination.elements')})
						</span>
						<button className='pagination-btn' disabled={pagination.page >= pagination.totalPages} onClick={() => handlePageChange(pagination.page + 1)}>
							{t('common.next')}
						</button>
					</div>
				</>
			)}

			{isModalOpen && (
				<div className='modal-overlay'>
					<div className='modal'>
						<div className='modal-header'>
							<h2>{editingOption ? t('admin.platforms.editPlatform') : t('admin.platforms.newPlatform')}</h2>
							<button className='close-btn' onClick={handleCloseModal}>
								{t('admin.crud.close')}
							</button>
						</div>
						<form onSubmit={handleSubmit} className='modal-body'>
							<div className='form-group'>
								<label htmlFor='name'>{t('admin.crud.form.nameLabel')}</label>
								<input type='text' id='name' value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
							</div>
							<div className='form-group'>
								<label htmlFor='color'>{t('admin.crud.form.colorLabel')}</label>
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
										<input
											type='file'
											accept={PLATFORM_LOGO_ACCEPT}
											aria-label={t('admin.platforms.uploadLogo')}
											onChange={(event) => void handleLogoFileChange(event)}
										/>
										<input
											type='url'
											value={formData.logo?.startsWith('data:') ? '' : formData.logo || ''}
											onChange={(e) => setFormData({ ...formData, logo: e.target.value || undefined })}
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
									<input type='checkbox' checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />
									{t('admin.crud.form.activeLabel')}
								</label>
							</div>
							<div className='modal-footer'>
								<button type='button' className='btn btn-secondary' onClick={handleCloseModal}>
									{t('admin.crud.cancel')}
								</button>
								<button type='submit' className='btn btn-primary'>
									{editingOption ? t('admin.crud.update') : t('admin.crud.create')}
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
