import React from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import './AdminLayout.scss'
import { Header } from '@/layouts/elements'

export const AdminLayout: React.FC = () => {
	return (
		<div className='admin-layout'>
			<Header />
			<div className='admin-body'>
				<div className='admin-sidebar'>
					<h2>Administración</h2>
					<nav className='admin-nav'>
						<NavLink
							to='/admin/platforms'
							className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
							Plataformas
						</NavLink>
						<NavLink
							to='/admin/status'
							className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
							Status
						</NavLink>
						<NavLink
							to='/admin/play-with'
							className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
							Play With
						</NavLink>
						<NavLink
							to='/admin/played-status'
							className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
							Played Status
						</NavLink>
						<NavLink
							to='/admin/data-export'
							className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
							Importar/Exportar
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
