import React from 'react'
import { EmptyLayout, AppLayout } from '@/layouts'

interface LayoutProviderProps {
	children: React.ReactNode
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
	// Get layout type from Redux store
	// const layoutType = useSelector((state: RootState) => state.layout.layoutType)
	const layoutType: string = 'app' // Temporary hardcoded value; replace with the line above when Redux is set up

	switch (layoutType) {
		case 'empty':
			return <EmptyLayout>{children}</EmptyLayout>
		case 'app':
			return <AppLayout>{children}</AppLayout>
		default:
			return <AppLayout>{children}</AppLayout>
	}
}
