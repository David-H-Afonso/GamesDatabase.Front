import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ThemeSelector } from './ThemeSelector'
import { useAppSelector } from '@/store/hooks'
import { selectCurrentUser, selectIsAdmin } from '@/store/features/auth/selector'
import UserIcon from '@/assets/svgs/user.svg?react'
import './MobileMenu.scss'

interface MobileMenuProps {
	isOpen: boolean
	onClose: () => void
	onLogout: () => void
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose, onLogout }) => {
	const location = useLocation()
	const currentUser = useAppSelector(selectCurrentUser)
	const isAdmin = useAppSelector(selectIsAdmin)

	if (!isOpen) return null

	return (
		<>
			<div className='mobile-menu-overlay' onClick={onClose} />
			<div className='mobile-menu'>
				<div className='mobile-menu__header'>
					<h2>Menu</h2>
					<button className='mobile-menu__close' onClick={onClose} aria-label='Cerrar menú'>
						✕
					</button>
				</div>

				<nav className='mobile-menu__nav'>
					<Link
						to='/'
						className={`mobile-menu__link ${location.pathname === '/' ? 'active' : ''}`}
						onClick={onClose}>
						Home
					</Link>
					<Link
						to='/admin/platforms'
						className={`mobile-menu__link ${
							location.pathname.startsWith('/admin') ? 'active' : ''
						}`}
						onClick={onClose}>
						Admin
					</Link>
					{isAdmin && (
						<Link
							to='/admin/users'
							className={`mobile-menu__link ${
								location.pathname === '/admin/users' ? 'active' : ''
							}`}
							onClick={onClose}>
							Users
						</Link>
					)}
				</nav>

				<div className='mobile-menu__footer'>
					<ThemeSelector />
					{currentUser && (
						<div className='mobile-menu__user'>
							<div className='mobile-menu__user-info'>
								<UserIcon width={20} height={20} />
								<span>{currentUser.username}</span>
							</div>
							<button className='mobile-menu__logout' onClick={onLogout}>
								Logout
							</button>
						</div>
					)}
				</div>
			</div>
		</>
	)
}
