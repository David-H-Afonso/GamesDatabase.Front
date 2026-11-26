import React from 'react'
import { Header } from './elements'
import { DataLoader } from '@/components/DataLoader'
import { version } from '../../package.json'
import { CollectionDetailsProvider } from '@/components/Collection/CollectionDetailsProvider'
import { useAppSelector } from '@/store/hooks'

interface AppLayoutProps {
	children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
	const columns = useAppSelector(state => state.theme.cardColumns === 4 ? 4 : 3)
	return (
		<CollectionDetailsProvider><div className='app-layout gallery-app' data-card-columns={columns}>
			<DataLoader />
			<Header />
			<main id='main-content' className='app-layout__content' tabIndex={-1}>{children}</main>
			<footer className='gdb-footer'><span>Games Database</span><span>Web {version}{import.meta.env.DEV ? ' · Local' : ''}</span></footer>
		</div></CollectionDetailsProvider>
	)
}
