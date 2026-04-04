import { useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { initializeTheme, setTheme, setCardStyle, setViewMode } from '@/store/features/theme/themeSlice'
import type { ViewMode } from '@/models/ViewMode'

/**
 * Custom hook for managing theme application
 * Uses CSS Custom Properties with data-theme attribute
 */
export const useTheme = () => {
	const { currentTheme, availableThemes, cardStyle, viewMode } = useAppSelector((state) => state.theme)
	const dispatch = useAppDispatch()

	// Initialize theme state from system/local values via slice initializer
	useEffect(() => {
		dispatch(initializeTheme())
		// load persisted values from localStorage and dispatch into Redux
		if (typeof window !== 'undefined') {
			const savedTheme = localStorage.getItem('theme')
			if (savedTheme) dispatch(setTheme(savedTheme))
			const savedCardStyle = localStorage.getItem('cardStyle')
			if (savedCardStyle === 'card' || savedCardStyle === 'row' || savedCardStyle === 'tile') {
				dispatch(setCardStyle(savedCardStyle))
			}

			const savedView = localStorage.getItem('viewMode')
			if (savedView === 'default' || savedView === 'goty2025' || savedView === 'goal2025') {
				dispatch(setViewMode(savedView as any))
			}
		}
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

	// Persist changes in Redux back to localStorage
	useEffect(() => {
		if (typeof window === 'undefined') return
		if (currentTheme) localStorage.setItem('theme', currentTheme)
	}, [currentTheme])

	useEffect(() => {
		if (typeof window === 'undefined') return
		if (cardStyle) localStorage.setItem('cardStyle', cardStyle)
	}, [cardStyle])

	useEffect(() => {
		if (typeof window === 'undefined') return
		if (viewMode) localStorage.setItem('viewMode', viewMode)
	}, [viewMode])

	return {
		currentTheme,
		availableThemes,
		cardStyle,
		viewMode,
		setViewMode: (v: ViewMode) => dispatch(setViewMode(v)),
	}
}
