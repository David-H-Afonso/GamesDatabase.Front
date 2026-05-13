import React from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setTheme } from '@/store/features/theme/themeSlice'
import { useTranslation } from 'react-i18next'
import './ThemeSelector.scss'
import { AVAILABLE_THEMES } from '@/assets/styles/themes/AVAILABLE_THEMES'

const SunIcon = () => (
	<svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
		<circle cx='12' cy='12' r='5' />
		<line x1='12' y1='1' x2='12' y2='3' />
		<line x1='12' y1='21' x2='12' y2='23' />
		<line x1='4.22' y1='4.22' x2='5.64' y2='5.64' />
		<line x1='18.36' y1='18.36' x2='19.78' y2='19.78' />
		<line x1='1' y1='12' x2='3' y2='12' />
		<line x1='21' y1='12' x2='23' y2='12' />
		<line x1='4.22' y1='19.78' x2='5.64' y2='18.36' />
		<line x1='18.36' y1='5.64' x2='19.78' y2='4.22' />
	</svg>
)

const MoonIcon = () => (
	<svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
		<path d='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' />
	</svg>
)

export const ThemeSelector: React.FC = () => {
	const { t } = useTranslation()
	const dispatch = useAppDispatch()
	const { currentTheme } = useAppSelector((state) => state.theme)

	const isDark = currentTheme === AVAILABLE_THEMES[1]

	const toggle = () => {
		dispatch(setTheme(isDark ? AVAILABLE_THEMES[0] : AVAILABLE_THEMES[1]))
	}

	return (
		<button
			className='theme-selector'
			onClick={toggle}
			title={isDark ? t('nav.themeLight') : t('nav.themeDark')}
			aria-label={isDark ? t('nav.themeLight') : t('nav.themeDark')}
			aria-pressed={isDark}>
			{isDark ? <MoonIcon /> : <SunIcon />}
		</button>
	)
}
