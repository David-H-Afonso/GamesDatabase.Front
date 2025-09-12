import React from 'react'
import { Link, useLocation } from 'react-router-dom'

export const Header: React.FC = () => {
	const location = useLocation()

	return (
		<header className='app-header'>
			<div className='header-content'>
				<Link to='/' className='header-logo'>
					Logo
				</Link>

				<nav className='header-nav'>
					<Link to='/' className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
						Home
					</Link>
					<Link
						to='/settings'
						className={`nav-link ${location.pathname === '/settings' ? 'active' : ''}`}>
						Settings
					</Link>
				</nav>

				<div className='quick-actions'>
					<button className='action-btn'>Action</button>
				</div>
			</div>
		</header>
	)
}
