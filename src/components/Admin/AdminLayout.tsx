import { Outlet, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/store/hooks'
import { selectIsAdmin } from '@/store/features/auth/selector'
import './AdminLayout.scss'
import { Header } from '@/layouts/elements/Header'

export const AdminLayout = () => {
	const { t } = useTranslation()
	const isAdmin = useAppSelector(selectIsAdmin)

	return (
		<div className='admin-layout'>
			<Header />
			<div className='admin-body'>
				<div className='admin-sidebar'>
					<h2>{t('admin.sidebarTitle')}</h2>
					<nav className='admin-nav'>
						{isAdmin && (
							<NavLink to='/admin/users' className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
								{t('admin.nav.users')}
							</NavLink>
						)}
						<NavLink to='/admin/platforms' className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
							{t('admin.nav.platforms')}
						</NavLink>
						<NavLink to='/admin/status' className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
							{t('admin.nav.status')}
						</NavLink>
						<NavLink to='/admin/play-with' className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
							{t('admin.nav.playWith')}
						</NavLink>
						<NavLink to='/admin/played-status' className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
							{t('admin.nav.playedStatus')}
						</NavLink>
						<NavLink to='/admin/replay-types' className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
							{t('admin.nav.replayTypes')}
						</NavLink>
						<NavLink to='/admin/data-export' className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
							{t('admin.nav.importExport')}
						</NavLink>
						<NavLink to='/admin/game-views' className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
							{t('admin.nav.gameViews')}
						</NavLink>
						<NavLink to='/admin/audit-log' className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
							{t('admin.nav.audit')}
						</NavLink>
						{isAdmin && (
							<NavLink to='/admin/backup-schedule-users' className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
								{t('admin.nav.backupScheduleUsers')}
							</NavLink>
						)}
						<NavLink to='/admin/preferences' className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
							{t('admin.nav.preferences')}
						</NavLink>
						<NavLink to='/admin/steam' className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
							Steam
						</NavLink>
					</nav>
					<div className='admin-build-info'>
						<span>
							v{__APP_VERSION__} · {__COMMIT_HASH__}
						</span>
						<span>{__BUILD_DATE__}</span>
					</div>
				</div>
				<div className='admin-content'>
					<Outlet />
				</div>
			</div>
		</div>
	)
}

export default AdminLayout
