import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ThemeSelector } from './ThemeSelector'
import { MobileMenu } from './MobileMenu'
import CreateGame from '@/components/elements/CreateGame/CreateGame'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { logoutUser } from '@/store/features/auth/authSlice'
import { selectCurrentUser, selectIsAdmin } from '@/store/features/auth/selector'
import UserIcon from '@/assets/svgs/user.svg?react'
import logoImage from '@/assets/pngs/logo.png'
import './Header.scss'

export const Header: React.FC = () => {
	const location = useLocation()
	const navigate = useNavigate()
	const dispatch = useAppDispatch()
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

	const currentUser = useAppSelector(selectCurrentUser)
	const isAdmin = useAppSelector(selectIsAdmin)

	const handleLogout = async () => {
		await dispatch(logoutUser())
		navigate('/login')
		setIsMobileMenuOpen(false)
	}

	return (
		<>
			<header className='app-header'>
				<div className='app-header-container'>
					{/* Logo - visible on mobile, hidden on desktop */}
					<Link to='/' className='header-logo-icon' aria-label='Games Database'>
						<img src={logoImage} alt='Games Database' />
					</Link>

					{/* Desktop Logo/Title */}
					<Link to='/' className='header-logo' aria-label='Games Database'>
						<h1 className='sr-only'>Games Database</h1>
						Games Database
					</Link>

					{/* Desktop Navigation */}
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

					{/* Desktop Actions */}
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

					{/* Mobile Actions */}
					<div className='app-header-container-mobile-actions'>
						<CreateGame />
						<button
							className='header-burger-btn'
							onClick={() => setIsMobileMenuOpen(true)}
							aria-label='Abrir menú'>
							<span></span>
							<span></span>
							<span></span>
						</button>
					</div>
				</div>
			</header>

			{/* Mobile Menu */}
			<MobileMenu
				isOpen={isMobileMenuOpen}
				onClose={() => setIsMobileMenuOpen(false)}
				onLogout={handleLogout}
			/>
		</>
	)
}
