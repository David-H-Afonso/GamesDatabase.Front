import { render, screen } from '@testing-library/react'
import { LayoutProvider } from './LayoutProvider'

vi.mock('@/layouts', () => ({
	AppLayout: ({ children }: any) => <div data-testid='app-layout'>{children}</div>,
	EmptyLayout: ({ children }: any) => <div data-testid='empty-layout'>{children}</div>,
}))

describe('LayoutProvider', () => {
	it('renders AppLayout with children (default layout)', () => {
		render(
			<LayoutProvider>
				<span>content</span>
			</LayoutProvider>
		)
		expect(screen.getByTestId('app-layout')).toBeInTheDocument()
		expect(screen.getByText('content')).toBeInTheDocument()
	})
})
