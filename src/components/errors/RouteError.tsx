import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './RouteError.scss'

export const RouteError = () => {
	const { t } = useTranslation()
	const error = useRouteError()

	let errorMessage: string
	let errorStatus: number | undefined

	if (isRouteErrorResponse(error)) {
		errorMessage = error.statusText || error.data?.message || t('errors.anErrorOccurred')
		errorStatus = error.status
	} else if (error instanceof Error) {
		errorMessage = error.message
	} else {
		errorMessage = t('errors.unknownError')
	}

	return (
		<div className='route-error'>
			<div className='route-error-content'>
				<div className='error-icon'>!</div>
				{errorStatus && <div className='error-status'>{errorStatus}</div>}
				<h1>{t('errors.oopsTitle')}</h1>
				<p className='error-message'>{errorMessage}</p>

				{import.meta.env.DEV && error instanceof Error && error.stack && (
					<details className='error-details'>
						<summary>{t('errors.errorDetails')}</summary>
						<pre>{error.stack}</pre>
					</details>
				)}

				<div className='error-actions'>
					<Link to='/' className='btn btn-primary'>
						{t('errors.goHome')}
					</Link>
					<button onClick={() => window.location.reload()} className='btn btn-secondary'>
						{t('errors.reloadPage')}
					</button>
				</div>
			</div>
		</div>
	)
}
