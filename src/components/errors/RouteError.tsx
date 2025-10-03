import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom'
import './RouteError.scss'

export const RouteError = () => {
	const error = useRouteError()

	let errorMessage: string
	let errorStatus: number | undefined

	if (isRouteErrorResponse(error)) {
		errorMessage = error.statusText || error.data?.message || 'An error occurred'
		errorStatus = error.status
	} else if (error instanceof Error) {
		errorMessage = error.message
	} else {
		errorMessage = 'An unknown error occurred'
	}

	return (
		<div className='route-error'>
			<div className='route-error-content'>
				<div className='error-icon'>!</div>
				{errorStatus && <div className='error-status'>{errorStatus}</div>}
				<h1>Oops! Something went wrong</h1>
				<p className='error-message'>{errorMessage}</p>

				{process.env.NODE_ENV === 'development' && error instanceof Error && error.stack && (
					<details className='error-details'>
						<summary>Error details (Development only)</summary>
						<pre>{error.stack}</pre>
					</details>
				)}

				<div className='error-actions'>
					<Link to='/' className='btn btn-primary'>
						Go to Home
					</Link>
					<button onClick={() => window.location.reload()} className='btn btn-secondary'>
						Reload Page
					</button>
				</div>
			</div>
		</div>
	)
}
