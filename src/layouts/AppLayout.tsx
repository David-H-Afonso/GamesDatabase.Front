import React from 'react'
import { Header } from './elements'
import { DataLoader } from '@/components/DataLoader'

interface AppLayoutProps {
	children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
	return (
		<div className='app-layout'>
			<DataLoader />
			<Header />
			<main className='app-layout__content'>{children}</main>
		</div>
	)
}
