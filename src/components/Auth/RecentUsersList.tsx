import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { selectRecentUsers } from '@/store/features/recentUsers/selector'
import { removeRecentUser } from '@/store/features/recentUsers/recentUsersSlice'
import './RecentUsersList.scss'

interface RecentUsersListProps {
	onUserSelect: (username: string, hasPassword: boolean) => void
}

export const RecentUsersList = ({ onUserSelect }: RecentUsersListProps) => {
	const recentUsers = useAppSelector(selectRecentUsers)
	const dispatch = useAppDispatch()

	if (recentUsers.length === 0) {
		return null
	}

	const handleRemoveUser = (username: string, e: React.MouseEvent) => {
		e.stopPropagation()
		dispatch(removeRecentUser(username))
	}

	const formatLastLogin = (dateString: string): string => {
		const date = new Date(dateString)
		const now = new Date()
		const diffMs = now.getTime() - date.getTime()
		const diffMins = Math.floor(diffMs / 60000)
		const diffHours = Math.floor(diffMs / 3600000)
		const diffDays = Math.floor(diffMs / 86400000)

		if (diffMins < 1) return 'Just now'
		if (diffMins < 60) return `${diffMins}m ago`
		if (diffHours < 24) return `${diffHours}h ago`
		if (diffDays === 1) return 'Yesterday'
		if (diffDays < 7) return `${diffDays}d ago`
		return date.toLocaleDateString()
	}

	return (
		<div className='recent-users'>
			<h3 className='recent-users__title'>Are you...?</h3>
			<div className='recent-users__list'>
				{recentUsers.map((user) => (
					<div key={user.username} className='recent-user-card' onClick={() => onUserSelect(user.username, user.hasPassword)}>
						<div className='recent-user-card__content'>
							<div className='recent-user-card__avatar'>{user.username.charAt(0).toUpperCase()}</div>
							<div className='recent-user-card__info'>
								<span className='recent-user-card__username'>{user.username}</span>
								<span className='recent-user-card__time'>{formatLastLogin(user.lastLogin)}</span>
							</div>
						</div>
						<button className='recent-user-card__remove' onClick={(e) => handleRemoveUser(user.username, e)} type='button' aria-label={`Remove ${user.username}`}>
							<svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
								<path d='M12 4L4 12M4 4L12 12' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
							</svg>
						</button>
					</div>
				))}
			</div>
		</div>
	)
}

export default RecentUsersList
