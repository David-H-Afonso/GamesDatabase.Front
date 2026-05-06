import { render, screen } from '@testing-library/react'
import { AppLayout } from './AppLayout'

vi.mock('./elements', () => ({
	Header: () => <header data-testid='header'>Header</header>,
}))

vi.mock('@/components/DataLoader', () => ({
	DataLoader: () => <div data-testid='data-loader' />,
}))

describe('AppLayout', () => {
	it('renders Header, DataLoader, and children', () => {
		render(
			<AppLayout>
				<span>page content</span>
			</AppLayout>
		)
		expect(screen.getByTestId('header')).toBeInTheDocument()
		expect(screen.getByTestId('data-loader')).toBeInTheDocument()
		expect(screen.getByText('page content')).toBeInTheDocument()
	})

	it('renders main content area', () => {
		const { container } = render(
			<AppLayout>
				<span>test</span>
			</AppLayout>
		)
		expect(container.querySelector('main.app-layout__content')).toBeInTheDocument()
	})
})
