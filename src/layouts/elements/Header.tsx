import React, { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MobileMenu } from './MobileMenu'
import { CommandPalette } from './CommandPalette'
import { ThemeLanguageControls } from './ThemeLanguageControls'
import CreateGame, { type CreateGameHandle } from '@/components/elements/CreateGame/CreateGame'
import GameDataActions from '@/components/elements/GameDataActions/GameDataActions'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { logoutUser } from '@/store/features/auth/authSlice'
import { selectCurrentUser, selectIsAdmin } from '@/store/features/auth/selector'
import { setFilters } from '@/store/features/games/gamesSlice'
import type { Game } from '@/models/api/Game'
import UserIcon from '@/assets/svgs/user.svg?react'
import logoImage from '@/assets/pngs/logo.png'
import './Header.scss'

const GameDetails = lazy(() => import('@/components/elements/GameDetails/GameDetails').then((m) => ({ default: m.GameDetails })))

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.userAgent)

const LogoutIcon = () => (
	<svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
		<path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' />
		<polyline points='16 17 21 12 16 7' />
		<line x1='21' y1='12' x2='9' y2='12' />
	</svg>
)

const ChevronIcon = () => (
	<svg className='app-header__chevron' width='10' height='10' viewBox='0 0 10 6' fill='none' aria-hidden='true'>
		<path d='M1 1l4 4 4-4' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
	</svg>
)

const SearchIcon = () => (
	<svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
		<circle cx='11' cy='11' r='7' />
		<line x1='21' y1='21' x2='16.65' y2='16.65' />
	</svg>
)

const AddGameIcon = () => (
	<svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' style={{ flexShrink: 0 }}>
		<rect x='1' y='5' width='22' height='14' rx='4' />
		<path d='M8 9v6M5 12h6' />
		<circle cx='16' cy='10' r='1.2' fill='currentColor' stroke='none' />
		<circle cx='19' cy='12' r='1.2' fill='currentColor' stroke='none' />
		<circle cx='16' cy='14' r='1.2' fill='currentColor' stroke='none' />
		<circle cx='13' cy='12' r='1.2' fill='currentColor' stroke='none' />
	</svg>
)

const SplitChevron = () => (
	<svg width='12' height='12' viewBox='0 0 12 8' fill='none' aria-hidden='true'>
		<path d='M1.5 2.5 6 6l4.5-3.5' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' />
	</svg>
)

export const Header: React.FC = () => {
	const { t, i18n } = useTranslation()
	const location = useLocation()
	const navigate = useNavigate()
	const dispatch = useAppDispatch()
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
	const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
	const [isPaletteOpen, setIsPaletteOpen] = useState(false)
	const [detailGame, setDetailGame] = useState<Game | null>(null)

	const currentUser = useAppSelector(selectCurrentUser)
	const isAdmin = useAppSelector(selectIsAdmin)
	const filters = useAppSelector((s) => s.games?.filters ?? {})

	const createGameRef = useRef<CreateGameHandle>(null)

	const clearSearch = () => {
		if ((filters.search ?? '') !== '') dispatch(setFilters({ ...filters, search: undefined, page: 1 }))
	}

	const handleLogout = async () => {
		setIsUserMenuOpen(false)
		setIsMobileMenuOpen(false)
		await dispatch(logoutUser())
		navigate('/login')
	}

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault()
				setIsPaletteOpen(true)
			}
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [])

	useEffect(() => {
		if (!isUserMenuOpen) return
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setIsUserMenuOpen(false)
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [isUserMenuOpen])

	const isUsers = location.pathname.startsWith('/admin/users')
	const isAdminSection = location.pathname.startsWith('/admin') && !isUsers
	const isHome = location.pathname === '/'

	const navItems = useMemo(
		() => [
			{ key: 'home', to: '/', label: t('nav.home'), active: isHome },
			{ key: 'admin', to: '/admin/platforms', label: t('nav.admin'), active: isAdminSection },
			...(isAdmin ? [{ key: 'users', to: '/admin/users', label: t('nav.users'), active: isUsers }] : []),
		],
		[t, isHome, isAdminSection, isUsers, isAdmin]
	)
	const activeKey = navItems.find((n) => n.active)?.key ?? null

	const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({})
	const [hoverKey, setHoverKey] = useState<string | null>(null)
	const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)

	useLayoutEffect(() => {
		const key = hoverKey ?? activeKey
		const el = key ? linkRefs.current[key] : null
		setIndicator(el && el.offsetWidth ? { left: el.offsetLeft, width: el.offsetWidth } : null)
	}, [hoverKey, activeKey, navItems, i18n.language])

	useEffect(() => {
		const onResize = () => {
			const el = activeKey ? linkRefs.current[activeKey] : null
			if (el && el.offsetWidth) setIndicator({ left: el.offsetLeft, width: el.offsetWidth })
		}
		window.addEventListener('resize', onResize)
		return () => window.removeEventListener('resize', onResize)
	}, [activeKey])

	const renderSplit = () => (
		<div className='app-header__split'>
			<button type='button' className='app-header__split-main' onClick={() => createGameRef.current?.open()}>
				<AddGameIcon />
				<span className='app-header__split-label'>{t('game.addGame')}</span>
			</button>
			<GameDataActions
				renderTrigger={(toggle, open) => (
					<button type='button' className='app-header__split-toggle' onClick={toggle} aria-haspopup='true' aria-expanded={open} aria-label={t('game.dataActions.title')}>
						<SplitChevron />
					</button>
				)}
			/>
		</div>
	)

	return (
		<>
			<header className='app-header'>
				<div className='app-header__inner'>
					<Link to='/' className='app-header__brand' aria-label={t('nav.appName')} onClick={clearSearch}>
						<img className='app-header__brand-mark' src={logoImage} alt='' aria-hidden='true' />
						<span className='app-header__brand-text' aria-hidden='true'>
							{t('nav.appName')}
						</span>
						<h1 className='sr-only'>{t('nav.appName')}</h1>
					</Link>

					<nav className='app-header__nav' aria-label={t('nav.menu')} onMouseLeave={() => setHoverKey(null)}>
						{navItems.map((n) => (
							<Link
								key={n.key}
								to={n.to}
								ref={(el) => {
									linkRefs.current[n.key] = el
								}}
								className={`app-header__nav-link${n.active ? ' is-active' : ''}`}
								aria-current={n.active ? 'page' : undefined}
								onClick={n.key === 'home' ? clearSearch : undefined}
								onMouseEnter={() => setHoverKey(n.key)}>
								{n.label}
							</Link>
						))}
						<span className='app-header__nav-indicator' aria-hidden='true' style={indicator ? { transform: `translateX(${indicator.left}px)`, width: `${indicator.width}px` } : { opacity: 0 }} />
					</nav>

					<div className='app-header__actions'>
						<div className='app-header__desk'>
							<button className='app-header__cmdk' onClick={() => setIsPaletteOpen(true)} aria-label={t('nav.commandSearch')} aria-keyshortcuts='Meta+K Control+K'>
								<SearchIcon />
								<span className='app-header__cmdk-text'>{t('nav.search')}</span>
								<kbd className='app-header__cmdk-kbd'>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
							</button>

							{renderSplit()}

							{currentUser && (
								<div className='app-header__user'>
									<button
										type='button'
										className='app-header__user-trigger'
										aria-label={t('nav.account')}
										aria-haspopup='menu'
										aria-expanded={isUserMenuOpen}
										onClick={() => setIsUserMenuOpen((v) => !v)}>
										<span className='app-header__avatar'>
											<UserIcon width={18} height={18} />
										</span>
										<span className='app-header__username'>{currentUser.username}</span>
										<ChevronIcon />
									</button>
									{isUserMenuOpen && (
										<>
											<div className='app-header__backdrop' onClick={() => setIsUserMenuOpen(false)} />
											<div className='app-header__user-menu' role='menu'>
												<div className='app-header__user-info'>
													<span className='app-header__avatar app-header__avatar--lg'>
														<UserIcon width={20} height={20} />
													</span>
													<span className='app-header__user-name'>{currentUser.username}</span>
												</div>

												<div className='app-header__menu-controls'>
													<ThemeLanguageControls />
												</div>

												<div className='app-header__menu-divider' />

												<button className='app-header__logout' role='menuitem' onClick={handleLogout} title={t('nav.logout')}>
													<LogoutIcon />
													<span>{t('nav.logout')}</span>
												</button>
											</div>
										</>
									)}
								</div>
							)}
						</div>

						<div className='app-header__compact'>
							{renderSplit()}
							<button
								className='app-header__burger'
								onClick={() => setIsMobileMenuOpen(true)}
								aria-label={t('nav.openMenu')}
								aria-haspopup='dialog'
								aria-expanded={isMobileMenuOpen}
								aria-controls='app-mobile-menu'>
								<span></span>
								<span></span>
								<span></span>
							</button>
						</div>
					</div>
				</div>
			</header>

			<CreateGame ref={createGameRef} renderTrigger={() => null} />

			<MobileMenu
				isOpen={isMobileMenuOpen}
				onClose={() => setIsMobileMenuOpen(false)}
				onLogout={handleLogout}
				onOpenSearch={() => {
					setIsMobileMenuOpen(false)
					setIsPaletteOpen(true)
				}}
			/>

			<CommandPalette
				isOpen={isPaletteOpen}
				onClose={() => setIsPaletteOpen(false)}
				onOpenGame={(g) => setDetailGame(g)}
				onCreateGame={() => createGameRef.current?.open()}
			/>

			{detailGame && (
				<Suspense fallback={null}>
					<GameDetails game={detailGame} closeDetails={() => setDetailGame(null)} />
				</Suspense>
			)}
		</>
	)
}
