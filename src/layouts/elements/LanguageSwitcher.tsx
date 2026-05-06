import React from 'react'
import { useTranslation } from 'react-i18next'
import './LanguageSwitcher.scss'

export const LanguageSwitcher: React.FC = () => {
	const { t, i18n } = useTranslation()

	const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		i18n.changeLanguage(event.target.value)
	}

	return (
		<div className='language-switcher'>
			<label htmlFor='language-select' className='sr-only'>
				{t('nav.language')}
			</label>
			<select id='language-select' value={i18n.resolvedLanguage} onChange={handleChange} className='language-switcher__select'>
				<option value='en'>{t('nav.langEn')}</option>
				<option value='es'>{t('nav.langEs')}</option>
			</select>
		</div>
	)
}
