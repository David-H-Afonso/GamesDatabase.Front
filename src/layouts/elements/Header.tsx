import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ThemeSelector } from './ThemeSelector'
import CreateGame from '@/components/elements/CreateGame/CreateGame'
import './Header.scss'

export const Header: React.FC = () => {
	const location = useLocation()

	return (
		<>
			<header className='app-header'>
				<div className='app-header-container'>
					<h1 className='sr-only'>Games Database</h1>
					<Link to='/' className='header-logo' aria-label='Games Database'>
						Games Database
					</Link>

					<div className='app-header-container-navigation'>
						<Link to='/' className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
							Home
						</Link>
						<Link
							to='/admin/platforms'
							className={`nav-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}>
							Admin
						</Link>
					</div>

					<div className='app-header-container-quick-actions'>
						<CreateGame game={undefined as any} />
						<ThemeSelector />
					</div>
				</div>
			</header>
		</>
	)
}
