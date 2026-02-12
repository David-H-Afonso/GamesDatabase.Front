import { Outlet, NavLink } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { selectIsAdmin } from '@/store/features/auth/selector'
import './AdminLayout.scss'
import { Header } from '@/layouts/elements'

export const AdminLayout = () => {
	const isAdmin = useAppSelector(selectIsAdmin)

	return (
		<div className='admin-layout'>
			<Header />
			<div className='admin-body'>
				<div className='admin-sidebar'>
					<h2>Administración</h2>
					<nav className='admin-nav'>
						{isAdmin && (
							<NavLink to='/admin/users' className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
								Usuarios
							</NavLink>
						)}
						<NavLink to='/admin/platforms' className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
							Plataformas
						</NavLink>
						<NavLink to='/admin/status' className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
							Status
						</NavLink>
						<NavLink to='/admin/play-with' className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
							Play With
						</NavLink>
						<NavLink to='/admin/played-status' className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
							Played Status
						</NavLink>
						<NavLink to='/admin/data-export' className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
							Importar/Exportar
						</NavLink>
						<NavLink to='/admin/game-views' className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
							Vistas de Juego
						</NavLink>
						<NavLink to='/admin/preferences' className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
							Preferencias
						</NavLink>
					</nav>
				</div>
				<div className='admin-content'>
					<Outlet />
				</div>
			</div>
		</div>
	)
}

export default AdminLayout
