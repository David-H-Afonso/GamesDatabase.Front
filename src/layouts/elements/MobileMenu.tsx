import React, { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ThemeLanguageControls } from './ThemeLanguageControls'
import { useAppSelector } from '@/store/hooks'
import { selectCurrentUser, selectIsAdmin } from '@/store/features/auth/selector'
import UserIcon from '@/assets/svgs/user.svg?react'
import './MobileMenu.scss'

interface MobileMenuProps {
	isOpen: boolean
	onClose: () => void
	onLogout: () => void
	onOpenSearch?: () => void
}

const SearchIcon = () => (
	<svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
		<circle cx='11' cy='11' r='7' />
		<line x1='21' y1='21' x2='16.65' y2='16.65' />
	</svg>
)

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose, onLogout, onOpenSearch }) => {
	const { t } = useTranslation()
	const location = useLocation()
	const currentUser = useAppSelector(selectCurrentUser)
	const isAdmin = useAppSelector(selectIsAdmin)

	useEffect(() => {
		if (!isOpen) return
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose()
		}
		window.addEventListener('keydown', onKey)
		const previousOverflow = document.body.style.overflow
		document.body.style.overflow = 'hidden'
		return () => {
			window.removeEventListener('keydown', onKey)
			document.body.style.overflow = previousOverflow
		}
	}, [isOpen, onClose])

	if (!isOpen) return null

	const isUsers = location.pathname.startsWith('/admin/users')
	const isAdminSection = location.pathname.startsWith('/admin') && !isUsers
	const isHome = location.pathname === '/'

	return (
		<>
			<div className='mobile-menu-overlay' onClick={onClose} />
			<div className='mobile-menu' id='app-mobile-menu' role='dialog' aria-modal='true' aria-label={t('nav.menu')}>
				<div className='mobile-menu__header'>
					<h2>{t('nav.menu')}</h2>
					<button className='mobile-menu__close' onClick={onClose} aria-label={t('nav.closeMenu')}>
						✕
					</button>
				</div>

				{onOpenSearch && (
					<button className='mobile-menu__search' onClick={onOpenSearch}>
						<SearchIcon />
						<span>{t('command.placeholder')}</span>
					</button>
				)}

				<nav className='mobile-menu__nav' aria-label={t('nav.menu')}>
					<Link to='/' className={`mobile-menu__link ${isHome ? 'active' : ''}`} onClick={onClose}>
						{t('nav.home')}
					</Link>
					<Link to='/admin/platforms' className={`mobile-menu__link ${isAdminSection ? 'active' : ''}`} onClick={onClose}>
						{t('nav.admin')}
					</Link>
					{isAdmin && (
						<Link to='/admin/users' className={`mobile-menu__link ${isUsers ? 'active' : ''}`} onClick={onClose}>
							{t('nav.users')}
						</Link>
					)}
				</nav>

				{/* Secondary actions: adaptable theme + language selectors */}
				<div className='mobile-menu__section'>
					<ThemeLanguageControls />
				</div>

				{currentUser && (
					<div className='mobile-menu__user'>
						<div className='mobile-menu__user-info'>
							<span className='mobile-menu__avatar'>
								<UserIcon width={20} height={20} />
							</span>
							<span className='mobile-menu__user-name'>{currentUser.username}</span>
						</div>
						<button className='mobile-menu__logout' onClick={onLogout}>
							{t('nav.logout')}
						</button>
					</div>
				)}
			</div>
		</>
	)
}
