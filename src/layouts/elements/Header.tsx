import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ThemeSelector } from './ThemeSelector'
import CreateGame from '@/components/elements/CreateGame/CreateGame'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { logoutUser } from '@/store/features/auth/authSlice'
import { selectCurrentUser, selectIsAdmin } from '@/store/features/auth/selector'
import UserIcon from '@/assets/svgs/user.svg?react'
import './Header.scss'

export const Header: React.FC = () => {
	const location = useLocation()
	const navigate = useNavigate()
	const dispatch = useAppDispatch()

	const currentUser = useAppSelector(selectCurrentUser)
	const isAdmin = useAppSelector(selectIsAdmin)

	const handleLogout = async () => {
		await dispatch(logoutUser())
		navigate('/login')
	}

	return (
		<header className='app-header'>
			<div className='app-header-container'>
				<Link to='/' className='header-logo' aria-label='Games Database'>
					Games Database
				</Link>

				<div className='app-header-container-navigation'>
					<Link to='/' className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
						Home
					</Link>
					<Link
						to='/admin/platforms'
						className={`nav-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}>
						Admin
					</Link>
					{isAdmin && (
						<Link
							to='/admin/users'
							className={`nav-link ${location.pathname === '/admin/users' ? 'active' : ''}`}>
							Users
						</Link>
					)}
				</div>

				<div className='app-header-container-quick-actions'>
					<CreateGame />
					<ThemeSelector />
					{currentUser && (
						<div className='header-user-menu'>
							<UserIcon width={20} height={20} color='#9ca3af' />
							<span className='header-username'>{currentUser.username}</span>
							<button className='btn btn-logout' onClick={handleLogout} title='Logout'>
								Logout
							</button>
						</div>
					)}
				</div>
			</div>
		</header>
	)
}
