import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './NotFound.scss'

export const NotFound = () => {
	const { t } = useTranslation()
	return (
		<div className='not-found'>
			<div className='not-found-content'>
				<div className='not-found-code'>{t('errors.notFoundCode')}</div>
				<h1>{t('errors.notFoundTitle')}</h1>
				<p>{t('errors.notFoundText')}</p>
				<Link to='/' className='btn btn-primary'>
					{t('errors.goHome')}
				</Link>
			</div>
		</div>
	)
}
