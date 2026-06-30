import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setTheme } from '@/store/features/theme/themeSlice'
import { AVAILABLE_THEMES } from '@/assets/styles/themes/AVAILABLE_THEMES'
import './ThemeLanguageControls.scss'

const LANGUAGES: ReadonlyArray<{ code: string; label: string }> = [
	{ code: 'en', label: 'English' },
	{ code: 'es', label: 'Español' },
]

const SunIcon = () => (
	<svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
		<circle cx='12' cy='12' r='4.5' />
		<path d='M12 1.5v2M12 20.5v2M4 4l1.5 1.5M18.5 18.5L20 20M1.5 12h2M20.5 12h2M4 20l1.5-1.5M18.5 5.5 20 4' />
	</svg>
)

const MoonIcon = () => (
	<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
		<path d='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' />
	</svg>
)

const PaletteIcon = () => (
	<svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
		<circle cx='12' cy='12' r='9' />
		<circle cx='8.5' cy='10' r='1.1' fill='currentColor' stroke='none' />
		<circle cx='12' cy='8' r='1.1' fill='currentColor' stroke='none' />
		<circle cx='15.5' cy='10' r='1.1' fill='currentColor' stroke='none' />
	</svg>
)

const SteamIcon = () => (
	<svg width='15' height='15' viewBox='0 0 58 58' fill='currentColor' aria-hidden='true'>
		<path d='M50,26c2.206,0,4-1.794,4-4s-1.794-4-4-4s-4,1.794-4,4S47.794,26,50,26z M50,20c1.103,0,2,0.897,2,2s-0.897,2-2,2s-2-0.897-2-2S48.897,20,50,20z' />
		<path d='M55.918,27.364C57.207,25.943,58,24.065,58,22c0-4.411-3.589-8-8-8c-3.661,0-6.748,2.475-7.695,5.837l-4.197,11.193c-0.961,0.058-1.883,0.321-2.721,0.781l-20.47-8.389C14.387,19.75,11.231,17,7.5,17C3.364,17,0,20.364,0,24.5S3.364,32,7.5,32c1.494,0,2.912-0.452,4.144-1.274l20.592,8.44c0.006,0.034-0.002,0.067,0.008,0.101C33.029,42.054,35.602,44,38.5,44c3.584,0,6.5-2.916,6.5-6.5c0-0.175-0.013-0.348-0.026-0.52l10.68-9.223C55.78,27.647,55.861,27.51,55.918,27.364z M50,16c3.309,0,6,2.691,6,6s-2.691,6-6,6s-6-2.691-6-6c0-0.531,0.076-1.044,0.206-1.535l0.23-0.614c0.019-0.051,0.014-0.103,0.025-0.155C45.367,17.528,47.507,16,50,16z M6.241,26.351c-1.02-0.418-1.51-1.589-1.093-2.608c0.42-1.019,1.591-1.511,2.61-1.093l26.918,11.032c0.19,0.186,0.433,0.283,0.69,0.283l2.891,1.185c0.495,0.203,0.881,0.586,1.087,1.079s0.208,1.036,0.005,1.531c-0.417,1.021-1.584,1.512-2.608,1.092L6.241,26.351z M7.5,30C4.468,30,2,27.532,2,24.5S4.468,19,7.5,19c2.293,0,4.274,1.425,5.089,3.467l-4.073-1.669c-2.04-0.835-4.381,0.146-5.219,2.185c-0.835,2.04,0.145,4.381,2.185,5.218l3.725,1.527C8.662,29.906,8.089,30,7.5,30z M38.5,42c-1.394,0-2.668-0.66-3.505-1.703l0.988,0.405c0.489,0.2,1.003,0.3,1.517,0.3c0.523,0,1.047-0.104,1.545-0.313c0.985-0.412,1.751-1.184,2.155-2.172c0.837-2.041-0.143-4.382-2.184-5.22l-0.694-0.285C38.382,33.011,38.44,33,38.5,33c2.481,0,4.5,2.019,4.5,4.5S40.981,42,38.5,42z M40.171,31.226l2.377-6.338c1.161,2.985,4.058,5.111,7.449,5.112l-5.582,4.821C43.617,33.066,42.064,31.731,40.171,31.226z' />
	</svg>
)

const ChevronIcon = ({ className }: { className?: string }) => (
	<svg className={className} width='12' height='12' viewBox='0 0 12 8' fill='none' aria-hidden='true'>
		<path d='M1.5 2.5 6 6l4.5-3.5' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' />
	</svg>
)

const CheckIcon = () => (
	<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
		<polyline points='20 6 9 17 4 12' />
	</svg>
)

const themeIcon = (key: string) => (key === 'light' ? <SunIcon /> : key === 'dark' ? <MoonIcon /> : key === 'steam' ? <SteamIcon /> : <PaletteIcon />)

export const ThemeLanguageControls: React.FC = () => {
	const { t, i18n } = useTranslation()
	const dispatch = useAppDispatch()
	const currentTheme = useAppSelector((s) => s.theme?.currentTheme) ?? 'dark'
	const currentLang = i18n.resolvedLanguage ?? 'en'

	const [open, setOpen] = useState<null | 'theme' | 'lang'>(null)
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!open) return
		const onDown = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null)
		}
		document.addEventListener('mousedown', onDown)
		return () => document.removeEventListener('mousedown', onDown)
	}, [open])

	const themeLabel = (key: string) => (key === 'light' ? t('nav.themeLight') : key === 'dark' ? t('nav.themeDark') : key.charAt(0).toUpperCase() + key.slice(1))
	const currentLanguage = LANGUAGES.find((l) => currentLang.startsWith(l.code)) ?? LANGUAGES[0]

	return (
		<div className='tl-controls' ref={ref}>
			<div className='tl-control'>
				<span className='tl-control__label'>{t('nav.theme')}</span>
				<div className='tl-select'>
					<button type='button' className='tl-select__trigger' aria-haspopup='listbox' aria-expanded={open === 'theme'} onClick={() => setOpen(open === 'theme' ? null : 'theme')}>
						<span className='tl-select__current'>
							<span className='tl-select__icon'>{themeIcon(currentTheme)}</span>
							{themeLabel(currentTheme)}
						</span>
						<ChevronIcon className={`tl-select__chevron${open === 'theme' ? ' is-open' : ''}`} />
					</button>
					{open === 'theme' && (
						<div className='tl-select__menu' role='listbox' aria-label={t('nav.theme')}>
							{AVAILABLE_THEMES.map((key) => (
								<button
									key={key}
									type='button'
									role='option'
									aria-selected={currentTheme === key}
									className={`tl-select__option${currentTheme === key ? ' is-active' : ''}`}
									onClick={() => {
										dispatch(setTheme(key))
										setOpen(null)
									}}>
									<span className='tl-select__icon'>{themeIcon(key)}</span>
									<span className='tl-select__option-label'>{themeLabel(key)}</span>
									{currentTheme === key && (
										<span className='tl-select__check'>
											<CheckIcon />
										</span>
									)}
								</button>
							))}
						</div>
					)}
				</div>
			</div>

			<div className='tl-control'>
				<span className='tl-control__label'>{t('nav.language')}</span>
				<div className='tl-select'>
					<button type='button' className='tl-select__trigger' aria-haspopup='listbox' aria-expanded={open === 'lang'} onClick={() => setOpen(open === 'lang' ? null : 'lang')}>
						<span className='tl-select__current'>{currentLanguage.label}</span>
						<ChevronIcon className={`tl-select__chevron${open === 'lang' ? ' is-open' : ''}`} />
					</button>
					{open === 'lang' && (
						<div className='tl-select__menu' role='listbox' aria-label={t('nav.language')}>
							{LANGUAGES.map(({ code, label }) => (
								<button
									key={code}
									type='button'
									role='option'
									aria-selected={currentLang.startsWith(code)}
									className={`tl-select__option${currentLang.startsWith(code) ? ' is-active' : ''}`}
									onClick={() => {
										void i18n.changeLanguage(code)
										setOpen(null)
									}}>
									<span className='tl-select__option-label'>{label}</span>
									{currentLang.startsWith(code) && (
										<span className='tl-select__check'>
											<CheckIcon />
										</span>
									)}
								</button>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
