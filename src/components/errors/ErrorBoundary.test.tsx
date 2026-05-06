import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from './ErrorBoundary'

const ThrowingChild = ({ message }: { readonly message: string }) => {
	throw new Error(message)
}

const GoodChild = () => <div>All good</div>

describe('ErrorBoundary', () => {
	let originalConsoleError: typeof console.error

	beforeEach(() => {
		originalConsoleError = console.error
		console.error = vi.fn()
	})

	afterEach(() => {
		console.error = originalConsoleError
	})

	it('renders children when no error occurs', () => {
		render(
			<ErrorBoundary>
				<GoodChild />
			</ErrorBoundary>
		)
		expect(screen.getByText('All good')).toBeInTheDocument()
	})

	it('renders error UI when a child throws', () => {
		render(
			<ErrorBoundary>
				<ThrowingChild message='Test crash' />
			</ErrorBoundary>
		)
		expect(screen.getByText('Something went wrong')).toBeInTheDocument()
		expect(screen.getByText('Test crash')).toBeInTheDocument()
	})

	it('renders fallback message when error has no message', () => {
		const ThrowEmpty = () => {
			throw new Error('')
		}
		render(
			<ErrorBoundary>
				<ThrowEmpty />
			</ErrorBoundary>
		)
		expect(screen.getByText('Something went wrong')).toBeInTheDocument()
	})

	it('shows "Return to Home" and "Reload Page" buttons', () => {
		render(
			<ErrorBoundary>
				<ThrowingChild message='crash' />
			</ErrorBoundary>
		)
		expect(screen.getByText('Return to Home')).toBeInTheDocument()
		expect(screen.getByText('Reload Page')).toBeInTheDocument()
	})

	it('navigates to / when "Return to Home" is clicked', async () => {
		const user = userEvent.setup()
		const originalHref = globalThis.location.href
		Object.defineProperty(globalThis, 'location', {
			value: { ...globalThis.location, href: originalHref },
			writable: true,
			configurable: true,
		})

		render(
			<ErrorBoundary>
				<ThrowingChild message='crash' />
			</ErrorBoundary>
		)

		await user.click(screen.getByText('Return to Home'))
		expect(globalThis.location.href).toBe('/')
	})

	it('reloads the page when "Reload Page" is clicked', async () => {
		const user = userEvent.setup()
		const reloadMock = vi.fn()
		Object.defineProperty(globalThis, 'location', {
			value: { ...globalThis.location, reload: reloadMock },
			writable: true,
			configurable: true,
		})

		render(
			<ErrorBoundary>
				<ThrowingChild message='crash' />
			</ErrorBoundary>
		)

		await user.click(screen.getByText('Reload Page'))
		expect(reloadMock).toHaveBeenCalled()
	})
})
