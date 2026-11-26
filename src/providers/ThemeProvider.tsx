import React, { useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'

interface ThemeProviderProps {
	children: React.ReactNode
}

/**
 * ThemeProvider component that ensures theme is properly initialized
 * and applied throughout the application
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
	const { currentTheme } = useTheme()

	useEffect(() => {
		// Ensure the theme is applied on mount and when it changes
		if (currentTheme && typeof document !== 'undefined') {
			document.documentElement.setAttribute('data-theme', currentTheme)
			document.documentElement.dataset.experience = 'gallery'

			// Also set body class for legacy compatibility
			for (const name of [...document.body.classList]) if (name.startsWith('theme-')) document.body.classList.remove(name)
			document.body.classList.add(`theme-${currentTheme}`)
		}
	}, [currentTheme])

	return <>{children}</>
}
