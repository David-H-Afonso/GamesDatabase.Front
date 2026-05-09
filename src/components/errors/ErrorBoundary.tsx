import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import './ErrorBoundary.scss'

interface Props {
	children: ReactNode
}

interface State {
	hasError: boolean
	error: Error | null
	errorInfo: ErrorInfo | null
}

export const ErrorFallback = ({ error, errorInfo }: { error: Error | null; errorInfo: ErrorInfo | null }) => {
	const { t } = useTranslation()
	return (
		<div className='error-boundary'>
			<div className='error-boundary-content'>
				<div className='error-icon'>⚠</div>
				<h1>{t('errors.somethingWrong')}</h1>
				<p className='error-message'>{error?.message || t('errors.unexpectedError')}</p>
				{import.meta.env.DEV && errorInfo && (
					<details className='error-details'>
						<summary>{t('errors.errorDetails')}</summary>
						<pre>{errorInfo.componentStack}</pre>
					</details>
				)}
				<div className='error-actions'>
					<button
						onClick={() => {
							window.location.href = '/'
						}}
						className='btn btn-primary'>
						{t('errors.returnHome')}
					</button>
					<button onClick={() => window.location.reload()} className='btn btn-secondary'>
						{t('errors.reloadPage')}
					</button>
				</div>
			</div>
		</div>
	)
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props)
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
		}
	}

	static getDerivedStateFromError(error: Error): State {
		return {
			hasError: true,
			error,
			errorInfo: null,
		}
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		this.setState({
			error,
			errorInfo,
		})

		console.error('ErrorBoundary caught an error:', error, errorInfo)
	}

	handleReload = () => {
		window.location.href = '/'
	}

	render() {
		if (this.state.hasError) {
			return <ErrorFallback error={this.state.error} errorInfo={this.state.errorInfo} />
		}

		return this.props.children
	}
}
