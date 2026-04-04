import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouteError } from './RouteError'
import { MemoryRouter } from 'react-router-dom'

vi.mock('react-router-dom', async () => {
	const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
	return {
		...actual,
		useRouteError: vi.fn(),
	}
})

import { useRouteError } from 'react-router-dom'
const mockUseRouteError = vi.mocked(useRouteError)

const renderRouteError = () => {
	return render(
		<MemoryRouter>
			<RouteError />
		</MemoryRouter>
	)
}

describe('RouteError', () => {
	it('renders heading and "Go to Home" link', () => {
		mockUseRouteError.mockReturnValue(new Error('fail'))
		renderRouteError()
		expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument()
		expect(screen.getByRole('link', { name: 'Go to Home' })).toHaveAttribute('href', '/')
	})

	it('displays the error message from an Error instance', () => {
		mockUseRouteError.mockReturnValue(new Error('Something broke'))
		renderRouteError()
		expect(screen.getByText('Something broke')).toBeInTheDocument()
	})

	it('displays statusText from a route error response', () => {
		mockUseRouteError.mockReturnValue({
			status: 404,
			statusText: 'Not Found',
			data: {},
			internal: false,
		})
		renderRouteError()
		expect(screen.getByText('404')).toBeInTheDocument()
		expect(screen.getByText('Not Found')).toBeInTheDocument()
	})

	it('displays fallback message for unknown errors', () => {
		mockUseRouteError.mockReturnValue('some string error')
		renderRouteError()
		expect(screen.getByText('An unknown error occurred')).toBeInTheDocument()
	})

	it('renders a "Reload Page" button that reloads', async () => {
		const user = userEvent.setup()
		const reloadMock = vi.fn()
		Object.defineProperty(globalThis, 'location', {
			value: { ...globalThis.location, reload: reloadMock },
			writable: true,
			configurable: true,
		})

		mockUseRouteError.mockReturnValue(new Error('fail'))
		renderRouteError()

		await user.click(screen.getByText('Reload Page'))
		expect(reloadMock).toHaveBeenCalled()
	})
})
