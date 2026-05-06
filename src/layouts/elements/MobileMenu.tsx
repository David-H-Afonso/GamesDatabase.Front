import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ThemeSelector } from './ThemeSelector'
import { LanguageSwitcher } from './LanguageSwitcher'
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
	const { t } = useTranslation()
	const location = useLocation()
	const currentUser = useAppSelector(selectCurrentUser)
	const isAdmin = useAppSelector(selectIsAdmin)

	if (!isOpen) return null

	return (
		<>
			<div className='mobile-menu-overlay' onClick={onClose} />
			<div className='mobile-menu'>
				<div className='mobile-menu__header'>
					<h2>{t('nav.menu')}</h2>
					<button className='mobile-menu__close' onClick={onClose} aria-label={t('nav.closeMenu')}>
						✕
					</button>
				</div>

				<nav className='mobile-menu__nav'>
					<Link to='/' className={`mobile-menu__link ${location.pathname === '/' ? 'active' : ''}`} onClick={onClose}>
						{t('nav.home')}
					</Link>
					<Link to='/admin/platforms' className={`mobile-menu__link ${location.pathname.startsWith('/admin') ? 'active' : ''}`} onClick={onClose}>
						{t('nav.admin')}
					</Link>
					{isAdmin && (
						<Link to='/admin/users' className={`mobile-menu__link ${location.pathname === '/admin/users' ? 'active' : ''}`} onClick={onClose}>
							{t('nav.users')}
						</Link>
					)}
				</nav>

				<div className='mobile-menu__footer'>
					<LanguageSwitcher />
					<ThemeSelector />
					{currentUser && (
						<div className='mobile-menu__user'>
							<div className='mobile-menu__user-info'>
								<UserIcon width={20} height={20} />
								<span>{currentUser.username}</span>
							</div>
							<button className='mobile-menu__logout' onClick={onLogout}>
								{t('nav.logout')}
							</button>
						</div>
					)}
				</div>
			</div>
		</>
	)
}
