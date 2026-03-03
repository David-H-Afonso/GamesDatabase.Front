import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useGameStatus, useGamePlatform, useGamePlayWith, useGamePlayedStatus } from '@/hooks'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchUserPreferences, forceLogout } from '@/store/features/auth/authSlice'
import { purgePersistedState } from '@/utils/customFetch'

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
	const dispatch = useAppDispatch()
	const userId = useAppSelector((state) => state.auth.user?.id)
	const token = useAppSelector((state) => state.auth.token)
	const hasVerified = useRef(false)

	const { fetchActiveStatusList } = useGameStatus()
	const { fetchActiveList: fetchActivePlatforms } = useGamePlatform()
	const { fetchActiveOptions } = useGamePlayWith()
	const { fetchActiveList: fetchActivePlayedStatuses } = useGamePlayedStatus()

	const loadCatalogData = async () => {
		try {
			await Promise.all([fetchActiveStatusList(), fetchActivePlatforms(), fetchActiveOptions(), fetchActivePlayedStatuses()])
		} catch (error) {
			console.error('❌ Error loading catalog data:', error)
		}
	}

	// On startup: verify the persisted session is still valid by fetching user data.
	// If the token is expired/invalid, customFetch will get a 401 and forceLogout automatically.
	// If user data is missing despite isAuthenticated=true, force logout defensively.
	useEffect(() => {
		if (hasVerified.current) return
		hasVerified.current = true

		if (!token) return

		if (!userId) {
			// Token exists but no user id — corrupt persisted state, clear it
			dispatch(forceLogout())
			purgePersistedState()
			return
		}

		void dispatch(fetchUserPreferences(userId))
	}, [])

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
			void loadCatalogData()
		}

		previousPath.current = currentPath
	}, [location.pathname])

	return null
}

export default DataLoader
