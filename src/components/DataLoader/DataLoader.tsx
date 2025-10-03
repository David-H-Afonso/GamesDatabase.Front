import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useGameStatus, useGamePlatform, useGamePlayWith, useGamePlayedStatus } from '@/hooks'

/**
 * Component to load all initial data required by the application.
 * This ensures that statuses, platforms, play-with options, and played-status
 * are available in Redux store when rendering game cards.
 *
 * Also reloads data when navigating from admin pages back to home,
 * ensuring that any changes made in admin panels are reflected in the game cards.
 */
export const DataLoader = () => {
	const location = useLocation()
	const previousPath = useRef<string>('')

	const { fetchActiveStatusList } = useGameStatus()
	const { fetchActiveList: fetchActivePlatforms } = useGamePlatform()
	const { fetchActiveOptions } = useGamePlayWith()
	const { fetchActiveList: fetchActivePlayedStatuses } = useGamePlayedStatus()

	const loadCatalogData = async () => {
		try {
			await Promise.all([
				fetchActiveStatusList(),
				fetchActivePlatforms(),
				fetchActiveOptions(),
				fetchActivePlayedStatuses(),
			])
			console.log('✅ Catalog data loaded successfully')
		} catch (error) {
			console.error('❌ Error loading catalog data:', error)
		}
	}

	// Load all active entities on app startup
	useEffect(() => {
		void loadCatalogData()
	}, [fetchActiveStatusList, fetchActivePlatforms, fetchActiveOptions, fetchActivePlayedStatuses])

	// Reload catalog data when navigating from admin to home
	useEffect(() => {
		const currentPath = location.pathname
		const wasInAdmin = previousPath.current.startsWith('/admin/')
		const isNowHome = currentPath === '/' || currentPath === '/home'

		if (wasInAdmin && isNowHome) {
			console.log('🔄 Reloading catalog data after leaving admin...')
			void loadCatalogData()
		}

		previousPath.current = currentPath
	}, [location.pathname])

	return null
}

export default DataLoader
