import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import './ErrorBoundary.scss'

interface Props {
	children: ReactNode
}

interface State {
	hasError: boolean
	error: Error | null
	errorInfo: ErrorInfo | null
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
			return (
				<div className='error-boundary'>
					<div className='error-boundary-content'>
						<div className='error-icon'>⚠</div>
						<h1>Something went wrong</h1>
						<p className='error-message'>
							{this.state.error?.message || 'An unexpected error occurred'}
						</p>

						{process.env.NODE_ENV === 'development' && this.state.errorInfo && (
							<details className='error-details'>
								<summary>Error details (Development only)</summary>
								<pre>{this.state.errorInfo.componentStack}</pre>
							</details>
						)}

						<div className='error-actions'>
							<button onClick={this.handleReload} className='btn btn-primary'>
								Return to Home
							</button>
							<button onClick={() => window.location.reload()} className='btn btn-secondary'>
								Reload Page
							</button>
						</div>
					</div>
				</div>
			)
		}

		return this.props.children
	}
}
