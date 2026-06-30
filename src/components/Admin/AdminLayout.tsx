import { Outlet, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/store/hooks'
import { selectIsAdmin } from '@/store/features/auth/selector'
import { ADMIN_TABS } from './config/adminTabs'
import './AdminLayout.scss'
import { Header } from '@/layouts/elements/Header'

export const AdminLayout = () => {
	const { t } = useTranslation()
	const isAdmin = useAppSelector(selectIsAdmin)
	const tabs = ADMIN_TABS.filter((tab) => !tab.adminOnly || isAdmin)

	return (
		<div className='admin-layout'>
			<Header />
			<div className='admin-body'>
				<div className='admin-sidebar'>
					<h2>{t('admin.sidebarTitle')}</h2>
					<nav className='admin-nav'>
						{tabs.map((tab) => (
							<NavLink key={tab.path} to={tab.to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
								<span className='nav-link__icon'>{tab.icon}</span>
								{t(tab.labelKey)}
							</NavLink>
						))}
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
