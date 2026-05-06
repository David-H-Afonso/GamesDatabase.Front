import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { userService } from '@/services/UserService'
import { useAppSelector } from '@/store/hooks'
import { selectCurrentUser } from '@/store/features/auth/selector'
import type { User, UserCreateDto, UserRole } from '@/models/api/User'
import './AdminUsers.scss'

export const AdminUsers = () => {
	const { t } = useTranslation()
	const currentUser = useAppSelector(selectCurrentUser)

	const [users, setUsers] = useState<User[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [actionLoading, setActionLoading] = useState(false)
	const [searchTerm, setSearchTerm] = useState('')
	const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [editingUser, setEditingUser] = useState<User | null>(null)
	const [formData, setFormData] = useState<UserCreateDto>({
		username: '',
		password: '',
		role: 'Standard',
	})
	const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
	const [passwordChangeUserId, setPasswordChangeUserId] = useState<number | null>(null)
	const [newPassword, setNewPassword] = useState('')
	const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null)

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
		if (user) {
			setEditingUser(user)
			setFormData({
				username: user.username,
				role: user.role,
			})
		} else {
			setEditingUser(null)
			setFormData({
				username: '',
				password: '',
				role: 'Standard',
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
				})
				showToast(`${t('admin.users.toastUpdated', { username: formData.username })}`, 'success')
			} else {
				// Create new user
				await userService.createUser(formData)
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
					<span className='toast-icon'>{toast.type === 'success' ? '✓' : '!'}</span>
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
										{user.id === currentUser?.id && <span className='badge badge-info'>You</span>}
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
			{isModalOpen && (
				<div className='modal-overlay' onClick={handleCloseModal}>
					<div className='modal-content' onClick={(e) => e.stopPropagation()}>
						<div className='modal-header'>
							<h2>{editingUser ? t('admin.users.editTitle') : t('admin.users.createTitle')}</h2>
							<button className='modal-close' onClick={handleCloseModal}>
								×
							</button>
						</div>

						<form onSubmit={handleSubmit}>
							<div className='form-group'>
								<label>{t('admin.users.usernameLabel')}</label>
								<input type='text' value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
							</div>

							{!editingUser && (
								<div className='form-group'>
									<label>{t('admin.users.passwordLabel')}</label>
									<input
										type='password'
										value={formData.password || ''}
										onChange={(e) => setFormData({ ...formData, password: e.target.value })}
										placeholder={t('admin.users.passwordPlaceholder')}
									/>
								</div>
							)}

							<div className='form-group'>
								<label>{t('admin.users.roleLabel')}</label>
								<select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}>
									<option value='Standard'>{t('admin.users.roleStandard')}</option>
									<option value='Admin'>{t('admin.users.roleAdmin')}</option>
								</select>
							</div>

							<div className='modal-actions'>
								<button type='button' className='btn btn-secondary' onClick={handleCloseModal} disabled={actionLoading}>
									{t('admin.crud.cancel')}
								</button>
								<button type='submit' className='btn btn-primary' disabled={actionLoading}>
									{actionLoading ? t('common.saving') : editingUser ? t('admin.crud.update') : t('admin.crud.create')}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{deleteConfirm && (
				<div className='modal-overlay' onClick={() => setDeleteConfirm(null)}>
					<div className='modal-content modal-confirm' onClick={(e) => e.stopPropagation()}>
						<div className='modal-header'>
							<h2>{t('admin.users.confirmTitle')}</h2>
							<button className='modal-close' onClick={() => setDeleteConfirm(null)}>
								×
							</button>
						</div>

						<div className='modal-body'>
							<p className='warning-text'>{t('admin.users.deleteWarning', { username: deleteConfirm.username })}</p>
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
				</div>
			)}

			{/* Change Password Modal */}
			{isPasswordModalOpen && (
				<div className='modal-overlay' onClick={() => setIsPasswordModalOpen(false)}>
					<div className='modal-content' onClick={(e) => e.stopPropagation()}>
						<div className='modal-header'>
							<h2>{t('admin.users.changePasswordTitle')}</h2>
							<button className='modal-close' onClick={() => setIsPasswordModalOpen(false)}>
								×
							</button>
						</div>

						<form onSubmit={handleChangePassword}>
							<div className='form-group'>
								<label>{t('admin.users.newPasswordLabel')}</label>
								<input type='password' value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('admin.users.newPasswordPlaceholder')} />
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
					</div>
				</div>
			)}
		</div>
	)
}

export default AdminUsers
