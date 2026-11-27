import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setTheme, setThemeBackground } from '@/store/features/theme/themeSlice'
import { AVAILABLE_THEMES, getThemeFamilyKey } from '@/assets/styles/themes/AVAILABLE_THEMES'
import { getDefaultThemeBackgroundId, getThemeBackgroundOptions, NO_BACKGROUND } from '@/assets/styles/themes/themeBackgrounds'
import { CollectionSheet } from './CollectionSheet'
import { CollectionIcon } from './CollectionIcon'
import './AppearanceSheet.scss'
import { useAccountLanguage } from '@/providers/accountLanguageContext'
import type { UserLanguage } from '@/models/api/User'

const previews: Record<string, [string, string, string]> = {
	'gallery': ['#19171d', '#f5f2f6', '#d3b8f5'],
	'light': ['#e7ebf3', '#0f172a', '#2563eb'],
	'dark': ['#111319', '#fafafa', '#3b82f6'],
	'steam': ['#1a2531', '#fafafa', '#3b82f6'],
	'wolverine-classic': ['#f0c82d', '#102d65', '#1b4699'],
	'wolverine-modern': ['#cf9d34', '#4a2418', '#4c251a'],
	'gta-vice-city': ['#160f22', '#ffe8f6', '#ff62c0'],
	'gta-iv': ['#141518', '#f0f1f3', '#d6a247'],
	'gta-v': ['#0d1312', '#edf0e8', '#58c47f'],
	'gta-vi': ['#15101f', '#ffe9f4', '#ff8a8f'],
	'nintendo': ['#f6f7f9', '#1b1d21', '#e60012'],
	'playstation': ['#0a1124', '#eef2fb', '#006ce0'],
	'xbox': ['#0d130f', '#eaf3ec', '#107c10'],
}
const labels: Record<string, string> = {
	'light': 'nav.themeLight',
	'dark': 'nav.themeDark',
	'steam': 'nav.themeSteam',
	'wolverine-classic': 'nav.themeWolverineClassic',
	'wolverine-modern': 'nav.themeWolverineModern',
	'gta-vice-city': 'nav.themeViceCity',
	'gta-iv': 'nav.themeGtaIv',
	'gta-v': 'nav.themeGtaV',
	'gta-vi': 'nav.themeGtaVi',
	'nintendo': 'nav.themeNintendo',
	'playstation': 'nav.themePlaystation',
	'xbox': 'nav.themeXbox',
}
export const AppearanceSheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
	const accountLanguage = useAccountLanguage()
	const { t, i18n } = useTranslation(),
		dispatch = useAppDispatch()
	const theme = useAppSelector((state) => state.theme.currentTheme),
		backgrounds = useAppSelector((state) => state.theme.backgroundByTheme)
	const options = getThemeBackgroundOptions(theme)
	const option = (key: string) => {
		const colors = previews[key]
		const name =
			key === 'gallery'
				? t('gallery.theme.original')
				: key === 'wolverine-classic' || key === 'wolverine-modern'
					? `Wolverine · ${t(key === 'wolverine-classic' ? 'gallery.palettes.classic' : 'gallery.palettes.modern')}`
					: key.startsWith('gta-')
						? `GTA · ${key === 'gta-vice-city' ? 'Vice City' : key.slice(4).toUpperCase()}`
						: t(labels[key])
		const family = getThemeFamilyKey(key),
			light = ['light', 'wolverine-classic', 'wolverine-modern', 'nintendo'].includes(key)
		const hint = `${family === 'wolverine' ? 'Wolverine' : family === 'gta' ? 'GTA' : name} · ${t(light ? 'nav.themeLight' : 'nav.themeDark')}`
		return (
			<label className='gdb-theme-option' key={key}>
				<input type='radio' name='color-theme' value={key} checked={theme === key} onChange={() => dispatch(setTheme(key))} />
				<span
					className='gdb-theme-option__preview'
					aria-hidden='true'
					style={{ '--preview-page': colors[0], '--preview-ink': colors[1], '--preview-accent': colors[2] } as CSSProperties}>
					<span>Aa</span>
					<i />
					<i />
				</span>
				<span className='gdb-theme-option__name'>
					<strong>{name}</strong>
					{key !== 'gallery' && <small>{hint}</small>}
				</span>
			</label>
		)
	}
	return (
		<CollectionSheet
			open={open}
			onClose={onClose}
			title={t('gallery.theme.appearance')}
			className='gdb-appearance-sheet'
			footer={
				<>
					<button type='button' className='gdb-button' onClick={() => dispatch(setTheme('gallery'))}>
						<CollectionIcon name='back' />
						{t('gallery.theme.originalColors')}
					</button>
					<button type='button' className='gdb-button gdb-button--primary' onClick={onClose}>
						<CollectionIcon name='check' />
						{t('gallery.common.done')}
					</button>
				</>
			}>
			<fieldset className='gdb-theme-options'>
				<legend>Games Database</legend>
				{option('gallery')}
			</fieldset>
			<fieldset className='gdb-theme-options'>
				<legend>{t('gallery.theme.palettes')}</legend>
				<div className='gdb-theme-options__grid'>{AVAILABLE_THEMES.filter((key) => key !== 'gallery').map(option)}</div>
			</fieldset>
			<div className='gdb-form gdb-appearance-settings'>
				{options.length > 0 && (
					<label>
						{t('nav.background')}
						<select
							value={backgrounds?.[theme] ?? getDefaultThemeBackgroundId(theme) ?? NO_BACKGROUND}
							onChange={(event) => dispatch(setThemeBackground({ theme, backgroundId: event.target.value }))}>
							<option value={NO_BACKGROUND}>{t('nav.bgNone')}</option>
							{options.map((background) => (
								<option key={background.id} value={background.id}>
									{t(background.labelKey)}
								</option>
							))}
						</select>
					</label>
				)}
				<label>
					{t('nav.language')}
					<select
						value={i18n.resolvedLanguage?.startsWith('es') ? 'es' : 'en'}
						disabled={accountLanguage?.busy}
						onChange={(event) => {
							if (accountLanguage) void accountLanguage.change(event.target.value as UserLanguage)
							else void i18n.changeLanguage(event.target.value)
						}}>
						<option value='en'>English</option>
						<option value='es'>Español</option>
					</select>
				</label>
				{accountLanguage?.error && <p className='gdb-error' role='alert'>{t(accountLanguage.error === 'save' ? 'accountLanguage.saveError' : 'accountLanguage.loadError')} <button type='button' className='gdb-text-button' disabled={accountLanguage.busy} onClick={() => { void accountLanguage.refresh() }}>{t('gallery.common.retry')}</button></p>}
			</div>
		</CollectionSheet>
	)
}
