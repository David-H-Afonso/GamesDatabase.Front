import { useEffect } from 'react'
import { useGameStatus, useGamePlatform, useGamePlayWith, useGamePlayedStatus } from '@/hooks'

/**
 * Component to load all initial data required by the application.
 * This ensures that statuses, platforms, play-with options, and played-status
 * are available in Redux store when rendering game cards.
 */
export const DataLoader = () => {
	const { fetchActiveStatusList } = useGameStatus()
	const { fetchActiveList: fetchActivePlatforms } = useGamePlatform()
	const { fetchActiveOptions } = useGamePlayWith()
	const { fetchActiveList: fetchActivePlayedStatuses } = useGamePlayedStatus()

	useEffect(() => {
		// Load all active entities on app startup
		const loadInitialData = async () => {
			try {
				await Promise.all([
					fetchActiveStatusList(),
					fetchActivePlatforms(),
					fetchActiveOptions(),
					fetchActivePlayedStatuses(),
				])
				console.log('✅ Initial data loaded successfully')
			} catch (error) {
				console.error('❌ Error loading initial data:', error)
			}
		}

		void loadInitialData()
	}, [fetchActiveStatusList, fetchActivePlatforms, fetchActiveOptions, fetchActivePlayedStatuses])

	return null
}

export default DataLoader
