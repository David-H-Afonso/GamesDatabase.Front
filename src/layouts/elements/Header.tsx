import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CommandPalette } from './CommandPalette'
import { AppearanceSheet } from '@/components/Collection/AppearanceSheet'
import { CollectionSheet } from '@/components/Collection/CollectionSheet'
import { CollectionIcon, type CollectionIconName } from '@/components/Collection/CollectionIcon'
import CreateGame, { type CreateGameHandle } from '@/components/elements/CreateGame/CreateGame'
import GameDataActions from '@/components/elements/GameDataActions/GameDataActions'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { logoutUser } from '@/store/features/auth/authSlice'
import { selectCurrentUser, selectIsAdmin } from '@/store/features/auth/selector'
import { setFilters } from '@/store/features/games/gamesSlice'
import type { Game } from '@/models/api/Game'
import { CollectionGameDetails as GameDetails } from '@/components/Collection/CollectionGameDetailsLazy'
import { useCollectionDetails } from '@/components/Collection/collectionDetailsContext'
import { version } from '../../../package.json'
import logoImage from '@/assets/pngs/logo.png'
import './Header.scss'
import './GalleryHeader.scss'
import { useRandomGame } from '@/hooks/useRandomGame'
import { useOnboarding } from '@/components/Onboarding/onboardingContext'
import { useGameMetadata } from '@/components/Collection/gameMetadataContext'
import { useDisplayedGamesScope } from '@/components/Collection/displayedGamesContext'

const OnboardingGuide = lazy(() => import('@/components/Onboarding/OnboardingGuide').then(module => ({ default: module.OnboardingGuide })))
const GameMetadataSheet = lazy(() => import('@/components/Collection/GameMetadataSheet').then(module => ({ default: module.GameMetadataSheet })))
const MetadataAutofillBatchSheet = lazy(() => import('@/components/Collection/MetadataAutofillBatchSheet').then(module => ({ default: module.MetadataAutofillBatchSheet })))

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.userAgent)

const LogoutIcon = () => (
	<svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
		<path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' />
		<polyline points='16 17 21 12 16 7' />
		<line x1='21' y1='12' x2='9' y2='12' />
	</svg>
)

const SearchIcon = () => (
	<svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
		<circle cx='11' cy='11' r='7' />
		<line x1='21' y1='21' x2='16.65' y2='16.65' />
	</svg>
)

export const Header: React.FC = () => {
	const { t, i18n } = useTranslation()
	const location = useLocation()
	const navigate = useNavigate()
	const dispatch = useAppDispatch()
	const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
	const [appearanceOpen, setAppearanceOpen] = useState(false)
	const [isPaletteOpen, setIsPaletteOpen] = useState(false)
	const [randomOpen, setRandomOpen] = useState(false)
	const [detailGame, setDetailGame] = useState<{ game: Game; ownerId: number } | null>(null)
	const details = useCollectionDetails()

	const currentUser = useAppSelector(selectCurrentUser)
	const isAdmin = useAppSelector(selectIsAdmin)
	const filters = useAppSelector((s) => s.games?.filters ?? {})

	const createGameRef = useRef<CreateGameHandle>(null)
	const guide = useOnboarding()
	const metadata = useGameMetadata()
	const openGame = (game: Game) => { if (details) details.open(game); else if (currentUser) setDetailGame({ game, ownerId: currentUser.id }) }
	const registered = useDisplayedGamesScope()?.scope
	const displayed = registered?.ownerId === currentUser?.id && registered?.route === location.pathname + location.search ? registered : null
	const random = useRandomGame(currentUser?.id, `${location.key}:${displayed?.signature ?? ''}:${displayed?.loading ? 'loading' : 'ready'}`, game => { setRandomOpen(false); openGame(game) })
	const chooseRandom = () => { random.clearError(); setRandomOpen(true) }
	useEffect(() => { setDetailGame(null); setRandomOpen(false) }, [location.key, currentUser?.id])
	useEffect(() => { metadata?.close(); metadata?.closeBatch() }, [location.key, metadata?.close, metadata?.closeBatch])

	const clearSearch = () => {
		if ((filters.search ?? '') !== '' || filters.nameSearch) dispatch(setFilters({ ...filters, search: undefined, nameSearch: undefined, searchMetadata: false, page: 1 }))
	}

	const handleLogout = async () => {
		setIsUserMenuOpen(false)
		await dispatch(logoutUser())
		navigate('/login')
	}

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault()
				if (document.querySelector('dialog[open]')) return
				setIsPaletteOpen(true)
			}
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [])

	const isUsers = location.pathname.startsWith('/admin/users')
	const isAdminSection = location.pathname.startsWith('/admin') && !isUsers
	const isHome = location.pathname === '/'
	const isLibrary = location.pathname.startsWith('/library') || location.pathname.startsWith('/games') || location.pathname === '/settings'
	const isFocus = location.pathname.startsWith('/focus')
	const isPlaylists = location.pathname.startsWith('/playlists') || location.pathname === '/shelves'
	const isStatistics = location.pathname.startsWith('/statistics')

	const navItems = useMemo(
		() => [
			{ key: 'home', to: '/', label: t('gallery.nav.home'), active: isHome },
			{ key: 'library', to: '/library', label: t('gallery.nav.library'), active: isLibrary },
			{ key: 'focus', to: '/focus', label: t('gallery.nav.focus'), active: isFocus },
			{ key: 'playlists', to: '/playlists', label: t('gallery.nav.playlists'), active: isPlaylists },
			{ key: 'statistics', to: '/statistics', label: t('gallery.nav.statistics'), active: isStatistics },
		],
		[t, isHome, isLibrary, isFocus, isPlaylists, isStatistics]
	)
	const renderSplit = () => (
		<button type='button' className='gdb-button gdb-button--primary gdb-header__add' onClick={() => createGameRef.current?.open()} aria-label={t('game.addGame')} aria-haspopup='dialog'><CollectionIcon name='plus' /><span>{t('game.addGame')}</span></button>
	)

	return (
		<>
			<header className='app-header gdb-header'>
				<div className='app-header__inner'>
					<Link to='/' className='app-header__brand' aria-label={`${t('nav.appName')} · ${t('gallery.nav.home')}`}>
						<img className='gdb-brand-mark' src={logoImage} width={34} height={34} alt='' aria-hidden='true' />
						<span className='gdb-brand-text' aria-hidden='true'>games<span>database</span></span>
					</Link>

					<nav className='app-header__nav' aria-label={t('nav.menu')}>
						{navItems.map((n) => (
							<Link
								key={n.key}
								to={n.to}
								className={`app-header__nav-link${n.active ? ' is-active' : ''}`}
								aria-current={n.active ? 'page' : undefined}
								onClick={n.key === 'library' ? clearSearch : undefined}>
								<CollectionIcon name={n.key as CollectionIconName} /><span>{n.label}</span>
							</Link>
						))}
					</nav>

					<div className='app-header__actions'>
						<div className='app-header__desk'>
							<button className='app-header__cmdk' onClick={() => setIsPaletteOpen(true)} aria-label={t('gallery.nav.search')} aria-keyshortcuts='Meta+K Control+K' aria-haspopup='dialog'>
								<SearchIcon />
								<span className='app-header__cmdk-text'>{t('nav.search')}</span>
								<kbd className='app-header__cmdk-kbd'>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
							</button>

							<button type='button' className='gdb-icon-button gdb-header__palette' onClick={() => setAppearanceOpen(true)} aria-label={t('gallery.theme.appearance')} aria-haspopup='dialog'><CollectionIcon name='palette' /></button>
							<button type='button' className='gdb-icon-button gdb-header__random' aria-label={t('gallery.discovery.random')} title={t('gallery.discovery.random')} aria-haspopup='dialog' onClick={chooseRandom}><CollectionIcon name='dice' /></button>
							{renderSplit()}
							{currentUser && <button type='button' className='gdb-profile-button' aria-label={`${t('gallery.nav.account')} · ${currentUser.username}`} aria-haspopup='dialog' aria-expanded={isUserMenuOpen} onClick={() => setIsUserMenuOpen(value => !value)}><span>{Array.from(currentUser.username)[0]?.toLocaleUpperCase(i18n.language)}</span></button>}
						</div>

					</div>
				</div>
			</header>
			<CollectionSheet open={randomOpen} onClose={() => { random.cancel(); setRandomOpen(false) }} title={t('gallery.discovery.random')} className='gdb-random-sheet'>
				<div className='gdb-random-choices' aria-busy={random.loading}>
					<button type='button' className='gdb-random-choice' disabled={random.loading} onClick={() => { void random.pick() }}><CollectionIcon name='library' /><span><b>{t('gallery.discovery.wholeLibrary')}</b><small>{t('gallery.discovery.wholeLibraryHelp')}</small></span><CollectionIcon name='arrow' /></button>
					<button type='button' className='gdb-random-choice' disabled={random.loading || !displayed || displayed.loading || !displayed.gameIds.length || displayed.gameIds.length > 1000} onClick={() => { if (displayed && !displayed.loading) { void random.pick(displayed.gameIds) } }}><CollectionIcon name='filter' /><span><b>{t('gallery.discovery.displayed', { count: displayed?.gameIds.length ?? 0 })}</b><small>{t(displayed ? displayed.loading ? 'gallery.common.loading' : 'gallery.discovery.displayedHelp' : 'gallery.discovery.noDisplayedScope')}</small></span><CollectionIcon name='arrow' /></button>
					{random.loading && <p className='gdb-hint' role='status'>{t('gallery.discovery.choosing')}</p>}
					{random.error && <p className='gdb-error' role={random.error === 'empty' ? 'status' : 'alert'}>{t(`gallery.discovery.${random.error}`)}</p>}
				</div>
			</CollectionSheet>
			{guide?.data?.enabled && !guide.open && <div className='gdb-learning-notice'><span>{t(`guide.steps.${guide.data.step}.title`)}</span><button type='button' className='gdb-text-button' onClick={() => { void guide.openGuide() }}>{t('guide.resume')}<CollectionIcon name='arrow' /></button></div>}

			<CreateGame ref={createGameRef} gallery renderTrigger={() => null} />

			<nav className='gdb-mobile-nav' aria-label={t('nav.menu')}>{navItems.map(item => <Link key={item.key} to={item.to} aria-current={item.active ? 'page' : undefined} onClick={item.key === 'library' ? clearSearch : undefined}><CollectionIcon name={item.key as CollectionIconName} /><span>{item.label}</span></Link>)}</nav>
			<CollectionSheet open={isUserMenuOpen} onClose={() => setIsUserMenuOpen(false)} title={t('gallery.nav.account')} footer={<button type='button' className='gdb-button' onClick={() => { void handleLogout() }}><LogoutIcon />{t('nav.logout')}</button>}>
				<div className='gdb-account'><div className='gdb-account__profile'><span>{Array.from(currentUser?.username ?? '')[0]}</span><div><h3>{currentUser?.username}</h3><small>Web {version}</small></div></div>
					<Link className='gdb-account__link' to='/?customize=home' onClick={() => setIsUserMenuOpen(false)}><CollectionIcon name='home' />{t('gallery.home.configureTitle')}<CollectionIcon name='arrow' /></Link>
					<button type='button' className='gdb-account__link' onClick={() => { setIsUserMenuOpen(false); setAppearanceOpen(true) }}><CollectionIcon name='palette' />{t('gallery.theme.appearance')}<CollectionIcon name='arrow' /></button>
					<button type='button' className='gdb-account__link' onClick={() => { setIsUserMenuOpen(false); chooseRandom() }}><CollectionIcon name='dice' />{t('gallery.discovery.random')}<CollectionIcon name='arrow' /></button>
					{guide && <button type='button' className='gdb-account__link' onClick={() => { setIsUserMenuOpen(false); void guide.openGuide() }}><CollectionIcon name='help' />{t(guide.data?.enabled ? 'guide.resume' : 'guide.title')}<CollectionIcon name='arrow' /></button>}
					{guide && (guide.data?.hasSamples || guide.data?.sampleGames.length || guide.data?.samplePlaylists) ? <button type='button' className='gdb-account__link' onClick={() => { setIsUserMenuOpen(false); void guide.openGuide(false, 'finish') }}><CollectionIcon name='cards' />{t('guide.manageSamples')}<CollectionIcon name='arrow' /></button> : null}
					<Link className='gdb-account__link' to='/statistics' onClick={() => setIsUserMenuOpen(false)}><CollectionIcon name='statistics' />{t('gallery.nav.statistics')}<CollectionIcon name='arrow' /></Link>
					<Link className='gdb-account__link' to='/shelves' onClick={() => setIsUserMenuOpen(false)}><CollectionIcon name='playlists' />{t('gallery.shelves.title')}<CollectionIcon name='arrow' /></Link>
					<GameDataActions renderTrigger={(toggle, open) => <button type='button' className='gdb-account__link' onClick={toggle} aria-haspopup='menu' aria-expanded={open}><CollectionIcon name='download' />{t('gallery.nav.dataTools')}<CollectionIcon name='down' /></button>} />
					<Link className='gdb-account__link' to='/admin/platforms' aria-current={isAdminSection ? 'page' : undefined} onClick={() => setIsUserMenuOpen(false)}><CollectionIcon name='settings' />{t('gallery.nav.administration')}<CollectionIcon name='arrow' /></Link>
					{isAdmin && <Link className='gdb-account__link' to='/admin/users' aria-current={isUsers ? 'page' : undefined} onClick={() => setIsUserMenuOpen(false)}><CollectionIcon name='shield' />{t('nav.users')}<CollectionIcon name='arrow' /></Link>}
				</div>
			</CollectionSheet>
			<AppearanceSheet open={appearanceOpen} onClose={() => setAppearanceOpen(false)} />

			<CommandPalette
				isOpen={isPaletteOpen}
				onClose={() => setIsPaletteOpen(false)}
				onOpenGame={openGame}
				onCreateGame={() => createGameRef.current?.open()}
			/>

			{detailGame && detailGame.ownerId === currentUser?.id && (
					<GameDetails key={`${detailGame.ownerId}:${detailGame.game.id}`} game={detailGame.game} closeDetails={() => setDetailGame(null)} />
			)}
			{guide?.open && <Suspense fallback={<CollectionSheet open title={t('guide.title')} onClose={guide.hide}><p role='status'>{t('gallery.common.loading')}</p></CollectionSheet>}><OnboardingGuide key={currentUser?.id ?? 'anonymous'} onAddGame={() => createGameRef.current?.open()} onOpenGame={openGame} onRandomGame={chooseRandom} /></Suspense>}
			{metadata?.game && <Suspense fallback={<CollectionSheet open title={t('metadata.title')} onClose={() => metadata.close()}><p role='status'>{t('gallery.common.loading')}</p></CollectionSheet>}><GameMetadataSheet key={`${currentUser?.id}:${metadata.game.id}`} game={metadata.game} onClose={() => metadata.close(metadata.game!.id)} /></Suspense>}
			{metadata?.batch && <Suspense fallback={<CollectionSheet open title={t('metadata.batch.title')} onClose={metadata.closeBatch} closeDisabled={metadata.batch.busy && metadata.batch.phase === 'saving'}><p role='status'>{t('gallery.common.loading')}</p></CollectionSheet>}><MetadataAutofillBatchSheet key={`${metadata.batch.ownerId}:${metadata.batch.targets.map(target => target.id).join(',')}`} batch={metadata.batch} onClose={metadata.closeBatch} onStop={metadata.stopBatch} onRetry={metadata.retryBatch} onReview={id => { metadata.closeBatch(); navigate(`/games/${id}`) }} /></Suspense>}
		</>
	)
}
