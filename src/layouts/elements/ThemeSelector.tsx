import React from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setTheme } from '@/store/features/theme/themeSlice'
import './ThemeSelector.scss'
import { AVAILABLE_THEMES } from '@/assets/styles/themes/AVAILABLE_THEMES'

export const ThemeSelector: React.FC = () => {
	const dispatch = useAppDispatch()
	const { currentTheme, availableThemes } = useAppSelector((state) => state.theme)

	// Display name based on the known AVAILABLE_THEMES
	const THEME_DISPLAY_NAMES: Record<string, string> = {
		[AVAILABLE_THEMES[0]]: 'Claro',
		[AVAILABLE_THEMES[1]]: 'Oscuro',
	}

	const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		dispatch(setTheme(event.target.value))
	}

	const getThemeDisplayName = (themeKey: string): string => {
		if (THEME_DISPLAY_NAMES[themeKey]) return THEME_DISPLAY_NAMES[themeKey]

		// Fallback: capitalize the key
		return themeKey.charAt(0).toUpperCase() + themeKey.slice(1)
	}

	return (
		<div className='theme-selector'>
			<select
				id='theme-select'
				value={currentTheme}
				onChange={handleThemeChange}
				className='theme-selector__select'>
				{availableThemes.map((themeKey) => (
					<option key={themeKey} value={themeKey}>
						{getThemeDisplayName(themeKey)}
					</option>
				))}
			</select>
		</div>
	)
}
