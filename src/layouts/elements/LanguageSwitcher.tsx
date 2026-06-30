import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './LanguageSwitcher.scss'

const FlagES = () => (
	<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 40' width='22' height='15' aria-hidden='true'>
		<rect width='60' height='40' fill='#c60b1e' />
		<rect y='10' width='60' height='20' fill='#ffc400' />
	</svg>
)

const FlagEN = () => (
	<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 40' width='22' height='15' aria-hidden='true'>
		<rect width='60' height='40' fill='#012169' />
		<path d='M0,0 L60,40 M60,0 L0,40' stroke='#fff' strokeWidth='8' />
		<path d='M0,0 L60,40 M60,0 L0,40' stroke='#c8102e' strokeWidth='4.8' />
		<path d='M30,0 V40 M0,20 H60' stroke='#fff' strokeWidth='13.3' />
		<path d='M30,0 V40 M0,20 H60' stroke='#c8102e' strokeWidth='8' />
	</svg>
)

const LANGS = [
	{ code: 'en', Flag: FlagEN },
	{ code: 'es', Flag: FlagES },
] as const

export const LanguageSwitcher: React.FC = () => {
	const { t, i18n } = useTranslation()
	const current = i18n.resolvedLanguage ?? 'en'
	const [open, setOpen] = useState(false)

	const currentLang = LANGS.find((l) => l.code === current) ?? LANGS[0]
	const CurrentFlag = currentLang.Flag

	useEffect(() => {
		if (!open) return
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setOpen(false)
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [open])

	const select = (code: string) => {
		i18n.changeLanguage(code)
		setOpen(false)
	}

	return (
		<div className='language-switcher'>
			<button className='language-switcher__btn' onClick={() => setOpen((v) => !v)} title={t('nav.language')} aria-haspopup='listbox' aria-expanded={open}>
				<CurrentFlag />
				<svg className='language-switcher__chevron' width='10' height='10' viewBox='0 0 10 6' fill='none' aria-hidden='true'>
					<path d='M1 1l4 4 4-4' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
				</svg>
			</button>
			{open && (
				<>
					<div className='language-switcher__backdrop' onClick={() => setOpen(false)} />
					<ul className='language-switcher__menu' role='listbox' aria-label={t('nav.language')}>
						{LANGS.map(({ code, Flag }) => (
							<li
								key={code}
								role='option'
								aria-selected={current === code}
								className={`language-switcher__option ${current === code ? 'language-switcher__option--active' : ''}`}
								onClick={() => select(code)}>
								<Flag />
								<span>{t(code === 'es' ? 'nav.langEs' : 'nav.langEn')}</span>
							</li>
						))}
					</ul>
				</>
			)}
		</div>
	)
}
