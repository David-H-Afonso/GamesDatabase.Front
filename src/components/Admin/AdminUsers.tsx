import { useEffect, useState, useMemo } from 'react'
import { userService } from '@/services'
import { useAppSelector } from '@/store/hooks'
import { selectCurrentUser } from '@/store/features/auth/selector'
import type { User, UserCreateDto, UserRole } from '@/models/api/User'
import './AdminUsers.scss'

export const AdminUsers = () => {
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
			setError(err instanceof Error ? err.message : 'Failed to load users')
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
		return users.filter(
			(user) =>
				user.username.toLowerCase().includes(search) || user.role.toLowerCase().includes(search)
		)
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
				showToast(`User "${formData.username}" updated successfully`, 'success')
			} else {
				// Create new user
				await userService.createUser(formData)
				showToast(`User "${formData.username}" created successfully`, 'success')
			}

			await loadUsers()
			handleCloseModal()
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Operation failed'
			setError(errorMsg)
			showToast(errorMsg, 'error')
		} finally {
			setActionLoading(false)
		}
	}

	const handleDeleteClick = (user: User) => {
		if (user.isDefault) {
			showToast('Cannot delete the default admin user', 'error')
			return
		}
		setDeleteConfirm(user)
	}

	const handleDeleteConfirm = async () => {
		if (!deleteConfirm) return

		try {
			setActionLoading(true)
			await userService.deleteUser(deleteConfirm.id)
			showToast(`User "${deleteConfirm.username}" deleted successfully`, 'success')
			await loadUsers()
			setDeleteConfirm(null)
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Failed to delete user'
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
			showToast('Password changed successfully', 'success')
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Failed to change password'
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
					<h1>User Management</h1>
					<p className='subtitle'>
						{users.length} user{users.length !== 1 ? 's' : ''} total
					</p>
				</div>
				<button
					className='btn btn-primary'
					onClick={() => handleOpenModal()}
					disabled={actionLoading}>
					+ Create New User
				</button>
			</div>

			{/* Search Bar */}
			<div className='search-bar'>
				<input
					type='text'
					placeholder='Search users by username or role...'
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className='search-input'
				/>
				{searchTerm && (
					<button className='btn-clear-search' onClick={() => setSearchTerm('')}>
						Clear
					</button>
				)}
			</div>

			{error && <div className='alert alert-error'>{error}</div>}

			{loading ? (
				<div className='loading'>
					<div className='spinner'></div>
					<p>Loading users...</p>
				</div>
			) : filteredUsers.length === 0 ? (
				<div className='empty-state'>
					<p>
						{searchTerm
							? `No users found matching "${searchTerm}"`
							: 'No users yet. Create your first user to get started!'}
					</p>
				</div>
			) : (
				<div className='users-table'>
					<table>
						<thead>
							<tr>
								<th>Username</th>
								<th>Role</th>
								<th>Default</th>
								<th>Created</th>
								<th>Actions</th>
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
										<span className={`badge badge-${user.role === 'Admin' ? 'admin' : 'standard'}`}>
											{user.role}
										</span>
									</td>
									<td>{user.isDefault ? 'Yes' : ''}</td>
									<td>{new Date(user.createdAt).toLocaleDateString()}</td>
									<td>
										<div className='actions'>
											<button
												className='btn btn-small btn-secondary'
												onClick={() => handleOpenModal(user)}
												disabled={actionLoading}>
												Edit
											</button>
											<button
												className='btn btn-small btn-secondary'
												onClick={() => handleOpenPasswordModal(user.id)}
												disabled={actionLoading}>
												Change Password
											</button>
											<button
												className='btn btn-small btn-danger'
												onClick={() => handleDeleteClick(user)}
												disabled={user.isDefault || actionLoading}>
												Delete
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
							<h2>{editingUser ? 'Edit User' : 'Create New User'}</h2>
							<button className='modal-close' onClick={handleCloseModal}>
								×
							</button>
						</div>

						<form onSubmit={handleSubmit}>
							<div className='form-group'>
								<label>Username</label>
								<input
									type='text'
									value={formData.username}
									onChange={(e) => setFormData({ ...formData, username: e.target.value })}
									required
								/>
							</div>

							{!editingUser && (
								<div className='form-group'>
									<label>Password (optional)</label>
									<input
										type='password'
										value={formData.password || ''}
										onChange={(e) => setFormData({ ...formData, password: e.target.value })}
										placeholder='Leave empty for no password'
									/>
								</div>
							)}

							<div className='form-group'>
								<label>Role</label>
								<select
									value={formData.role}
									onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}>
									<option value='Standard'>Standard</option>
									<option value='Admin'>Admin</option>
								</select>
							</div>

							<div className='modal-actions'>
								<button
									type='button'
									className='btn btn-secondary'
									onClick={handleCloseModal}
									disabled={actionLoading}>
									Cancel
								</button>
								<button type='submit' className='btn btn-primary' disabled={actionLoading}>
									{actionLoading ? 'Saving...' : editingUser ? 'Update' : 'Create'}
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
							<h2>Confirm Deletion</h2>
							<button className='modal-close' onClick={() => setDeleteConfirm(null)}>
								×
							</button>
						</div>

						<div className='modal-body'>
							<p className='warning-text'>
								Are you sure you want to delete user <strong>"{deleteConfirm.username}"</strong>?
							</p>
							<div className='warning-box'>
								<p>
									<strong>Warning: This action cannot be undone!</strong>
								</p>
								<ul>
									<li>All data associated with this user will be permanently deleted</li>
									<li>
										Any games or records created by this user will remain but won't be associated
										with them
									</li>
									<li>This user will immediately lose access to the system</li>
								</ul>
							</div>
						</div>

						<div className='modal-actions'>
							<button
								type='button'
								className='btn btn-secondary'
								onClick={() => setDeleteConfirm(null)}
								disabled={actionLoading}>
								Cancel
							</button>
							<button
								type='button'
								className='btn btn-danger'
								onClick={handleDeleteConfirm}
								disabled={actionLoading}>
								{actionLoading ? 'Deleting...' : 'Yes, Delete User'}
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
							<h2>Change Password</h2>
							<button className='modal-close' onClick={() => setIsPasswordModalOpen(false)}>
								×
							</button>
						</div>

						<form onSubmit={handleChangePassword}>
							<div className='form-group'>
								<label>New Password</label>
								<input
									type='password'
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									placeholder='Leave empty to remove password'
								/>
								<small>Leave empty to set no password</small>
							</div>

							<div className='modal-actions'>
								<button
									type='button'
									className='btn btn-secondary'
									onClick={() => setIsPasswordModalOpen(false)}
									disabled={actionLoading}>
									Cancel
								</button>
								<button type='submit' className='btn btn-primary' disabled={actionLoading}>
									{actionLoading ? 'Changing...' : 'Change Password'}
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
