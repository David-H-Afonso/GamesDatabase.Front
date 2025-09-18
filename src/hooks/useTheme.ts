import { useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { initializeTheme } from '@/store/features/theme/themeSlice'

/**
 * Custom hook for managing theme application
 * Uses CSS Custom Properties with data-theme attribute
 */
export const useTheme = () => {
	const { currentTheme, availableThemes } = useAppSelector((state) => state.theme)
	const dispatch = useAppDispatch()

	useEffect(() => {
		dispatch(initializeTheme())
	}, [dispatch])

	useEffect(() => {
		// Ensure document has the correct data-theme attribute
		// This provides a fallback in case the early script didn't run
		if (currentTheme && typeof document !== 'undefined') {
			const currentDataTheme = document.documentElement.getAttribute('data-theme')

			if (currentDataTheme !== currentTheme) {
				document.documentElement.setAttribute('data-theme', currentTheme)
			}
		}
	}, [currentTheme])

	return {
		currentTheme,
		availableThemes,
	}
}
