import React from 'react'
import { Header } from './elements'

interface AppLayoutProps {
	children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
	return (
		<div className='app-layout'>
			<Header />
			<main className='app-layout__content'>{children}</main>
		</div>
	)
}
