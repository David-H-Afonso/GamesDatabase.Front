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
		expect(screen.getByText('Página no encontrada')).toBeInTheDocument()
	})

	it('renders a description message', () => {
		renderWithProviders(<NotFound />)
		expect(screen.getByText('La página que buscas no existe o ha sido movida.')).toBeInTheDocument()
	})

	it('renders a link to home', () => {
		renderWithProviders(<NotFound />)
		const link = screen.getByRole('link', { name: 'Ir al Inicio' })
		expect(link).toBeInTheDocument()
		expect(link).toHaveAttribute('href', '/')
	})
})
