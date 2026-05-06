import { render, screen } from '@testing-library/react'

vi.mock('../components/HomeComponent', () => ({
	default: () => <div data-testid='home-component'>HomeComponent</div>,
}))

import Home from './Home'

describe('Home', () => {
	it('renders HomeComponent', () => {
		render(<Home />)
		expect(screen.getByTestId('home-component')).toBeInTheDocument()
	})
})
