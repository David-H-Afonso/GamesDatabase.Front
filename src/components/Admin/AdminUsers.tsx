import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/elements'
import { userService } from '@/services/UserService'
import { useAppSelector } from '@/store/hooks'
import { selectCurrentUser } from '@/store/features/auth/selector'
import type { User, UserCreateDto, UserRole } from '@/models/api/User'
import './AdminUsers.scss'
import { useAccountLanguage } from '@/providers/accountLanguageContext'
import type { UserLanguage } from '@/models/api/User'

export const AdminUsers = () => {
	const { t, i18n } = useTranslation()
	const accountLanguage = useAccountLanguage()
	const currentUser = useAppSelector(selectCurrentUser)

	const [users, setUsers] = useState<User[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [actionLoading, setActionLoading] = useState(false)
	const [searchTerm, setSearchTerm] = useState('')
	const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [editingUser, setEditingUser] = useState<User | null>(null)
	const [languageTouched, setLanguageTouched] = useState(false)
	const [formData, setFormData] = useState<UserCreateDto>({
		username: '',
		password: '',
		role: 'Standard',
		tutorialEnabled: true,
	})
	const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
	const [passwordChangeUserId, setPasswordChangeUserId] = useState<number | null>(null)
	const [newPassword, setNewPassword] = useState('')
	const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null)
	const supportsLanguage = users.some(user => Object.hasOwn(user, 'preferredLanguage'))

	const loadUsers = async () => {
		try {
			setLoading(true)
			const data = await userService.getAllUsers()
			setUsers(data)
			setError(null)
		} catch (err) {
			setError(err instanceof Error ? err.message : t('admin.users.errorLoad'))
		} finally {
			setLoading(false)
		}
	}

	const showToast = (message: string, type: 'success' | 'error' = 'success') => {
		setToast({ message, type })
		setTimeout(() => setToast(null), 4000)
	}

	const filteredUsers = useMemo(() => {
		if (!Array.isArray(users)) return []
		if (!searchTerm.trim()) return users

		const search = searchTerm.toLowerCase()
		return users.filter((user) => user.username.toLowerCase().includes(search) || user.role.toLowerCase().includes(search))
	}, [users, searchTerm])

	useEffect(() => {
		loadUsers()
	}, [])

	const handleOpenModal = (user?: User) => {
		setLanguageTouched(false)
		if (user) {
			setEditingUser(user)
			setFormData({
				username: user.username,
				role: user.role,
					tutorialEnabled: user.tutorialEnabled ?? false,
					preferredLanguage: user.preferredLanguage ?? null,
			})
		} else {
			setEditingUser(null)
			setFormData({
				username: '',
				password: '',
				role: 'Standard',
					tutorialEnabled: true,
					preferredLanguage: i18n.resolvedLanguage?.startsWith('es') ? 'es' : 'en',
			})
		}
		setIsModalOpen(true)
	}

	const handleCloseModal = () => {
		setIsModalOpen(false)
		setEditingUser(null)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		try {
			setActionLoading(true)
			if (editingUser) {
				// Update existing user
				await userService.updateUser(editingUser.id, {
					username: formData.username,
					role: formData.role,
					tutorialEnabled: formData.tutorialEnabled,
					...(languageTouched ? { preferredLanguage: formData.preferredLanguage } : {}),
				})
				if (editingUser.id === currentUser?.id && languageTouched) await accountLanguage?.refresh()
				showToast(`${t('admin.users.toastUpdated', { username: formData.username })}`, 'success')
			} else {
				// Create new user
				const { preferredLanguage, ...fields } = formData
				await userService.createUser({ ...fields, ...(supportsLanguage ? { preferredLanguage } : {}) })
				showToast(`${t('admin.users.toastCreated', { username: formData.username })}`, 'success')
			}

			await loadUsers()
			handleCloseModal()
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : t('admin.users.errorOperation')
			setError(errorMsg)
			showToast(errorMsg, 'error')
		} finally {
			setActionLoading(false)
		}
	}

	const handleDeleteClick = (user: User) => {
		if (user.isDefault) {
			showToast(t('admin.users.errorCantDeleteDefault'), 'error')
			return
		}
		setDeleteConfirm(user)
	}

	const handleDeleteConfirm = async () => {
		if (!deleteConfirm) return

		try {
			setActionLoading(true)
			await userService.deleteUser(deleteConfirm.id)
			showToast(`${t('admin.users.toastDeleted', { username: deleteConfirm.username })}`, 'success')
			await loadUsers()
			setDeleteConfirm(null)
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : t('admin.users.errorDelete')
			setError(errorMsg)
			showToast(errorMsg, 'error')
		} finally {
			setActionLoading(false)
		}
	}

	const handleOpenPasswordModal = (userId: number) => {
		setPasswordChangeUserId(userId)
		setNewPassword('')
		setIsPasswordModalOpen(true)
	}

	const handleChangePassword = async (e: React.FormEvent) => {
		e.preventDefault()

		if (passwordChangeUserId === null) return

		try {
			setActionLoading(true)
			await userService.changePassword(passwordChangeUserId, {
				newPassword: newPassword.trim(),
			})
			setIsPasswordModalOpen(false)
			setPasswordChangeUserId(null)
			setNewPassword('')
			showToast(t('admin.users.toastPasswordChanged'), 'success')
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : t('admin.users.errorPassword')
			setError(errorMsg)
			showToast(errorMsg, 'error')
		} finally {
			setActionLoading(false)
		}
	}

	return (
		<div className='admin-users'>
			{/* Toast Notification */}
			{toast && (
				<div className={`toast toast-${toast.type}`}>
					<svg className='toast-icon' viewBox='0 0 24 24' width='18' height='18' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
						{toast.type === 'success' ? <path d='M20 6 9 17l-5-5' /> : <path d='M12 8v4M12 16h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' />}
					</svg>
					{toast.message}
				</div>
			)}

			<div className='admin-header'>
				<div>
					<h1>{t('admin.users.title')}</h1>
					<p className='subtitle'>{t('admin.users.totalUsers', { count: users.length })}</p>
				</div>
				<button className='btn btn-primary' onClick={() => handleOpenModal()} disabled={actionLoading}>
					{t('admin.users.createUser')}
				</button>
			</div>

			{/* Search Bar */}
			<div className='search-bar'>
				<input type='text' placeholder={t('admin.users.searchPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className='search-input' />
				{searchTerm && (
					<button className='btn-clear-search' onClick={() => setSearchTerm('')}>
						{t('common.clear')}
					</button>
				)}
			</div>

			{error && <div className='alert alert-error'>{error}</div>}

			{loading ? (
				<div className='loading'>
					<div className='spinner'></div>
					<p>{t('common.loading')}</p>
				</div>
			) : filteredUsers.length === 0 ? (
				<div className='empty-state'>
					<p>{searchTerm ? t('admin.users.noResults', { search: searchTerm }) : t('admin.users.empty')}</p>
				</div>
			) : (
				<div className='users-table'>
					<table>
						<thead>
							<tr>
								<th>{t('admin.users.usernameLabel')}</th>
								<th>{t('admin.users.roleLabel')}</th>
								<th>{t('admin.users.tableDefault')}</th>
								<th>{t('admin.users.tableCreated')}</th>
								<th>{t('admin.users.tableActions')}</th>
							</tr>
						</thead>
						<tbody>
							{filteredUsers.map((user) => (
								<tr key={user.id}>
									<td>
										{user.username}
										{user.id === currentUser?.id && <span className='badge badge-info'>{t('admin.users.badgeYou')}</span>}
									</td>
									<td>
										<span className={`badge badge-${user.role === 'Admin' ? 'admin' : 'standard'}`}>{user.role}</span>
									</td>
									<td>{user.isDefault ? t('common.yes') : ''}</td>
									<td>{new Date(user.createdAt).toLocaleDateString()}</td>
									<td>
										<div className='actions'>
											<button className='btn btn-small btn-secondary' onClick={() => handleOpenModal(user)} disabled={actionLoading}>
												{t('admin.crud.edit')}
											</button>
											<button className='btn btn-small btn-secondary' onClick={() => handleOpenPasswordModal(user.id)} disabled={actionLoading}>
												{t('admin.users.changePassword')}
											</button>
											<button className='btn btn-small btn-danger' onClick={() => handleDeleteClick(user)} disabled={user.isDefault || actionLoading}>
												{t('admin.crud.delete')}
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Create/Edit User Modal */}
			<Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingUser ? t('admin.users.editTitle') : t('admin.users.createTitle')} maxWidth='500px'>
				<form onSubmit={handleSubmit} className='admin-users-modal'>
					<div className='form-group'>
						<label htmlFor='gdb-user-name'>{t('admin.users.usernameLabel')}</label>
						<input id='gdb-user-name' type='text' value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
					</div>

					{!editingUser && (
						<div className='form-group'>
							<label htmlFor='gdb-user-password'>{t('admin.users.passwordLabel')}</label>
							<input
								id='gdb-user-password'
								type='password'
								value={formData.password || ''}
								onChange={(e) => setFormData({ ...formData, password: e.target.value })}
								placeholder={t('admin.users.passwordPlaceholder')}
							/>
						</div>
					)}

					<div className='form-group'>
						<label htmlFor='gdb-user-role'>{t('admin.users.roleLabel')}</label>
						<select id='gdb-user-role' value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}>
							<option value='Standard'>{t('admin.users.roleStandard')}</option>
							<option value='Admin'>{t('admin.users.roleAdmin')}</option>
						</select>
					</div>
					<div className='form-group'>
						<label htmlFor='gdb-user-language'>{t('accountLanguage.label')}</label>
						<select id='gdb-user-language' value={formData.preferredLanguage ?? ''} disabled={!supportsLanguage || actionLoading} onChange={event => { setLanguageTouched(true); setFormData({ ...formData, preferredLanguage: event.target.value as UserLanguage }) }}>
							<option value='' disabled>{t('accountLanguage.unassigned')}</option>
								<option value='en'>English</option><option value='es'>Español</option>
						</select>
						<small>{t(supportsLanguage ? 'accountLanguage.adminHelp' : 'accountLanguage.unsupported')}</small>
					</div>
					<label className='gdb-check-label'><input type='checkbox' checked={formData.tutorialEnabled ?? false} onChange={event => setFormData({ ...formData, tutorialEnabled: event.target.checked })} />{t('guide.enableForUser')}</label>
					<p className='gdb-hint'>{t('guide.enableForUserHelp')}</p>

					<div className='modal-actions'>
						<button type='button' className='btn btn-secondary' onClick={handleCloseModal} disabled={actionLoading}>
							{t('admin.crud.cancel')}
						</button>
						<button type='submit' className='btn btn-primary' disabled={actionLoading}>
							{actionLoading ? t('common.saving') : editingUser ? t('admin.crud.update') : t('admin.crud.create')}
						</button>
					</div>
				</form>
			</Modal>

			{/* Delete Confirmation Modal */}
			<Modal isOpen={deleteConfirm !== null} onClose={() => setDeleteConfirm(null)} title={t('admin.users.confirmTitle')} maxWidth='600px'>
				<div className='admin-users-modal'>
					<p className='warning-text'>{deleteConfirm ? t('admin.users.deleteWarning', { username: deleteConfirm.username }) : ''}</p>
					<div className='warning-box'>
						<p>
							<strong>{t('admin.users.deleteWarning2')}</strong>
						</p>
						<ul>
							<li>{t('admin.users.deleteWarning3')}</li>
							<li>{t('admin.users.deleteWarning4')}</li>
							<li>{t('admin.users.deleteWarning5')}</li>
						</ul>
					</div>

					<div className='modal-actions'>
						<button type='button' className='btn btn-secondary' onClick={() => setDeleteConfirm(null)} disabled={actionLoading}>
							{t('admin.crud.cancel')}
						</button>
						<button type='button' className='btn btn-danger' onClick={handleDeleteConfirm} disabled={actionLoading}>
							{actionLoading ? t('admin.users.deleting') : t('admin.users.deleteBtn')}
						</button>
					</div>
				</div>
			</Modal>

			{/* Change Password Modal */}
			<Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} title={t('admin.users.changePasswordTitle')} maxWidth='500px'>
				<form onSubmit={handleChangePassword} className='admin-users-modal'>
					<div className='form-group'>
							<label htmlFor='gdb-user-new-password'>{t('admin.users.newPasswordLabel')}</label>
							<input id='gdb-user-new-password' type='password' value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('admin.users.newPasswordPlaceholder')} />
						<small>{t('admin.users.passwordSmallHint')}</small>
					</div>

					<div className='modal-actions'>
						<button type='button' className='btn btn-secondary' onClick={() => setIsPasswordModalOpen(false)} disabled={actionLoading}>
							{t('admin.crud.cancel')}
						</button>
						<button type='submit' className='btn btn-primary' disabled={actionLoading}>
							{actionLoading ? t('common.saving') : t('admin.users.changePasswordBtn')}
						</button>
					</div>
				</form>
			</Modal>
		</div>
	)
}

export default AdminUsers
