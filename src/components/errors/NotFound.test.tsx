import { screen } from '@testing-library/react'
import { NotFound } from './NotFound'
import { renderWithProviders } from '@/test/utils/renderWithProviders'

describe('NotFound', () => {
	it('renders the 404 code', () => {
		renderWithProviders(<NotFound />)
		expect(screen.getByText('404')).toBeInTheDocument()
	})

	it('renders "Page Not Found" heading', () => {
		renderWithProviders(<NotFound />)
		expect(screen.getByText('Page Not Found')).toBeInTheDocument()
	})

	it('renders a description message', () => {
		renderWithProviders(<NotFound />)
		expect(screen.getByText('The page you are looking for does not exist or has been moved.')).toBeInTheDocument()
	})

	it('renders a link to home', () => {
		renderWithProviders(<NotFound />)
		const link = screen.getByRole('link', { name: 'Go to Home' })
		expect(link).toBeInTheDocument()
		expect(link).toHaveAttribute('href', '/')
	})
})
